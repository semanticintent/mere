import type { StateDecl, FieldDecl, ComputedDecl, WorkbookDecl, RenderContext } from './types.js';
import type { Persist } from './persist.js';

type Subscriber = () => void;

// ─── Reactive store ───────────────────────────────────────────────────────────

export class Store {
  private values = new Map<string, unknown>();
  private subs = new Map<string, Set<Subscriber>>();
  private computed: ComputedDecl[] = [];
  private stateDecls = new Map<string, StateDecl>();
  private fieldSchemas = new Map<string, FieldDecl[]>();
  private persist: Persist | null = null;
  private saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  init(decl: WorkbookDecl): void {
    this.computed = decl.computed;

    for (const s of decl.state) {
      this.stateDecls.set(s.name, s);
      if (s.type === 'record-list' && s.fields?.length) {
        this.fieldSchemas.set(s.name, s.fields);
      }
      const initial = s.default !== undefined ? s.default : defaultFor(s.type);
      this.values.set(s.name, initial);
    }

    // Initialise computed names so subscribers can be registered
    for (const c of decl.computed) {
      this.values.set(c.name, this.evalComputed(c));
    }
  }

  // Called after persist.init() resolves — loads saved values and overrides defaults
  async loadPersisted(persist: Persist): Promise<void> {
    this.persist = persist;
    for (const [name, decl] of this.stateDecls) {
      if (!decl.persist) continue;
      const saved = await persist.load(name);
      if (saved !== undefined) {
        this.values.set(name, saved);
        this.notify(name);
        this.recomputeDepending(name);
      }
    }
  }

  has(name: string): boolean {
    return this.values.has(name.split('.')[0] ?? name);
  }

  get(name: string, context?: RenderContext): unknown {
    // Dotted path: item.field or state.field
    if (name.includes('.')) {
      const parts = name.split('.');
      const head = parts[0] ?? '';
      const path = parts.slice(1).join('.');
      if (head === 'item' && context?.item) {
        return getPath(context.item as Record<string, unknown>, path);
      }
      const base = this.values.get(head);
      if (base && typeof base === 'object') {
        return getPath(base as Record<string, unknown>, path);
      }
      return '';
    }
    // Check render context (nav params) before global state
    if (context && name in context && name !== 'item') return context[name];
    return this.values.get(name) ?? '';
  }

  set(name: string, value: unknown): void {
    // Dotted path set: state.field
    if (name.includes('.')) {
      const parts = name.split('.');
      const head = parts[0] ?? '';
      const rest = parts.slice(1).join('.');
      const base = this.values.get(head);
      if (base && typeof base === 'object') {
        const clone = { ...(base as Record<string, unknown>) };
        setPath(clone, rest, value);
        this.values.set(head, clone);
        this.notify(head);
        this.recomputeDepending(head);
      }
      return;
    }
    this.values.set(name, value);
    this.notify(name);
    this.recomputeDepending(name);
    this.scheduleSave(name);
  }

