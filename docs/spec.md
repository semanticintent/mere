# Mere — Language Specification

**Version:** 0.1
**Status:** Draft

---

## Overview

Mere workbooks are authored in a semantic vocabulary — HTML-like tags with a compact sigil grammar for bindings. Tags describe meaning (`<message-card>` is a message card); sigils attach data and behavior. The format is a valid HTML document; any browser can parse it.

---

## File format

A `.mp` file is an HTML document:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>My Workbook</title>
  <script src="mere-runtime.js"></script>
</head>
<body>
  <workbook theme="classic-light">
    <state>...</state>
    <computed>...</computed>
    <actions>...</actions>
    <screen name="main">...</screen>
  </workbook>
</body>
</html>
```

The runtime auto-bootstraps when it sees a `<workbook>` element in the DOM. No initialization code required.

---

## Workbook structure

A workbook has four sections, declared in order: `state`, `computed`, `actions`, `screens`.

```xml
<workbook theme="proton-mail">

  <state>
    <value name="current-tab" type="text" default="inbox"></value>
    <value name="messages" type="list" persist></value>
    <value name="selected-message" type="map"></value>
  </state>

  <computed>
    <value name="visible-messages" from="messages" where="folder = current-tab"></value>
    <value name="unread-count" from="messages" where="read = false" op="count"></value>
  </computed>

  <actions>
    <action name="open-message" takes="id">
      set selected-message to messages where id = id
      go-to message-detail
    </action>
    <action name="archive-message" takes="id">
      set messages.folder to "archive" where id = id
      go-to inbox
    </action>
  </actions>

  <screen name="inbox">...</screen>
  <screen name="message-detail">...</screen>

</workbook>
```

---

## Three binding sigils, and an annotation

Three sigils bind an element to the workbook. Each takes a bare identifier
immediately after the sigil character.

| Sigil | Role | Meaning |
|-------|------|---------|
| `@` | Read binding | Display a state value in this element |
| `~` | Two-way binding | Element reads and writes this state |
| `!` | Event handler | Invoke this action on interaction |

`?` is deliberately not one of them. It takes a **quoted string** rather than an
identifier, it binds to nothing, and the runtime ignores it entirely:

| Marker | Role | Meaning |
|--------|------|---------|
| `?` | Intent annotation | Natural-language intent for a generator. Inert at runtime. |

The difference is visible in the diagnostics: MPD-004 flags a bare `@`, `~`, or
`!` with no identifier after it, and pointedly does not apply to `?`, because
there is no identifier for `?` to be missing. It is an annotation channel that
travels in the same attribute position as the sigils, not a fourth binding.

Outside the sigils, a bare attribute is an identifier or a literal: quoted
strings are literals, unquoted words are identifiers, and inside a loop
`item.field` references the current item.

---

## The six rules

1. `@name` binds an element to read the value of state `name`. Used for display.
2. `~name` binds an element two-way to state `name`. Used for inputs, tabs, toggles.
3. `!action` invokes action `action` on interaction. Arguments follow: `!open-message with item.id`.
4. `?"text"` annotates any element with natural-language intent. Runtime ignores it; compositors read it.
5. Quoted strings are literals. Unquoted words are identifiers. Within loops, `item.field` references the current item.
6. Every element uses an explicit open and close tag, always — `<field ~name></field>`, never `<field ~name/>`. No Mere element is a real HTML void element, so a browser silently ignores `/>` on any of them and nests whatever follows inside that element instead of after it (`mere check` rejects this as MPD-014).

---

## State

### Value types

<!-- BEGIN GENERATED: stateTypes -->
| Type | Empty value | Description |
|---|---|---|
| `text` | `""` | A string value. |
| `number` | `0` | A numeric value. value= is parsed with Number(). |
| `boolean` | `false` | A true/false value. value= is true only for the exact string "true". |
| `list` | `[]` | An ordered collection of records. value= is parsed as JSON; malformed JSON falls back to an empty list. |
| `map` | `{}` | A key/value record, read with dotted paths (@selected-message.subject). Parsed as JSON; malformed JSON falls back to an empty map. |
| `record-list` | `[]` | A list with a declared field schema — <field name= type= default=> children. Enables add-to key validation (MPD-009) and per-field type coercion. |
<!-- END GENERATED: stateTypes -->

### Persistence and travel

A value's modifier decides where it lives — and, critically, whether it leaves
this machine. The default is transient, so data ships only where an author wrote
`travel` deliberately.

<!-- BEGIN GENERATED: stateModifiers -->
| Modifier | Leaves the machine? | Meaning |
|---|---|---|
| (none) | No | Transient. Lives for the session and is gone when the workbook closes. |
| `persist` | No | Saved locally to OPFS (localStorage fallback). Origin-scoped, so it does not travel with the file — "remember this on this device". |
| `travel` | Yes — ships with the file | Serialized into the workbook’s own <value> attributes when a save statement runs. This data IS the document and ships wherever the file is sent. |
<!-- END GENERATED: stateModifiers -->

```xml
<value name="draft"  type="text" value=""></value>            <!-- transient -->
<value name="theme"  type="text" value="light" persist></value> <!-- this device only -->
<value name="tasks"  type="list" value="[]" travel></value>     <!-- ships with the file -->
```

`persist` writes to the browser's Origin Private File System (localStorage
fallback). OPFS is **origin-scoped**: the same workbook opened from `file://`,
served from a domain, or forwarded to a colleague sees different persisted
state. The file travels; persisted data does not.

