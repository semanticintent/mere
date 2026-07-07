# Mere v0.3 — CLI & Trust Model Scope

**Status:** `mere dev`, `mere diff`, and `mere validate` shipped 2026-07-07. The intent compositor (`?` sigil) below is scoped only, not yet implemented.

**Context:** this scope emerged from a direct comparison against `@semanticintent/recall-compiler`'s CLI (`check`/`compile`/`diff`/`audit`/`stats`/`expand`/`explain`/`fix`/`manifest`/`scaffold`/`serve`/`validate`/`crd`/`schema`) — a sibling sovereign-file publishing language with a considerably more mature CLI surface. Several of its solved problems map directly onto gaps Mere already has open.

---

## Shipped — `mere dev`

### What it is
A local dev server for workbooks: no build step (there was never one to add), but real value beyond `npx serve .`:
- Runs `mere check` against every workbook in the served directory on startup and again on every save, printing diagnostics to the terminal
- Live reload via a Server-Sent-Events endpoint (`/__mere-dev-reload`), injected into served HTML responses only — never written to the file on disk
- Auto-opens the default browser to the given file (or directory root)

### What changed
| File | Role |
|------|------|
| `src/cli/dev.ts` | Server, file watcher, reload-script injection, `mere check` integration |
| `src/cli/index.ts` | Wired `dev` case into the command switch; added to `HELP` text |

### Constraint
The reload script is injected at serve time only — the artifact on disk is untouched. This preserves "the file is the app": nothing about `mere dev` becomes part of what you'd `mere pack` or ship.

---

## Shipped — `mere diff`

### What it is
A structural diff between two workbook versions — not a text diff. Compares theme/layout, and named screens/state/computed/actions, reporting `+ added`, `- removed`, `~ changed` per name.

### What changed
| File | Role |
|------|------|
| `src/cli/diff.ts` | `extract()` reads named screens/state/computed/actions out of a workbook via `node-html-parser` (independent of the browser-only `parseWorkbook`, same pattern `inspect.ts` already uses); `diffMap()` reconciles two name→signature maps |
| `src/cli/index.ts` | Wired `diff` case into the command switch; added to `HELP` text |

### Confirmed working
```
$ mere diff examples/books.mp.html examples/habits.mp.html
~ theme: notion-paper → brutalist
- screen: library
+ screen: today
- state: books
+ state: habits
...
```
Exit 0 = structurally identical, exit 1 = differences found (scriptable).

### Constraint
No sub-diff of action statement bodies or per-field state changes beyond a single `~ changed` marker — matches the "simpler, no AST" scope called out below. `recall diff` does full AST-level diffing including against git revisions; Mere's version compares normalised markup/attribute signatures per named node, which was enough to catch a hand-edited heading in testing (see `mere validate` below) without needing a real AST diff.

---

## Shipped — `mere validate`

### What it is
Given a packed `.packed.mp.html` file, extract the source embedded in it at pack time, confirm that source still passes `mere check`, and confirm the packed file's actual workbook body still structurally matches what packing that embedded source would produce. A tamper/drift check, not an authorship check.

### What changed
| File | Role |
|------|------|
| `src/cli/pack.ts` | Now embeds the pre-pack source, base64-encoded, in a `<script type="application/mere-source" id="mere-original-source">` tag — added unconditionally, no new flag |
| `src/cli/validate.ts` | Extracts and decodes that tag, writes it to a temp file, runs `checkFile` on it, then reuses `diffFiles` (from `diff.ts`) between the decoded original and the packed file itself |
| `src/cli/index.ts` | Wired `validate` case into the command switch; added to `HELP` text |

### Confirmed working (tested directly)
- Packed a workbook, ran `mere validate` on it clean → `✓ matches its embedded source, no drift detected`, exit 0
- Hand-edited the packed file's visible heading text, re-ran `mere validate` → correctly reported `~ screen: ...` for every screen touched, exit 1

### Why it matters
`mere-store`'s `CONCEPT.md` lists "author verification" as an open question (GitHub OAuth? ORCID? domain ownership? none?). `mere validate` sidesteps that question rather than answering it: instead of verifying *who* submitted a package, it verifies the *artifact hasn't changed* since it was packed/approved. That's a smaller, more honest claim, and — as shipped — the file format backs it up unassisted, no third-party identity provider needed.

### Precedent, and where this version stops short
`recall validate` re-fetches a *deployed* HTML page (i.e. checks a live URL against what was compiled) and reports specific diagnostic codes (VALID-001/002/003). This version only validates a **local file** — no URL fetch yet, and no connection to the store's approval record (it proves internal consistency: "this file matches its own embedded provenance," not "this file matches what the store actually approved"). Wiring `mere validate <url>` up to `mere-store`'s API, and to the full authorship/`CREATED-BY` audit division described in `docs/recall-cal-complement.md`, is follow-on work — deliberately out of scope here.

---

## Gap, not a bug — the `?` intent sigil is parsed but not connected to anything

### Current state
`?` has been part of the sigil grammar since v0.1 (`<screen ?"Show inbox">`), documented in the README and spec as "AI compositor annotation. Ignored at runtime." That's accurate — it's inert. The v0.2 roadmap named "intent expansion (AI compositor)" as the headline v0.2 feature; every *other* v0.2 item shipped (record-list, nav params, charts, computed depth) and this one didn't. It's not broken, it was just never picked up.

### Why this isn't a cold start
`@semanticintent/recall-compiler` already built the same feature for a sibling problem: `WITH INTENT "..."` clauses, expanded by `recall expand` into validated `.rcl` source. That's a working reference implementation of "take a plain-language intent annotation and produce valid, checked source in the same target language" — the exact shape Mere's `?` sigil needs. Worth reading RECALL's `expand` implementation and diagnostic-feedback loop before designing Mere's from scratch.

### Open questions before scoping further (carried over from `roadmap.md`)
1. What makes a valid intent string — free text, or a constrained grammar?
2. What does the compositor do with an ambiguous intent — refuse, guess, or ask?
3. Does expansion happen once (author-time, output replaces the `?` sigil with real markup) or every render (compositor call at runtime — almost certainly wrong, violates "no server, works offline forever")? RECALL's model — expand once, at author time, into checked source — is very likely the right one for Mere too, for the same reason.
