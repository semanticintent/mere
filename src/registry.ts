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
];

export const REGISTRY_MAP = new Map(REGISTRY.map(e => [e.tag, e]));

export const KNOWN_THEMES = [
  'classic-light',
  'proton-mail',
  'corporate-light',
  'ecommerce-hero',
  'notion-paper',
  'brutalist',
] as const;