`travel` closes that gap. On `save`, every travel value is written back into the
workbook's own `<value>` attributes, so the data *is* the document — readable in
a text editor, diffable in git, and present wherever the file is sent. Declaring
a value both `persist` and `travel` is a contradiction and an error (MPD-016).

Run `mere check --travel <file>` to see exactly what would leave the machine
before sending it.

Saving produces a **self-contained** file. The runtime is embedded rather than
referenced, and every external script is dropped — including anything the host
injected rather than the author, such as an analytics beacon added at the edge.
A workbook that only ran on the server it came from would not travel, and one
that phoned home when opened would not be sovereign.

### Nested access

Dotted access is valid on any state value whose type supports it (`map`, `list` item):

```xml
@selected-message.subject   <!-- field of a map -->
@item.sender                <!-- field of a list item in a loop -->
```

Out-of-bounds access returns empty string, no error.

---

## Computed values

Computed values are derived from state. They are lazy and memoized — invalidated on source change.

```xml
<computed>
  <value name="visible-messages" from="messages" where="folder = current-tab"></value>
  <value name="unread-count" from="messages" where="read = false" op="count"></value>
</computed>
```

Computed values are read-only. Two-way binding to a computed value is an error (MPD-007).

### Operators

`op=` selects the aggregation. Omitting `op=` with a `where=` filter yields the filtered
list itself. Missing a required attribute is an error (MPD-013).

<!-- BEGIN GENERATED: computedOps -->
| Operator | Source | Requires | Optional | Description |
|---|---|---|---|---|
| `add` | `from="a,b"` | — | — | a + b, where from="a,b" names two number state values. |
| `subtract` | `from="a,b"` | — | — | a − b, where from="a,b" names two number state values. |
| `percent` | `from="a,b"` | — | — | a ÷ b × 100, rounded to a whole number. Returns 0 when b is 0. |
| `percent-of` | `from="a,b"` | — | — | a × b ÷ 100 — b percent of a. |
| `count` | list | — | where | Number of items remaining after the where filter. |
| `sum` | list | field | where | Adds field across every matching item. |
| `avg` | list | field | where, window | Mean of field, rounded to a whole number. window="N" averages only the last N items. |
| `min` | list | field | where, window | Smallest value of field. window="N" considers only the last N items. |
| `max` | list | field | where, window | Largest value of field. window="N" considers only the last N items. |
| `sum-product` | list | field, by | where | Sum of field × by across matching items — line-item totals in one declaration. |
| `group-by` | list | field, by | — | Groups items by the by field, summing field within each group. Returns a list of { key, value } sorted by value descending — feeds <chart from="..." field="value" label="key">. |
| `streak` | list | field | by, where | Counts consecutive items, from the most recent backwards, whose field is truthy. by= names a date field to sort by (descending) before counting. |
<!-- END GENERATED: computedOps -->

Circular computed dependencies are an error (MPD-008).

