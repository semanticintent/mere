// ─── Mere element registry ────────────────────────────────────────────────────
//
// Single source of truth for the v0.1 vocabulary.
// Used by: CLI (mere schema, mere check) and runtime element registration.

export interface ElementMeta {
  tag: string;
  description: string;
  sigils: Array<'@' | '~' | '!' | '?'>;  // which sigils this element accepts
  attrs: string[];                          // allowed passthrough HTML attributes
  container: boolean;                       // true = has children, false = leaf
  listItem?: boolean;                       // can appear as the template inside a list element
}

export const REGISTRY: ElementMeta[] = [
  // ── Structural ─────────────────────────────────────────────────────────────
  {
    tag: 'screen',
    description: 'A full screen. Entry point for navigation.',
    sigils: ['?'],
    attrs: ['name'],
    container: true,
  },
  {
    tag: 'header',
    description: 'Top zone of a screen or card.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'footer',
    description: 'Bottom zone of a screen.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'form',
    description: 'Structural grouping for inputs. No implicit submit.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'toolbar',
    description: 'Flex row wrapper for a search-bar plus inline actions, with padding and gap.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },

  // ── Text ───────────────────────────────────────────────────────────────────
  {
    tag: 'heading',
    description: 'Primary text — title or name.',
    sigils: ['@', '?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'subtitle',
    description: 'Secondary text — description or metadata.',
    sigils: ['@', '?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'paragraph',
    description: 'Body text. Supports multiline content.',
    sigils: ['@', '?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'timestamp',
    description: 'Date/time display. Formatted relative to now.',
    sigils: ['@', '?'],
    attrs: [],
    container: false,
  },

  // ── Visual ─────────────────────────────────────────────────────────────────
  {
    tag: 'badge',
    description: 'Numeric or short text indicator. Hidden when value is 0 or empty.',
    sigils: ['@', '?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'avatar',
    description: 'Circular image or initials. Renders image if value is a URL.',
    sigils: ['@', '?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'icon',
    description: 'Named icon glyph.',
    sigils: ['?'],
    attrs: [],
    container: false,
  },

  // ── Navigation ─────────────────────────────────────────────────────────────
  {
    tag: 'tab-bar',
    description: 'Horizontal tab switcher. Binds to a text state value via ~.',
    sigils: ['~', '?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'tab',
    description: 'A single tab inside a tab-bar. First positional attr is its value.',
    sigils: ['?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'navigation-bar',
    description: 'Bottom or top navigation bar. First positional attr is position.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'nav-item',
    description: 'Navigation action. First positional attr is the target screen name.',
    sigils: ['!', '?'],
    attrs: [],
    container: false,
  },

  // ── Collections ────────────────────────────────────────────────────────────
  {
    tag: 'message-list',
    description: 'Renders a list of messages from a list state value via @.',
    sigils: ['@', '?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'card-list',
    description: 'Renders a list of cards from a list state value via @.',
    sigils: ['@', '?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'list',
    description: 'Generic list. Renders items from a list state value via @.',
    sigils: ['@', '?'],
    attrs: [],
    container: true,
  },

  // ── Content containers ─────────────────────────────────────────────────────
  {
    tag: 'message-card',
    description: 'Tappable message row. Use inside message-list.',
    sigils: ['!', '?'],
    attrs: [],
    container: true,
    listItem: true,
  },
  {
    tag: 'card',
    description: 'Content container with border and padding.',
    sigils: ['!', '?'],
    attrs: [],
    container: true,
    listItem: true,
  },

  // ── Inputs ─────────────────────────────────────────────────────────────────
  {
    tag: 'field',
    description: 'Text input. Binds two-way to state via ~.',
    sigils: ['~', '?'],
    attrs: ['placeholder', 'type', 'required', 'min', 'max', 'pattern', 'autocomplete', 'name'],
    container: false,
  },
  {
    tag: 'button',
    description: 'Action trigger. Invokes an action via !.',
    sigils: ['!', '?'],
    attrs: ['type'],
    container: false,
  },
  {
    tag: 'toggle',
    description: 'Boolean switch. Binds two-way to a boolean state via ~.',
    sigils: ['~', '?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'camera',
    description: 'Photo capture. Opens the device camera via the OS picker (no live preview stream). Binds two-way to a map state value via ~ — writes { dataUrl, capturedAt }. facing=user|environment hints front vs back camera.',
    sigils: ['~', '?'],
    attrs: ['facing', 'name'],
    container: false,
  },

  // ── Data display ──────────────────────────────────────────────────────────
  {
    tag: 'kv',
    description: 'Key/value row. label= sets the label, @ binds the value. format=currency|percent for numeric formatting.',
    sigils: ['@', '?'],
    attrs: ['label', 'format'],
    container: false,
  },

  // ── Data visualisation ────────────────────────────────────────────────────
  {
    tag: 'chart',
    description: 'Inline SVG chart. type=bar|line|pie. from= binds to a list state, field= is the numeric value, label= is the category label.',
    sigils: ['@', '?'],
    attrs: ['type', 'from', 'field', 'label', 'where'],
    container: false,
  },

  // ── Surfaces ───────────────────────────────────────────────────────────────
  {
    tag: 'modal',
    description: 'Full-screen overlay dialog.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'toast',
    description: 'Transient notification. Text content only.',
    sigils: ['?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'banner',
    description: 'Persistent inline notification strip.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },

  // ── Full / dashboard layout ─────────────────────────────────────────────────
  {
    tag: 'sidebar',
    description: 'Left navigation rail for layout="full". Container for sidebar-brand and sidebar-section.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'sidebar-brand',
    description: 'Sidebar header/logo text.',
    sigils: ['?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'sidebar-section',
    description: 'Grouped sidebar nav items under an optional label=.',
    sigils: ['?'],
    attrs: ['label'],
    container: true,
  },
  {
    tag: 'data-table',
    description: 'Table from a list state via @. column children define fields; as=status-badge|name-url|contact|currency|product sets a special cell renderer. Optional ! binds a row-click action.',
    sigils: ['@', '!', '?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'column',
    description: 'Column definition inside data-table or spreadsheet. Declarative only — not rendered directly.',
    sigils: ['?'],
    attrs: ['field', 'label', 'as', 'by', 'editable'],
    container: false,
  },
  {
    tag: 'search-bar',
    description: 'Text filter input with a search icon. Binds two-way via ~.',
    sigils: ['~', '?'],
    attrs: [],
    container: false,
  },
  {
    tag: 'spreadsheet',
    description: 'Editable grid from a list state via @. column children define fields; editable on a column allows inline edits.',
    sigils: ['@', '?'],
    attrs: [],
    container: true,
  },

  // ── Metrics ────────────────────────────────────────────────────────────────
  {
    tag: 'metric',
    description: 'Single KPI value with label. format=currency|percent for numeric formatting.',
    sigils: ['@', '?'],
    attrs: ['format'],
    container: false,
  },
  {
    tag: 'metric-group',
    description: 'Layout container for multiple metric cards.',
    sigils: ['?'],
    attrs: [],
    container: true,
  },
  {
    tag: 'bar',
    description: 'Horizontal progress/comparison bar. label= sets the caption, @ binds a 0-100 value.',
    sigils: ['@', '?'],
    attrs: ['label'],
    container: false,
  },
];

export const REGISTRY_MAP = new Map(REGISTRY.map(e => [e.tag, e]));

// Only themes with a stylesheet in src/themes/ and an entry in the runtime's
// THEMES map belong here. corporate-light, ecommerce-hero and notion-paper were
// listed until v0.6.0 with neither: `mere check` accepted them and the runtime
// then fell back to classic-light with a console warning, so a generator could
// emit a workbook that silently rendered as something else.
export const KNOWN_THEMES = [
  'classic-light',
  'proton-mail',
  'brutalist',
  'warm-brutalist',
] as const;

// ─── Language registry ────────────────────────────────────────────────────────
//
// Everything below describes the language itself — state types, action
// statements, computed operators, and diagnostics. It exists so the published
// spec can be GENERATED from the implementation rather than hand-maintained
// alongside it.
//
// Before this existed, docs/spec.md and mere-site/src/spec.html had drifted
// into a stale subset of the real language: 4 of 6 state types, 4 of 7
// statements, and 0 of 12 computed operators. Since the spec is documentation
// for the *generator* (an AI producing workbooks), that drift silently
// degraded generation quality — it was a product defect, not a docs chore.
//
// Rule: add a feature here in the same commit that implements it, and
// `npm run generate-spec` propagates it to every published surface.

export interface StateTypeMeta {
  type: string;
  description: string;
  emptyValue: string;   // what an omitted value= yields (defaultFor(), state.ts)
}

export const STATE_TYPES: StateTypeMeta[] = [
  {
    type: 'text',
    description: 'A string value.',
    emptyValue: '""',
  },
  {
    type: 'number',
    description: 'A numeric value. value= is parsed with Number().',
    emptyValue: '0',
  },
  {
    type: 'boolean',
    description: 'A true/false value. value= is true only for the exact string "true".',
    emptyValue: 'false',
  },
  {
    type: 'list',
    description: 'An ordered collection of records. value= is parsed as JSON; malformed JSON falls back to an empty list.',
    emptyValue: '[]',
  },
  {
    type: 'map',
    description: 'A key/value record, read with dotted paths (@selected-message.subject). Parsed as JSON; malformed JSON falls back to an empty map.',
    emptyValue: '{}',
  },
  {
    type: 'record-list',
    description: 'A list with a declared field schema — <field name= type= default=> children. Enables add-to key validation (MPD-009) and per-field type coercion.',
    emptyValue: '[]',
  },
];

export interface StatementMeta {
  keyword: string;
  grammar: string;
  description: string;
}

export const STATEMENTS: StatementMeta[] = [
  {
    keyword: 'set',
    grammar: 'set <target> to <value> [where <condition>]',
    description: 'Assign a value. With where, updates the matching field on every matching record (set habits.done to "true" where id = hid), or selects a matching record into a map value.',
  },
  {
    keyword: 'clear',
    grammar: 'clear <target>',
    description: 'Reset a state value to the empty value for its type.',
  },
  {
    keyword: 'go-to',
    grammar: 'go-to <screen> [with <key> = <value> ...]',
    description: 'Navigate to a screen, optionally passing parameters. Parameters must be declared in the target screen’s takes= (MPD-010).',
  },
  {
    keyword: 'add-to',
    grammar: 'add-to <list> <key> <value> [<key> <value> ...]',
    description: 'Append a record to a list. Keys are validated against the record-list schema when one is declared (MPD-009).',
  },
  {
    keyword: 'remove-from',
    grammar: 'remove-from <list> where <condition>',
    description: 'Remove every record in the list matching the condition.',
  },
  {
    keyword: 'increment',
    grammar: 'increment <target> [by <n>]',
    description: 'Add to a number state value. Step defaults to 1.',
  },
  {
    keyword: 'decrement',
    grammar: 'decrement <target> [by <n>]',
    description: 'Subtract from a number state value. Step defaults to 1.',
  },
];

export interface ComputedOpMeta {
  op: string;
  source: 'list' | 'pair';   // 'pair' = from="a,b", two scalar state names
  requires: string[];        // attributes without which the op returns 0/[] (MPD-013)
  optional: string[];
  description: string;
}

export const COMPUTED_OPS: ComputedOpMeta[] = [
  // Scalar arithmetic over two named state values
  {
    op: 'add',
    source: 'pair',
    requires: [],
    optional: [],
    description: 'a + b, where from="a,b" names two number state values.',
  },
  {
    op: 'subtract',
    source: 'pair',
    requires: [],
    optional: [],
    description: 'a − b, where from="a,b" names two number state values.',
  },
  {
    op: 'percent',
    source: 'pair',
    requires: [],
    optional: [],
    description: 'a ÷ b × 100, rounded to a whole number. Returns 0 when b is 0.',
  },
  {
    op: 'percent-of',
    source: 'pair',
    requires: [],
    optional: [],
    description: 'a × b ÷ 100 — b percent of a.',
  },

  // Aggregations over a list / record-list, filtered by where= first
  {
    op: 'count',
    source: 'list',
    requires: [],
    optional: ['where'],
    description: 'Number of items remaining after the where filter.',
  },
  {
    op: 'sum',
    source: 'list',
    requires: ['field'],
    optional: ['where'],
    description: 'Adds field across every matching item.',
  },
  {
    op: 'avg',
    source: 'list',
    requires: ['field'],
    optional: ['where', 'window'],
    description: 'Mean of field, rounded to a whole number. window="N" averages only the last N items.',
  },
  {
    op: 'min',
    source: 'list',
    requires: ['field'],
    optional: ['where', 'window'],
    description: 'Smallest value of field. window="N" considers only the last N items.',
  },
  {
    op: 'max',
    source: 'list',
    requires: ['field'],
    optional: ['where', 'window'],
    description: 'Largest value of field. window="N" considers only the last N items.',
  },
  {
    op: 'sum-product',
    source: 'list',
    requires: ['field', 'by'],
    optional: ['where'],
    description: 'Sum of field × by across matching items — line-item totals in one declaration.',
  },
  {
    op: 'group-by',
    source: 'list',
    requires: ['field', 'by'],
    optional: [],
    description: 'Groups items by the by field, summing field within each group. Returns a list of { key, value } sorted by value descending — feeds <chart from="..." field="value" label="key">.',
  },
  {
    op: 'streak',
    source: 'list',
    requires: ['field'],
    optional: ['by', 'where'],
    description: 'Counts consecutive items, from the most recent backwards, whose field is truthy. by= names a date field to sort by (descending) before counting.',
  },
];

export interface DiagnosticMeta {
  code: string;
  description: string;
  emitted: boolean;   // false = code is reserved and stable, but no check produces it yet
}

// Descriptions and emission status for every MPD code. Category and severity
// live in src/cli/diagnostics.ts (CODES); `mere schema --json` joins the two
// and fails loudly if they ever disagree, so a new code cannot ship
// undocumented and a documented code cannot silently disappear.
//
// Codes are stable forever and are never renumbered or reused — including
// reserved ones. New checks take the next free number after MPD-014.
export const DIAGNOSTIC_DOCS: DiagnosticMeta[] = [
  { code: 'MPD-001', emitted: true,  description: 'Workbook root element missing, unreadable, or invalid.' },
  { code: 'MPD-002', emitted: true,  description: 'Tag is not in the element registry.' },
  { code: 'MPD-003', emitted: true,  description: 'A sigil references state, a computed value, or an action that is not declared.' },
  { code: 'MPD-004', emitted: true,  description: 'Malformed sigil — @, ~, or ! with no identifier after it.' },
  { code: 'MPD-005', emitted: false, description: 'Binding to an incompatible state type.' },
  { code: 'MPD-006', emitted: false, description: 'Action invoked with the wrong number of arguments.' },
  { code: 'MPD-007', emitted: true,  description: 'Two-way binding (~) targets a computed value, which is read-only.' },
  { code: 'MPD-008', emitted: true,  description: 'Circular computed value dependency.' },
  { code: 'MPD-009', emitted: true,  description: 'add-to uses a key that is not declared in the record-list schema.' },
  { code: 'MPD-010', emitted: true,  description: 'go-to passes a parameter the target screen does not declare in takes=.' },
  { code: 'MPD-011', emitted: true,  description: '<chart from="..."> does not reference a list or record-list state value.' },
  { code: 'MPD-012', emitted: true,  description: '<chart field="..."> is not declared in the record-list schema (warning).' },
  { code: 'MPD-013', emitted: true,  description: 'A computed op is missing a field= or by= attribute it requires.' },
  { code: 'MPD-014', emitted: true,  description: 'Self-closing tag — no Mere tag is an HTML void element, so /> silently nests what follows.' },
  { code: 'MPD-015', emitted: true,  description: 'theme= names a theme that does not exist; the runtime would silently fall back to classic-light.' },
]
