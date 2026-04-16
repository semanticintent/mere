import type {
  WorkbookDecl, StateDecl, StateType, ComputedDecl, ActionDecl,
  ActionStatement, ScreenDecl, ASTNode, Binding,
} from './types.js';

// ─── Public entry ─────────────────────────────────────────────────────────────

export function parseWorkbook(el: Element): WorkbookDecl {
  const theme = el.getAttribute('theme') ?? 'classic-light';
  const state = parseState(el.querySelector(':scope > state'));
  const computed = parseComputed(el.querySelector(':scope > computed'));
  const actions = parseActions(el.querySelector(':scope > actions'));
  const screens = parseScreens(el.querySelectorAll(':scope > screen'));

  return { theme, state, computed, actions, screens };
}

// ─── State ────────────────────────────────────────────────────────────────────

function parseState(stateEl: Element | null): StateDecl[] {
  if (!stateEl) return [];
  return Array.from(stateEl.querySelectorAll(':scope > value')).map(v => ({
    name: req(v, 'name'),
    type: (v.getAttribute('type') ?? 'text') as StateType,
    default: parseDefault(v.getAttribute('default'), v.getAttribute('type') ?? 'text'),
    persist: v.hasAttribute('persist'),
  }));
}

function parseDefault(raw: string | null, type: string): unknown {
  if (raw === null) return undefined;
  if (type === 'number') return Number(raw);
  if (type === 'boolean') return raw === 'true';
  return raw;
}

// ─── Computed ─────────────────────────────────────────────────────────────────

function parseComputed(computedEl: Element | null): ComputedDecl[] {
  if (!computedEl) return [];
  return Array.from(computedEl.querySelectorAll(':scope > value')).map(v => ({
    name: req(v, 'name'),
    from: req(v, 'from'),
    where: v.getAttribute('where') ?? undefined,
    op: (v.getAttribute('op') ?? undefined) as ComputedDecl['op'],
  }));
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function parseActions(actionsEl: Element | null): ActionDecl[] {
  if (!actionsEl) return [];
  return Array.from(actionsEl.querySelectorAll(':scope > action')).map(a => {
    const takesAttr = a.getAttribute('takes') ?? '';
    const takes = takesAttr.trim() ? takesAttr.trim().split(/\s+/) : [];
    const text = a.textContent ?? '';
    const statements = parseActionBody(text.trim());
    return { name: req(a, 'name'), takes, statements };
  });
}

function parseActionBody(body: string): ActionStatement[] {
  const stmts: ActionStatement[] = [];
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // go-to <screen>
    const goTo = line.match(/^go-to\s+(\S+)$/);
    if (goTo) {
      stmts.push({ kind: 'go-to', screen: goTo[1]! });
      continue;
    }

    // set <target> to <value> [where <condition>]
    const setMatch = line.match(/^set\s+(\S+)\s+to\s+(.+?)(?:\s+where\s+(.+))?$/);
    if (setMatch) {
      stmts.push({
        kind: 'set',
        target: setMatch[1]!,
        value: setMatch[2]!.trim(),
        where: setMatch[3]?.trim(),
      });
      continue;
    }
  }
  return stmts;
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function parseScreens(screenEls: NodeListOf<Element>): ScreenDecl[] {
  return Array.from(screenEls).map(s => {
    const name = s.getAttribute('name') ?? s.getAttribute('id') ?? '';
    const intent = extractIntent(s);
    const root = parseNode(s);
    root.tag = 'screen-root'; // rename so renderer knows this is the screen wrapper
    return { name, intent, root };
  });
}

// ─── AST node ─────────────────────────────────────────────────────────────────

function parseNode(el: Element): ASTNode {
  const tag = el.tagName.toLowerCase();
  const bindings = parseBindings(el);
  const attrs = parsePassthroughAttrs(el);

  // Text content — only for leaf nodes or nodes with only text children
  const directText = Array.from(el.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent ?? '')
    .join('')
    .trim();

  const children = Array.from(el.children).map(child => parseNode(child));

  return { tag, bindings, attrs, children, text: directText };
}

// ─── Bindings ─────────────────────────────────────────────────────────────────

const PASSTHROUGH_ATTRS = new Set([
  'placeholder', 'type', 'required', 'min', 'max', 'pattern', 'autocomplete',
  'name', 'id', 'class', 'style',
]);

function parseBindings(el: Element): Binding {
  const binding: Binding = {};
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name;
    const value = attr.value;

    if (name.startsWith('@')) {
      binding.read = name.slice(1) || value;
    } else if (name.startsWith('~')) {
      binding.twoWay = name.slice(1) || value;
    } else if (name.startsWith('!')) {
      const actionStr = name.slice(1) + (value ? ' ' + value : '');
      // "action-name with a b c"  or just "action-name"
      const m = actionStr.match(/^(\S+)(?:\s+with\s+(.+))?$/);
      if (m) {
        const args = m[2] ? m[2].trim().replace(/,/g, ' ').split(/\s+/) : [];
        binding.action = { name: m[1]!, args };
      }
    } else if (name.startsWith('?')) {
      binding.intent = value || name.slice(1);
    } else if (!PASSTHROUGH_ATTRS.has(name)) {
      // Could be a positional bare string attribute like tab "inbox" → name="inbox"
      if (!name.includes('-') || name === 'nav-item') {
        // ignore unknown structural attrs
      }
    }
  }

  // First attribute that looks like a bare positional name/literal
  const firstAttr = el.attributes[0];
  if (firstAttr && !firstAttr.name.startsWith('@') && !firstAttr.name.startsWith('~') &&
      !firstAttr.name.startsWith('!') && !firstAttr.name.startsWith('?') &&
      firstAttr.name !== 'name' && firstAttr.name !== 'theme' &&
      !PASSTHROUGH_ATTRS.has(firstAttr.name)) {
    // e.g. <tab "inbox"> or <nav-item "inbox" inbox>
    if (firstAttr.value) {
      binding.literal = firstAttr.value;
    } else {
      binding.positional = firstAttr.name;
    }
  }

  return binding;
}

function parsePassthroughAttrs(el: Element): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (PASSTHROUGH_ATTRS.has(attr.name)) {
      result[attr.name] = attr.value;
    }
  }
  return result;
}

function extractIntent(el: Element): string | undefined {
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith('?')) return attr.value || attr.name.slice(1);
  }
  return undefined;
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function req(el: Element, attr: string): string {
  const v = el.getAttribute(attr);
  if (!v) throw new Error(`[mere] <${el.tagName.toLowerCase()}> missing required attribute "${attr}"`);
  return v;
}