**The `"all"` convention:** When the right-hand side of a `where` clause resolves to `"all"` or `""`, the filter is skipped and all items are returned. This enables the standard "All / Category / Category" tab pattern without special-casing in the workbook.

```xml
<tab-bar ~current-tab>
  <tab "all">All</tab>
  <tab "reading">Reading</tab>
  <tab "finished">Finished</tab>
</tab-bar>
<!-- visible-books where="status = current-tab" shows all when current-tab = "all" -->
```

---

## Actions

Actions declare what the user can do. They are invoked by `!` sigils on elements.

```xml
<action name="open-message" takes="id">
  set selected-message to messages where id = id
  go-to message-detail
</action>
```

### Action grammar

One statement per line inside `<action>`. Plain text, not XML children.

<!-- BEGIN GENERATED: statements -->
| Statement | Grammar | Description |
|---|---|---|
| `set` | `set <target> to <value> [where <condition>]` | Assign a value. With where, updates the matching field on every matching record (set habits.done to "true" where id = hid), or selects a matching record into a map value. |
| `clear` | `clear <target>` | Reset a state value to the empty value for its type. |
| `go-to` | `go-to <screen> [with <key> = <value> ...]` | Navigate to a screen, optionally passing parameters. Parameters must be declared in the target screen’s takes= (MPD-010). |
| `add-to` | `add-to <list> <key> <value> [<key> <value> ...]` | Append a record to a list. Keys are validated against the record-list schema when one is declared (MPD-009). |
| `remove-from` | `remove-from <list> where <condition>` | Remove every record in the list matching the condition. |
| `increment` | `increment <target> [by <n>]` | Add to a number state value. Step defaults to 1. |
| `decrement` | `decrement <target> [by <n>]` | Subtract from a number state value. Step defaults to 1. |
| `save` | `save` | Write every travel value back into the workbook file. Explicit by design — a workbook opened read-only from an attachment must not autosave. No effect if nothing is declared travel. |
<!-- END GENERATED: statements -->

The `where` condition is a single `field = value` comparison. The left side is always
a field on the record being tested; the right side resolves in order: a quoted literal,
`true`/`false`, an action parameter, a state value, and finally a bare string.

### Action invocation with arguments

Arguments are space-separated after `with`, positional, evaluated left-to-right. Commas are optional for readability.

```xml
!send-reply with selected-message.id reply-draft
!send-reply with selected-message.id, reply-draft   <!-- equivalent -->
```

---

## Screens

A screen is a full view. A workbook has one or more screens. Navigation between screens is via `go-to` in actions.

```xml
<screen name="inbox" ?"mobile inbox with tabs and message list">
  ...
</screen>
```

---

## Semantic vocabulary

Every element, generated from the registry the runtime and `mere check` both read.