  private scheduleSave(name: string): void {
    if (!this.persist) return;
    const decl = this.stateDecls.get(name);
    if (!decl?.persist) return;
    // Debounce: wait 500ms after last change before writing to disk
    const existing = this.saveTimers.get(name);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.persist!.save(name, this.values.get(name));
      this.saveTimers.delete(name);
    }, 500);
    this.saveTimers.set(name, timer);
  }

  subscribe(name: string, fn: Subscriber): void {
    const root = name.split('.')[0] ?? name;
    if (!this.subs.has(root)) this.subs.set(root, new Set());
    this.subs.get(root)!.add(fn);
    fn(); // initialize binding with current value immediately
  }

  unsubscribe(name: string, fn: Subscriber): void {
    const root = name.split('.')[0] ?? name;
    this.subs.get(root)?.delete(fn);
  }

  // ── Filter a list state value by a where clause ────────────────────────────
  filter(from: string, where?: string): unknown[] {
    const list = this.values.get(from);
    if (!Array.isArray(list)) return [];
    if (!where) return list;
    return list.filter(item => evalWhere(where, item as Record<string, unknown>, this));
  }

  // ── Invoke an action ───────────────────────────────────────────────────────
  invokeAction(
    name: string,
    args: string[],
    argValues: unknown[],
    onGoTo: (screen: string, params?: Record<string, unknown>) => void,
    context?: RenderContext,
  ): void {
    // Actions are resolved at call time from the workbook decl
    // stored on the store after init
    const action = this.actions?.get(name);
    if (!action) {
      console.warn(`[mere] Unknown action: ${name}`);
      return;
    }

    // Build local scope: param names → arg values
    const scope: Record<string, unknown> = {};
    action.takes.forEach((param, i) => {
      scope[param] = argValues[i] ?? this.resolveArg(args[i] ?? '', context);
    });

    for (const stmt of action.statements) {
      if (stmt.kind === 'set') {
        const value = scope[stmt.value] ?? this.resolveArg(stmt.value, context);
        if (stmt.where && stmt.target.includes('.')) {
          // set messages.folder to "archive" where id = id — update field on matching items
          this.setWhere(stmt.target, stmt.value, stmt.where, scope, context);
        } else if (stmt.where) {
          // set selected-message to messages where id = id — find matching item
          const src = this.values.get(stmt.value);
          if (Array.isArray(src)) {
            const match = (src as Record<string, unknown>[]).find(item =>
              evalWhere(stmt.where!, item, this, scope)
            );
            this.set(stmt.target, match ?? {});
          }
        } else if (stmt.target.includes('=')) {
          // not expected in v0.1
        } else {
          if (stmt.value.startsWith('"')) {
            this.set(stmt.target, stmt.value.slice(1, -1));
          } else {
            const src = this.values.get(stmt.value);
            this.set(stmt.target, src ?? scope[stmt.value] ?? value);
          }
        }
      } else if (stmt.kind === 'go-to') {
        if (stmt.params?.length) {
          const resolved: Record<string, unknown> = {};
          for (const { key, value } of stmt.params) {
            resolved[key] = this.resolveArg(value, context);
          }
          onGoTo(stmt.screen, resolved);
        } else {
          onGoTo(stmt.screen);
        }

      } else if (stmt.kind === 'clear') {
        const decl = this.stateDecls.get(stmt.target);
        const resetVal = decl?.default !== undefined
          ? decl.default
          : defaultFor(decl?.type ?? 'text');
        this.set(stmt.target, resetVal);

      } else if (stmt.kind === 'add-to') {
        const list = this.values.get(stmt.list);
        if (Array.isArray(list)) {
          const item: Record<string, unknown> = {};
          for (const { key, value } of stmt.fields) {
            if (value.startsWith('"') && value.endsWith('"')) {
              item[key] = value.slice(1, -1);
            } else {
              item[key] = scope[value] ?? this.resolveArg(value, context);
            }
          }
          // Apply schema defaults for fields not explicitly provided
          const schema = this.fieldSchemas.get(stmt.list);
          if (schema) {
            for (const fieldDecl of schema) {
              if (!(fieldDecl.name in item) && fieldDecl.default !== undefined) {
                item[fieldDecl.name] = coerceField(fieldDecl.default, fieldDecl.type);
              }
            }
          }
          if (!item['id']) item['id'] = String(Date.now() + Math.random());
          if (!item['received-at']) item['received-at'] = new Date().toISOString();
          this.set(stmt.list, [...list, item]);
        }

      } else if (stmt.kind === 'remove-from') {
        const list = this.values.get(stmt.list);
        if (Array.isArray(list)) {
          const updated = (list as Record<string, unknown>[]).filter(
            item => !evalWhere(stmt.where, item, this, scope)
          );
          this.set(stmt.list, updated);
        }
      }
    }
  }

  // Called once after parsing actions
  actions?: Map<string, import('./types.js').ActionDecl>;

  private resolveArg(arg: string, context?: RenderContext): unknown {
    if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
    const name = arg.startsWith('@') ? arg.slice(1) : arg;
    return this.get(name, context);
  }

  private setWhere(
    target: string,
    field: string,
    where: string,
    scope: Record<string, unknown>,
    context?: RenderContext,
  ): void {
    // "set messages.field to value where condition"
    const [listName, fieldName] = target.split('.');
    if (!listName || !fieldName) return;
    const list = this.values.get(listName);
    if (!Array.isArray(list)) return;
    const value = scope[field] ?? (field.startsWith('"') ? field.slice(1, -1) : this.get(field, context));
    const updated = (list as Record<string, unknown>[]).map(item =>
      evalWhere(where, item, this, scope) ? { ...item, [fieldName]: value } : item
    );
    this.set(listName, updated);
  }

  private notify(name: string): void {
    this.subs.get(name)?.forEach(fn => fn());
  }

  private recomputeDepending(name: string): void {
    for (const c of this.computed) {
      // from can be comma-separated for scalar ops like subtract/percent
      const sources = c.from.split(',').map(s => s.trim());
      if (sources.includes(name) || whereReferencesState(c.where, name)) {
        const newVal = this.evalComputed(c);
        this.values.set(c.name, newVal);
        this.notify(c.name);
        // cascade: another computed might depend on this computed
        this.recomputeDepending(c.name);
      }
    }
  }

  private evalComputed(c: ComputedDecl): unknown {
    const source = this.values.get(c.from);

    // scalar ops: operate on two numeric state/computed values (comma-separated from)
    if (c.op === 'subtract') {
      const [a, b] = c.from.split(',').map(n => toNumber(this.values.get(n.trim())));
      return (a ?? 0) - (b ?? 0);
    }
    if (c.op === 'add') {
      const [a, b] = c.from.split(',').map(n => toNumber(this.values.get(n.trim())));
      return (a ?? 0) + (b ?? 0);
    }
    if (c.op === 'percent') {
      const [a, b] = c.from.split(',').map(n => toNumber(this.values.get(n.trim())));
      if (!b) return 0;
      return Math.round(((a ?? 0) / b) * 100);
    }
    if (c.op === 'percent-of') {
      // a × (b / 100) — e.g. subtotal × tax-rate/100 = tax amount
      const [a, b] = c.from.split(',').map(n => toNumber(this.values.get(n.trim())));
      return (a ?? 0) * (b ?? 0) / 100;
    }
    if (c.op === 'sum-product') {
      // Σ(field × by) across list — e.g. Σ(price × qty) = subtotal
      if (!c.field || !c.by || !Array.isArray(source)) return 0;
      const filtered = c.where
        ? (source as Record<string, unknown>[]).filter(item => evalWhere(c.where!, item, this))
        : source as Record<string, unknown>[];
      return filtered.reduce((acc, item) =>
        acc + toNumber(item[c.field!]) * toNumber(item[c.by!]), 0
      );
    }

    if (!Array.isArray(source)) return c.op === 'count' ? 0 : 0;
    const filtered = c.where
      ? source.filter(item => evalWhere(c.where!, item as Record<string, unknown>, this))
      : source;

    if (c.op === 'count') return filtered.length;

    if (c.op === 'sum') {
      if (!c.field) return 0;
      return filtered.reduce((acc, item) => acc + toNumber((item as Record<string, unknown>)[c.field!]), 0);
    }

    if (c.op === 'avg') {
      if (!c.field || filtered.length === 0) return 0;
      const total = filtered.reduce((acc, item) => acc + toNumber((item as Record<string, unknown>)[c.field!]), 0);
      return Math.round(total / filtered.length);
    }

    return filtered;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v.replace(/[^0-9.\-]/g, '')) || 0;
  return 0;
}

