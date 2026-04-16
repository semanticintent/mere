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
    default: parseDefault(v.getAttribute('value') ?? v.getAttribute('default'), v.getAttribute('type') ?? 'text'),
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

    // clear <state>
    const clearMatch = line.match(/^clear\s+(\S+)$/);
    if (clearMatch) {
      stmts.push({ kind: 'clear', target: clearMatch[1]! });
      continue;
    }

    // add-to <list> key value key value ...
    // e.g. add-to messages sender "Me" body reply-draft folder "sent"
    const addToMatch = line.match(/^add-to\s+(\S+)\s+(.+)$/);
    if (addToMatch) {
      const fields = parseKeyValuePairs(addToMatch[2]!.trim());
      stmts.push({ kind: 'add-to', list: addToMatch[1]!, fields });
      continue;
    }
  }
  return stmts;
}

// Parse "key1 value1 key2 value2 ..." into [{key, value}] pairs.
// Values can be quoted strings ("hello") or bare identifiers (reply-draft).
function parseKeyValuePairs(str: string): Array<{ key: string; value: string }> {
  const pairs: Array<{ key: string; value: string }> = [];
  // Tokenise: quoted strings stay together, bare words split on space
  const tokens: string[] = [];
  const tokenRe = /"[^"]*"|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(str)) !== null) tokens.push(m[0]!);
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    pairs.push({ key: tokens[i]!, value: tokens[i + 1]! });
  }
  return pairs;
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
  const attrs = Array.from(el.attributes);
  let i = 0;

  while (i < attrs.length) {
    const attr = attrs[i]!;
    const name = attr.name;
    const value = attr.value;

    if (name.startsWith('@')) {
      binding.read = name.slice(1) || value;

    } else if (name.startsWith('~')) {
      binding.twoWay = name.slice(1) || value;

    } else if (name.startsWith('!')) {
      // !open-message with item.id
      // In HTML this becomes three attributes: ["!open-message", "with", "item.id"]
      // Collect everything after "with" as positional args.
      const actionName = name.slice(1);
      const args: string[] = [];

      if (value) {
        // !action="with a b" or !action="a b" — args embedded in attr value
        const m = value.match(/^(?:with\s+)?(.+)$/);
        if (m) args.push(...m[1]!.replace(/,/g, ' ').split(/\s+/).filter(Boolean));
      } else {
        // Look ahead for bare "with" attribute, then collect following attr names as args
        let j = i + 1;
        if (j < attrs.length && attrs[j]!.name === 'with') {
          j++;
          while (j < attrs.length) {
            const next = attrs[j]!;
            if (next.name.startsWith('@') || next.name.startsWith('~') ||
                next.name.startsWith('!') || next.name.startsWith('?') ||
                PASSTHROUGH_ATTRS.has(next.name)) break;
            args.push(next.name);
            j++;
          }
          i = j - 1; // advance past all consumed arg attrs
        }
      }
      binding.action = { name: actionName, args };

    } else if (name.startsWith('?')) {
      binding.intent = value || name.slice(1);
    }

    i++;
  }

  // First non-sigil, non-passthrough attribute is a positional identifier.
  // <tab "inbox">  → HTML parses as <tab inbox=""> → positional = "inbox"
  // <navigation-bar "bottom"> → positional = "bottom"
  const firstAttr = attrs[0];
  if (firstAttr &&
      !firstAttr.name.startsWith('@') && !firstAttr.name.startsWith('~') &&
      !firstAttr.name.startsWith('!') && !firstAttr.name.startsWith('?') &&
      firstAttr.name !== 'name' && firstAttr.name !== 'theme' &&
      !PASSTHROUGH_ATTRS.has(firstAttr.name)) {
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
