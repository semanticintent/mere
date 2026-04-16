import type { StateDecl, ComputedDecl, WorkbookDecl, RenderContext } from './types.js';
import type { Persist } from './persist.js';

type Subscriber = () => void;

// ─── Reactive store ───────────────────────────────────────────────────────────

export class Store {
  private values = new Map<string, unknown>();
  private subs = new Map<string, Set<Subscriber>>();
  private computed: ComputedDecl[] = [];
  private stateDecls = new Map<string, StateDecl>();
  private persist: Persist | null = null;
  private saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  init(decl: WorkbookDecl): void {
    this.computed = decl.computed;

    for (const s of decl.state) {
      this.stateDecls.set(s.name, s);
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
    onGoTo: (screen: string) => void,
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
        if (stmt.where) {
          // set messages.folder to "archive" where id = id
          this.setWhere(stmt.target, stmt.value, stmt.where, scope, context);
        } else if (stmt.target.includes('=')) {
          // not expected in v0.1
        } else {
          // set selected-message to messages where id = id
          if (stmt.value.startsWith('"')) {
            this.set(stmt.target, stmt.value.slice(1, -1));
          } else {
            // "set X to Y where ..." — find matching item
            const src = this.values.get(stmt.value);
            if (Array.isArray(src) && stmt.where) {
              const match = (src as Record<string, unknown>[]).find(item =>
                evalWhere(stmt.where!, item, this, scope)
              );
              this.set(stmt.target, match ?? {});
            } else {
              this.set(stmt.target, src ?? scope[stmt.value] ?? value);
            }
          }
        }
      } else if (stmt.kind === 'go-to') {
        onGoTo(stmt.screen);

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
          if (!item['id']) item['id'] = String(Date.now() + Math.random());
          this.set(stmt.list, [...list, item]);
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
      if (c.from === name) {
        const newVal = this.evalComputed(c);
        this.values.set(c.name, newVal);
        this.notify(c.name);
      }
    }
  }

  private evalComputed(c: ComputedDecl): unknown {
    const list = this.values.get(c.from);
    if (!Array.isArray(list)) return c.op === 'count' ? 0 : [];
    const filtered = c.where
      ? list.filter(item => evalWhere(c.where!, item as Record<string, unknown>, this))
      : list;
    if (c.op === 'count') return filtered.length;
    return filtered;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultFor(type: string): unknown {
  switch (type) {
    case 'text': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'list': return [];
    case 'map': return {};
    default: return null;
  }
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
  } else {
    right = scope?.[trimmed] ?? store.get(trimmed);
  }

  // "all" is a magic passthrough — show everything, no filter applied.
  // This enables the common pattern: <tab "all">All</tab> as the first tab.
  if (right === 'all' || right === '') return true;

  return left === right;
}
