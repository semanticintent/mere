# Mere — Build Roadmap

**Version:** 0.1
**Status:** All four milestones complete ✓

---

## Technology stack

| Concern | Decision |
|---------|----------|
| Language | TypeScript (strict mode) |
| Runtime target | Modern browsers — Chrome 120+, Firefox 115+, Safari 17+ |
| Build | Single bundled JS file via esbuild. No framework. |
| Persistence | OPFS + SQLite-WASM (`@sqlite.org/sqlite-wasm`). IndexedDB fallback only if OPFS unavailable. |
| Rendering | Native DOM. No React, no Vue, no virtual DOM. Custom minimal reactive system. |
| Components | Native web components (Custom Elements API) as implementation substrate for each semantic tag. |
| Parser | Native `DOMParser`. Workbooks parse as HTML with custom elements. |
| Styling | CSS custom properties for themes. Shadow DOM for element encapsulation. |

---

## Non-negotiable principles

- **No external dependencies at workbook runtime.** The bundle is self-contained.
- **The runtime is small.** Target: under 50KB gzipped for the core. Themes add ~5KB each.
- **The workbook file is a valid HTML document.** Any browser parses it.
- **No build step for workbooks.** Authors produce `.mp` files directly. The runtime executes them as-is.
- **State is observable.** Every mutation triggers re-rendering of dependent bindings.

---

## The reactive system

Keep it small. A Mere workbook has tens of state values, not thousands.

- Each state value wrapped in a Proxy-based observable.
- Bindings (`@`, `~`) register subscriptions at parse time.
- On state change, dependent bindings re-evaluate and update the DOM.
- Computed values are lazy and memoized. Invalidated on source change.

Target: ~150 lines of dedicated reactive code. Do not import Alpine or any other library.

---

## Milestone 1 — Hello workbook ✓ COMPLETE (commit 4e5def5)

**Shipped:**
- [x] `mere-runtime.js` — 9KB gzipped, single bundled file
- [x] Parser: `<workbook>`, `<state>`, `<computed>`, `<actions>`, `<screen>`
- [x] Reactive state store with subscription-based bindings
- [x] All 25 semantic elements registered
- [x] Sigils: `@`, `~`, `!`, `?`
- [x] `item.field` in loops
- [x] `classic-light` theme — full personality
- [x] Two-screen inbox.mp with mock data, tab filtering, navigation
- [x] Dev server with `.mp → text/html` MIME proxy (Safari fix)

**Also shipped ahead of schedule (was Milestone 2):**
- [x] Multiple `<screen>` elements and navigation
- [x] `go-to` action
- [x] `toggle`, `form`, `field`, `button`, `paragraph` elements
- [x] Multi-argument action invocation
- [x] Nested state path access (`@selected-message.subject`)

---

## Milestone 2 — State wiring, second workbook ✓ COMPLETE (commit 8032b3d)

**Shipped:**
- [x] `reply-draft` state — field two-way bind works end to end
- [x] `send-reply` action — appends to sent, clears draft, navigates back
- [x] `archive-message` action — moves to archive, navigates to inbox
- [x] `add-to` action — appends key-value record to a list state
- [x] `clear` action — resets state to declared default
- [x] `where` filtering in lists with `"all"` passthrough convention
- [x] LLM generation test: passed — books.mp generated from spec quick-reference alone
- [x] `habits.mp` (brutalist theme) + `books.mp` (proton-mail, four-tab filter, persist)

---

## Milestone 3 — Persistence and theming ✓ COMPLETE (commit 657f026)

**Shipped:**
- [x] OPFS persistence with localStorage fallback (debounced 500ms saves)
- [x] Themes: `classic-light`, `proton-mail`, `brutalist` — genuinely distinct personalities
- [x] `proton-mail` — purple accent, underline tabs, card-per-item lists, 14px base
- [x] `brutalist` — 3px black borders, inverted header, red accent, all-caps, 900 weight
- [x] Theme via `<workbook theme="...">` attribute

---

## Milestone 4 — Diagnostics and CLI ✓ COMPLETE (commit a5cb60c)

**Shipped:**
- [x] `mere check <file>` — validates without running. Exit 0 = clean, 1 = errors, 2 = warnings.
- [x] `mere schema [--json]` — prints element registry as table or machine-readable JSON
- [x] All 8 stable diagnostic codes (MPD-001 through MPD-008)
- [x] Line/column/caret error reporting, coloured output, file:line:col prefix
- [x] 26-element registry in `src/registry.ts` shared between CLI and runtime metadata
- [x] npm package: `"bin": { "mere": "./dist/mere-cli.js" }`

---

## Integration test (run at every milestone)

Paste the one-page quick reference from `spec.md` into an LLM. Ask it to generate a new screen not in the reference. Run the result in the mere runtime. It should render without errors.

