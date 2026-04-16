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
    <value name="current-tab" type="text" default="inbox"/>
    <value name="messages" type="list" persist/>
    <value name="selected-message" type="map"/>
  </state>

  <computed>
    <value name="visible-messages" from="messages" where="folder = current-tab"/>
    <value name="unread-count" from="messages" where="read = false" op="count"/>
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

## The five sigils

| Sigil | Role | Meaning |
|-------|------|---------|
| `@` | Read binding | Display a state value in this element |
| `~` | Two-way binding | Element reads and writes this state |
| `!` | Event handler | Invoke this action on interaction |
| `?` | Intent annotation | Natural-language intent for AI compositors |
| *(bare)* | Identifier or literal | Quoted strings are literals; unquoted words are identifiers |

---

## The six rules

1. `@name` binds an element to read the value of state `name`. Used for display.
2. `~name` binds an element two-way to state `name`. Used for inputs, tabs, toggles.
3. `!action` invokes action `action` on interaction. Arguments follow: `!open-message with item.id`.
4. `?"text"` annotates any element with natural-language intent. Runtime ignores it; compositors read it.
5. Quoted strings are literals. Unquoted words are identifiers. Within loops, `item.field` references the current item.
6. Elements with children use open/close tags. Leaf elements self-close with `/>`.

---

## State

### Value types

| Type | Description |
|------|-------------|
| `text` | A string value |
| `number` | A numeric value |
| `boolean` | A true/false value |
| `list` | An ordered collection of records |
| `map` | A key-value record |

### Persistence

Any state value declared with `persist` is automatically saved to OPFS and travels with the exported workbook file.

```xml
<value name="messages" type="list" persist/>
```

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
  <value name="visible-messages" from="messages" where="folder = current-tab"/>
  <value name="unread-count" from="messages" where="read = false" op="count"/>
</computed>
```

Computed values are read-only. Two-way binding to a computed value is an error (MPD-007).
Circular computed dependencies are an error (MPD-008).

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

```
set <state-name> to <value>
set <state-name>.<field> to <value> where <condition>
go-to <screen-name>
```

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

## Semantic vocabulary (v0.1)

### Structural
- `screen` — a full screen
- `header`, `footer` — top and bottom zones
- `form` — structural grouping for inputs; no implicit submit behavior

### Text
- `heading`, `subtitle`, `paragraph`, `timestamp` — text display elements

### Visual
- `badge`, `avatar`, `icon` — small visual elements

### Navigation
- `tab-bar`, `tab` — horizontal switcher; binds to state via `~`
- `navigation-bar`, `nav-item` — bottom or top navigation between screens

### Collections
- `message-list`, `card-list`, `list` — collections rendered from a state list

### Content containers
- `message-card`, `card` — tappable content containers

### Inputs
- `field`, `button` — input elements
- `toggle` — boolean state switch; binds via `~`

### Surfaces
- `modal`, `toast`, `banner` — overlay and notification elements

### HTML attribute passthrough

`field`, `button`, and input-like elements pass through a known allowlist of HTML attributes:
`placeholder`, `type`, `required`, `min`, `max`, `pattern`, `autocomplete`.

---

## Themes

Declared on `<workbook theme="...">`. Built-in themes:

| Theme | Character |
|-------|-----------|
| `classic-light` | Neutral baseline, safe |
| `proton-mail` | Clean, minimal, Swiss-influenced, generous whitespace |
| `corporate-light` | Restrained, conservative, trustworthy |
| `ecommerce-hero` | Bold, high-contrast, confident, urgent |
| `notion-paper` | Soft shadows, editorial spacing, paper-white surfaces |
| `brutalist` | Hard edges, heavy type, no shadows, aggressive contrast |

Themes define colors, typography, spacing, radii, shadows, and motion. Themes cannot change structure. A card is always a card; only its visual expression changes.

---

## Intent annotations

Any element may carry `?"natural-language intent"`. The runtime ignores intent annotations in v0.1. AI compositors (v0.2+) read them to expand placeholder elements into full markup.

```xml
<screen "inbox" ?"mobile inbox with tabs and message list">
<card ?"show sender, subject, and timestamp in a compact row">
```

---

## Diagnostic codes

All errors have a stable code, a category, a message, and a source location (line, column, caret).

| Code | Category | Description |
|------|----------|-------------|
| MPD-001 | structural | Workbook root element missing or invalid |
| MPD-002 | unknown-element | Tag not in the element registry |
| MPD-003 | unknown-identifier | Sigil references undeclared state or action |
| MPD-004 | syntax | Malformed sigil attribute |
| MPD-005 | type-mismatch | Binding to incompatible state type |
| MPD-006 | structural | Action invoked with wrong number of arguments |
| MPD-007 | structural | Two-way binding target is read-only |
| MPD-008 | structural | Circular computed value dependency |

Command: `mere check workbook.mp` — validates without running. Exit 0 = clean, 1 = errors, 2 = warnings.

---

## Quick reference

```
SIGILS:  @ read   ~ two-way   ! event   ? intent

STRUCTURE:
  <workbook theme="...">
    <state>     <value name="..." type="..." default="..." persist/>
    <computed>  <value name="..." from="..." where="..." op="..."/>
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
  ecommerce-hero, notion-paper, brutalist

FILE:      .mp  (Mere Package — HTML document with <workbook> element)
RUNTIME:   mere-runtime.js  (single file, target <50KB gzipped)
PERSIST:   OPFS + SQLite-WASM via persist attribute
CLI:       mere check <file>   mere schema   mere run <file>
```