function defaultFor(type: string): unknown {
  switch (type) {
    case 'text': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'list':
    case 'record-list': return [];
    case 'map': return {};
    default: return null;
  }
}

function coerceField(value: unknown, type: 'text' | 'number' | 'boolean'): unknown {
  if (type === 'number') return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  if (type === 'boolean') return value === true || value === 'true';
  return String(value ?? '');
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur ?? '';
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (last) cur[last] = value;
}

// Check if a where clause references a specific state name on the rhs.
// "folder = current-tab" references 'current-tab', so changing that state
// must trigger a recompute even though the computed's `from` is different.
function whereReferencesState(where: string | undefined, name: string): boolean {
  if (!where) return false;
  const match = where.match(/^(\S+)\s*=\s*(.+)$/);
  if (!match) return false;
  const rhs = match[2]!.trim();
  return rhs === name && !rhs.startsWith('"') && !rhs.startsWith("'");
}

// Very simple where clause evaluator: "field = value" or "field = identifier"
function evalWhere(
  where: string,
  item: Record<string, unknown>,
  store: Store,
  scope?: Record<string, unknown>,
): boolean {
  // Supports: field = "literal"  or  field = identifier
  const match = where.match(/^(\S+)\s*=\s*(.+)$/);
  if (!match) return true;
  const [, lhs, rhs] = match;
  if (!lhs || !rhs) return true;

  const left = getPath(item, lhs);
  let right: unknown;
  const trimmed = rhs.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    right = trimmed.slice(1, -1);
  } else if (trimmed === 'true') {
    right = true;
  } else if (trimmed === 'false') {
    right = false;
  } else if (scope?.[trimmed] !== undefined) {
    right = scope[trimmed];
  } else if (store.has(trimmed)) {
    right = store.get(trimmed);
  } else {
    // Unknown key — treat as a literal string value, not a missing state
    right = trimmed;
  }

  // "all" is a magic passthrough — show everything, no filter applied.
  // This enables the common pattern: <tab "all">All</tab> as the first tab.
  if (right === 'all' || right === '') return true;

  return left === right;
}
