// ─── State ────────────────────────────────────────────────────────────────────

export type StateType = 'text' | 'number' | 'boolean' | 'list' | 'map';

export interface StateDecl {
  name: string;
  type: StateType;
  default?: unknown;
  persist: boolean;
}

export interface ComputedDecl {
  name: string;
  from: string;         // source state name
  where?: string;       // filter expression, e.g. "folder = current-tab"
  op?: 'count' | 'sum'; // aggregation
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ActionStatement =
  | { kind: 'set'; target: string; value: string; where?: string }
  | { kind: 'go-to'; screen: string }
  | { kind: 'clear'; target: string }
  | { kind: 'add-to'; list: string; fields: Array<{ key: string; value: string }> };

export interface ActionDecl {
  name: string;
  takes: string[];         // positional parameter names
  statements: ActionStatement[];
}

// ─── AST ──────────────────────────────────────────────────────────────────────

export interface Binding {
  read?: string;                              // @state-name or @item.field
  twoWay?: string;                            // ~state-name
  action?: { name: string; args: string[] };  // !action-name with a b c
  intent?: string;                            // ?"..."
  positional?: string;                        // bare unquoted identifier (e.g. tab name)
  literal?: string;                           // bare quoted string
}

export interface ASTNode {
  tag: string;
  bindings: Binding;
  attrs: Record<string, string>;  // passthrough HTML attrs (placeholder, type, etc.)
  children: ASTNode[];
  text: string;
}

// ─── Workbook ─────────────────────────────────────────────────────────────────

export interface ScreenDecl {
  name: string;
  intent?: string;
  root: ASTNode;
}

export interface WorkbookDecl {
  theme: string;
  layout: string;
  state: StateDecl[];
  computed: ComputedDecl[];
  actions: ActionDecl[];
  screens: ScreenDecl[];
  sidebar?: ASTNode;
}

// ─── Runtime context ──────────────────────────────────────────────────────────

export interface RenderContext {
  item?: Record<string, unknown>;  // current loop item
  [key: string]: unknown;
}