This is the baseline precondition for AI-first authoring. If it fails, the vocabulary or grammar is unclear.

---

## What NOT to build in v0.1

| Feature | Phase |
|---------|-------|
| Intent expansion (AI compositor) | v0.2 |
| Custom themes | v0.2 |
| Visual authoring tool | v0.3 |
| Third-party custom components | v0.3 |
| Server-side rendering | Never — violates principle 1 |
| Cloud sync | Never — violates principle 6 |
| Audit / provenance divisions | v0.3 |

---

## v0.2 and beyond (directional only)

**v0.2 — AI compositor**
Intent annotations (`?"..."`) become actionable. Describe an element in plain language; the compositor expands it into full markup. Authoring becomes conversational.

**v0.3 — Visual authoring**
Non-programmers build workbooks without writing markup. The visual tool compiles to the same `.mp` format.

**v0.4 — Ecosystem**
Third-party themes, custom components, shared workbook library. Open format invites this without requiring a platform.

---

## Known defect — the `?` intent annotation is discarded at parse time

**Found 2026-08-18. Logged, not fixed.**

The documented syntax does not survive HTML attribute parsing:

```html
<screen ?"mobile inbox with tabs">
```

`?` followed by a quoted string is not an attribute *value* — there is no `=` —
so the tokenizer fragments it. node-html-parser produces five separate
attributes (`?`, `mobile`, `inbox`, `with`, `tabs`) and the runtime's
`value || name.slice(1)` reads the intent as an empty string. Per the HTML5
tokenizer, a browser fragments it slightly differently: a quote inside an
attribute name is a recoverable parse error, so the name becomes `?"mobile` and
`slice(1)` yields `"mobile` — truncated at the first space. Either way the
annotation never reaches the runtime intact.

Nothing consumes the value today (`?` is inert by design), which is why this was
invisible. It is the same shape as `theme="notion-paper"`: a silent no-op that
looks correct in source.

**This blocks any compositor work.** There is no point expanding an annotation
the parser throws away.

### The fix, when picked up

`?="mobile inbox with tabs"` parses correctly as a single attribute carrying the
full value — verified against node-html-parser and the tokenizer spec, not yet
against a live browser. Two candidate spellings were considered:

| Option | Trade-off |
|--------|-----------|
| `?="…"` | Minimal change; keeps the `?` marker; reinforces that `?` is an annotation channel rather than a binding sigil (it already sits outside MPD-004 for the same reason). |
| `intent="…"` | Ordinary HTML attribute, no sigil-adjacent parsing at all; loses the `?` visual marker. |

Scope of the migration: **100 occurrences across 22 files** — `mere/examples`,
`mere/docs`, `README.md`, `mere-site/src`, `mere-site/workbooks`, and
`mere-store/src/app/get-started/page.tsx` (the store's "copy AI prompt" text).

Suggested shape when done:
1. Migrate all occurrences mechanically.
2. Keep the runtime accepting the old form so existing files do not hard-break.
3. Add a diagnostic (next free code after MPD-017) flagging the broken spelling,
   so it cannot be reintroduced — the same treatment MPD-014 gave self-closing tags.

### Then: `mere expand`

`@semanticintent/recall-compiler` is a working reference implementation of the
same problem (`WITH INTENT` → `recall expand`): Anthropic API with
`ANTHROPIC_API_KEY` or `--api-key`, a system prompt teaching the target
language, a structured payload of available data, and output written atomically
to `<stem>.expanded.rcl` rather than in place. See `src/expand/` there.

Two things Mere should do differently:

- **Generate the compositor's system prompt from the language registry.** RECALL's
  prompt hand-lists its elements, which is precisely the drift this project spent
  2026-08-18 eliminating. Mere already emits the whole language surface via
  `mere schema --json`; the generator should be taught from the same source the
  published spec is.
- **Validate the expansion with `mere check` before writing**, and feed any
  diagnostics back for one repair attempt. Refusing to emit source that fails its
  own checker is the differentiator over a plain generate-and-hope loop.

Expansion must remain author-time only. A compositor call at render time would
break "works offline, forever".

---

## Open questions (pre-implementation)

1. **Schema migration.** When a workbook author ships v2 with state changes, how does a recipient's v1 data migrate? Not blocking v0.1, but needs a design before v0.2.

2. **The `?` intent annotation grammar.** What makes a valid intent string? How does the compositor handle ambiguous intent? Needs a spec before building v0.2.

3. **Multi-author workbooks.** Is there a future where two people work on the same workbook? If yes, what does conflict resolution look like? Currently out of scope — document the decision explicitly.

4. **The runtime distribution model.** In Milestone 1, the `.mp` file references `mere-runtime.js` locally. In production, what's the canonical URL (or bundle strategy) for the runtime? Does the runtime ship inside the workbook file?
