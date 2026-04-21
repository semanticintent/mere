// ─── State ────────────────────────────────────────────────────────────────────

export type StateType = 'text' | 'number' | 'boolean' | 'list' | 'map' | 'record-list';

export interface FieldDecl {
  name: string;
  type: 'text' | 'number' | 'boolean';
  default?: unknown;
}

export interface StateDecl {
  name: string;
  type: StateType;
  default?: unknown;
  persist: boolean;
  fields?: FieldDecl[];  // only for record-list
}

export interface ComputedDecl {
  name: string;
  from: string;          // source state name, computed name, or "a,b" for scalar ops
  where?: string;        // filter expression, e.g. "folder = current-tab"
  op?: 'count' | 'sum' | 'avg' | 'subtract' | 'percent' | 'add' | 'percent-of' | 'sum-product'
     | 'group-by' | 'streak' | 'min' | 'max';
  field?: string;        // numeric field to aggregate (sum/avg/sum-product/min/max/streak)
  by?: string;           // group-by: grouping field; sum-product: second factor; streak: date field
  window?: number;       // rolling window — last N items (avg, min, max)
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ActionStatement =
  | { kind: 'set'; target: string; value: string; where?: string }
  | { kind: 'go-to'; screen: string; params?: Array<{ key: string; value: string }> }
  | { kind: 'clear'; target: string }
  | { kind: 'add-to'; list: string; fields: Array<{ key: string; value: string }> }
  | { kind: 'remove-from'; list: string; where: string };

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
  takes?: string[];  // parameter names passed via go-to
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
