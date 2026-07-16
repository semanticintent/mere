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

export const KNOWN_THEMES = [
  'classic-light',
  'proton-mail',
  'corporate-light',
  'ecommerce-hero',
  'notion-paper',
  'brutalist',
  'warm-brutalist',
] as const;