<!-- BEGIN GENERATED: elements -->
| Element | Sigils | Passthrough attrs | Description |
|---|---|---|---|
| `screen` | ? | name | A full screen. Entry point for navigation. |
| `header` | ? | — | Top zone of a screen or card. |
| `footer` | ? | — | Bottom zone of a screen. |
| `form` | ? | — | Structural grouping for inputs. No implicit submit. |
| `toolbar` | ? | — | Flex row wrapper for a search-bar plus inline actions, with padding and gap. |
| `heading` | @ ? | — | Primary text — title or name. |
| `subtitle` | @ ? | — | Secondary text — description or metadata. |
| `paragraph` | @ ? | — | Body text. Supports multiline content. |
| `timestamp` | @ ? | — | Date/time display. Formatted relative to now. |
| `badge` | @ ? | — | Numeric or short text indicator. Hidden when value is 0 or empty. |
| `avatar` | @ ? | — | Circular image or initials. Renders image if value is a URL. |
| `icon` | ? | — | Named icon glyph. |
| `tab-bar` | ~ ? | — | Horizontal tab switcher. Binds to a text state value via ~. |
| `tab` | ? | — | A single tab inside a tab-bar. First positional attr is its value. |
| `navigation-bar` | ? | — | Bottom or top navigation bar. First positional attr is position. |
| `nav-item` | ! ? | — | Navigation action. First positional attr is the target screen name. |
| `message-list` | @ ? | — | Renders a list of messages from a list state value via @. |
| `card-list` | @ ? | — | Renders a list of cards from a list state value via @. |
| `list` | @ ? | — | Generic list. Renders items from a list state value via @. |
| `message-card` | ! ? | — | Tappable message row. Use inside message-list. |
| `card` | ! ? | — | Content container with border and padding. |
| `field` | ~ ? | placeholder, type, required, min, max, pattern, autocomplete, name | Text input. Binds two-way to state via ~. |
| `button` | ! ? | type | Action trigger. Invokes an action via !. |
| `toggle` | ~ ? | — | Boolean switch. Binds two-way to a boolean state via ~. |
| `camera` | ~ ? | facing, name | Photo capture. Opens the device camera via the OS picker (no live preview stream). Binds two-way to a map state value via ~ — writes { dataUrl, capturedAt }. facing=user\|environment hints front vs back camera. |
| `kv` | @ ? | label, format | Key/value row. label= sets the label, @ binds the value. format=currency\|percent for numeric formatting. |
| `chart` | @ ? | type, from, field, label, where | Inline SVG chart. type=bar\|line\|pie. from= binds to a list state, field= is the numeric value, label= is the category label. |
| `modal` | ? | — | Full-screen overlay dialog. |
| `toast` | ? | — | Transient notification. Text content only. |
| `banner` | ? | — | Persistent inline notification strip. |
| `sidebar` | ? | — | Left navigation rail for layout="full". Container for sidebar-brand and sidebar-section. |
| `sidebar-brand` | ? | — | Sidebar header/logo text. |
| `sidebar-section` | ? | label | Grouped sidebar nav items under an optional label=. |
| `data-table` | @ ! ? | — | Table from a list state via @. column children define fields; as=status-badge\|name-url\|contact\|currency\|product sets a special cell renderer. Optional ! binds a row-click action. |
| `column` | ? | field, label, as, by, editable | Column definition inside data-table or spreadsheet. Declarative only — not rendered directly. |
| `search-bar` | ~ ? | — | Text filter input with a search icon. Binds two-way via ~. |
| `spreadsheet` | @ ? | — | Editable grid from a list state via @. column children define fields; editable on a column allows inline edits. |
| `metric` | @ ? | format | Single KPI value with label. format=currency\|percent for numeric formatting. |
| `metric-group` | ? | — | Layout container for multiple metric cards. |
| `bar` | @ ? | label | Horizontal progress/comparison bar. label= sets the caption, @ binds a 0-100 value. |
<!-- END GENERATED: elements -->

### HTML attribute passthrough

`field`, `button`, and input-like elements pass through a known allowlist of HTML attributes:
`placeholder`, `type`, `required`, `min`, `max`, `pattern`, `autocomplete`.

---

## Themes

Declared on `<workbook theme="...">`. Built-in themes:

<!-- BEGIN GENERATED: themes -->
| Theme | Character |
|---|---|
| `classic-light` | Neutral baseline. Clean cards, comfortable spacing. The default. |
| `proton-mail` | Purple accent, underline tabs, 14px base type. |
| `brutalist` | Zero radius, 3px black borders, inverted header, red accent. |
| `warm-brutalist` | Parchment and ink, restrained indigo accent, generous radius — brutalist’s warmer sibling. |
<!-- END GENERATED: themes -->

Themes define colors, typography, spacing, radii, shadows, and motion. Themes cannot change structure. A card is always a card; only its visual expression changes.

---

## Intent annotations

Any element may carry `?"natural-language intent"`. The runtime ignores intent annotations in v0.1. AI compositors (v0.2+) read them to expand placeholder elements into full markup.

```xml
<screen "inbox" ?"mobile inbox with tabs and message list">
<card ?"show sender, subject, and timestamp in a compact row">
```

---

## Security and trust model

A workbook is an ordinary HTML document containing the Mere runtime. Opening one
executes its JavaScript, exactly like any other HTML file.

**The vocabulary is not a security boundary.** The element registry and the MPD
diagnostics constrain what *you* author with this toolchain. They constrain
nothing about a file that arrives by other means: a hostile workbook can embed a
modified runtime, or arbitrary script, and will still open in a browser. A
`.mp.html` received from a third party carries exactly the trust model of any
HTML attachment from that source — the small vocabulary does not make it safe.

What the runtime does guarantee for the workbooks it renders:

