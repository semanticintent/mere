# Mere — Build Roadmap

**Version:** 0.1
**Status:** Pre-implementation

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

## Milestone 2 — State wiring, `send-reply`, and second workbook

**Goal:** Every element in inbox.mp is fully wired. A second workbook proves the format generalises.

**Completion condition:** Reply draft persists in state while typing. Send clears the draft. A second `.mp` workbook (different use case) renders correctly from the spec alone.

**Build:**
- [ ] Wire `reply-draft` state in inbox.mp — field two-way bind works end to end
- [ ] Implement `send-reply` action — appends to sent folder, clears draft, navigates back
- [ ] `archive-message` action — moves message to archive folder, navigates to inbox
- [ ] Fix `nav-item` positional attr parsing — back button and nav icons reliable
- [ ] LLM generation test — paste spec quick-reference, generate a new screen, runtime renders it without errors
- [ ] Second example workbook: a different use case (e.g. habit tracker or inventory)

---

## Milestone 3 — Persistence and theming

**Goal:** Data survives a round-trip. Themes are real visual personalities.

**Completion condition:** User adds a message, closes the tab, reopens the file — message is still there. User changes `theme="..."` attribute and sees the visual change immediately.

**Build:**
- [ ] OPFS + SQLite-WASM for `persist` state values
- [ ] Themes: `classic-light`, `proton-mail`, `brutalist` (each ~10 CSS custom properties, genuinely distinct personalities)
- [ ] Theme switching via `<workbook theme="...">` attribute
- [ ] Export workbook: serialize current state into the `.mp` file

---

## Milestone 4 — Diagnostics and CLI

**Goal:** A real tool. Ship it.

**Completion condition:** `mere check` reports structured errors with line/column. `mere schema` prints the element registry.

**Build:**
- [ ] `mere check <file>` — validates without running. Exit 0/1/2.
- [ ] `mere schema [--json]` — prints element registry
- [ ] All 8 initial diagnostic codes (MPD-001 through MPD-008)
- [ ] Line/column error reporting with caret string
- [ ] npm package: `mere` CLI

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

## Open questions (pre-implementation)

1. **Schema migration.** When a workbook author ships v2 with state changes, how does a recipient's v1 data migrate? Not blocking v0.1, but needs a design before v0.2.

2. **The `?` intent annotation grammar.** What makes a valid intent string? How does the compositor handle ambiguous intent? Needs a spec before building v0.2.

3. **Multi-author workbooks.** Is there a future where two people work on the same workbook? If yes, what does conflict resolution look like? Currently out of scope — document the decision explicitly.

4. **The runtime distribution model.** In Milestone 1, the `.mp` file references `mere-runtime.js` locally. In production, what's the canonical URL (or bundle strategy) for the runtime? Does the runtime ship inside the workbook file?