- State values render as **text**, never as markup. No `@` binding is written
  through `innerHTML`.
- A value bound into an image source passes a **scheme allowlist** — `https:`,
  `http:`, root- or dot-relative paths, and `data:image/*`. Anything else, and
  anything containing markup metacharacters, renders as text instead.
- `camera` captures are re-encoded through a canvas before being stored, which
  **discards EXIF metadata** — including GPS coordinates and device identifiers —
  and downscales the image.

`mere validate` confirms that a packed workbook still matches the source embedded
in it at pack time. That is a tamper-detection check, not an authorship check: it
tells you the file has not changed since it was packed, not who packed it.

---

## Diagnostic codes

All errors have a stable code, a category, a message, and a source location (line, column, caret).

<!-- BEGIN GENERATED: diagnostics -->
| Code | Category | Severity | Description |
|---|---|---|---|
| `MPD-001` | structural | error | Workbook root element missing, unreadable, or invalid. |
| `MPD-002` | unknown-element | error | Tag is not in the element registry. |
| `MPD-003` | unknown-identifier | error | A sigil references state, a computed value, or an action that is not declared. |
| `MPD-004` | syntax | error | Malformed sigil — @, ~, or ! with no identifier after it. |
| `MPD-005` | type-mismatch | error (reserved) | Binding to an incompatible state type. |
| `MPD-006` | structural | error (reserved) | Action invoked with the wrong number of arguments. |
| `MPD-007` | structural | error | Two-way binding (~) targets a computed value, which is read-only. |
| `MPD-008` | structural | error | Circular computed value dependency. |
| `MPD-009` | type-mismatch | error | add-to uses a key that is not declared in the record-list schema. |
| `MPD-010` | unknown-identifier | error | go-to passes a parameter the target screen does not declare in takes=. |
| `MPD-011` | type-mismatch | error | <chart from="..."> does not reference a list or record-list state value. |
| `MPD-012` | type-mismatch | warning | <chart field="..."> is not declared in the record-list schema (warning). |
| `MPD-013` | structural | error | A computed op is missing a field= or by= attribute it requires. |
| `MPD-014` | syntax | error | Self-closing tag — no Mere tag is an HTML void element, so /> silently nests what follows. |
| `MPD-015` | unknown-identifier | error | theme= names a theme that does not exist; the runtime would silently fall back to classic-light. |
| `MPD-016` | structural | error | A value is declared both persist and travel. They mean opposite things — local-only versus ships-with-the-file — so one of them is a mistake. |
| `MPD-017` | structural | warning | A save statement runs but no value is declared travel, so saving would write nothing (warning). |
<!-- END GENERATED: diagnostics -->

Codes are stable forever — never renumbered, never reused. Reserved codes are defined and permanently allocated but no check emits them yet.

Command: `mere check workbook.mp` — validates without running. Exit 0 = clean, 1 = errors, 2 = warnings.

---

## Quick reference

```
SIGILS:  @ read   ~ two-way   ! event   ? intent

STRUCTURE:
  <workbook theme="...">
    <state>     <value name="..." type="..." default="..." persist></value>
    <computed>  <value name="..." from="..." where="..." op="..."></value>
    <actions>   <action name="..." takes="..."> ... </action>
    <screen>    ... semantic markup ...
  </workbook>

ELEMENTS (v0.1):
  screen, header, footer
  heading, subtitle, paragraph, timestamp
  badge, avatar, icon
  tab-bar, tab, navigation-bar, nav-item
  message-list, card-list, list
  message-card, card
  form, field, button, toggle
  modal, toast, banner

BINDINGS:
  @state-name            display state value
  @state.field           display nested field
  @item.field            display loop item field
  ~state-name            two-way bind
  !action-name           invoke action
  !action-name with a b  invoke with arguments
  ?"intent text"         AI compositor hint

THEMES:
  classic-light, proton-mail, corporate-light,
  ecommerce-hero, notion-paper, brutalist,
  warm-brutalist

FILE:      .mp  (Mere Package — HTML document with <workbook> element)
RUNTIME:   mere-runtime.js  (single file, target <50KB gzipped)
PERSIST:   OPFS + SQLite-WASM via persist attribute
CLI:       mere check <file>   mere schema   mere run <file>
```
