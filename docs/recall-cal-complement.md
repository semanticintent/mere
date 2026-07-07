# Mere as the interactive complement to RECALL + CAL

**Status:** concept — not yet scoped for implementation. Revisit after the v0.3 CLI/trust-model work (`docs/v03-scope.md`) ships. Written 2026-07-07 after a first architectural comparison across `mere`, `recall-compiler`, and `cal-runtime`.

---

## Three tiers, one philosophy

Three sovereign-file projects, no shared code, but the same DNA — no server dependency at runtime, self-contained artifacts, no account required:

| Layer | Project | What it is | Runtime |
|-------|---------|-------------|---------|
| Truth-telling | RECALL (`recall-compiler`) | COBOL-inspired publishing language. Compiles `.rcl` source to one static HTML file. Authorship is a type constraint; the compiled source is embedded in the artifact so provenance is always checkable. | None — zero client JS by design |
| Methodology | CAL (`cal-runtime`) | Cascade Analysis Language. Models how failure/success propagates across 6 dimensions (`FORAGE → DRIFT → FETCH → CHIRP`). | Node only, at generation time — never in a browser |
| Living layer | Mere | Workbook format. Declared state, two-way bindings, computed values, actions, persistence. | Fully client-side, interactive, local-first |

RECALL and CAL together produce the StratIQX 6D case studies: a brief JSON is run through CAL's methodology, transposed into `.rcl` source, compiled by RECALL (with the `stratiqx-recall-components` plugin) into a static page, deployed to Cloudflare KV. Verified directly against a live published case (`uc-224/index.html`): **zero `<script>` tags, zero interactivity, across all 250+ published cases.** That's not an oversight — it's what RECALL is for. But it leaves one thing structurally impossible: a reader cannot check the math.

---

## The core gap: readers can't check your work

A case study asserts something like:

```
FETCH = Chirp × |DRIFT| × Confidence = 2,692
DRIFT = METHODOLOGY (85) − PERFORMANCE (35)
```

The reader has no way to change an assumption — a different `PERFORMANCE`, a different `THRESHOLD`, a different `Confidence` — and watch the conclusion move. RECALL's own pitch is "the source is the artifact" — but that's *static*-auditable: you can see the `.rcl` that produced the page, not interrogate the model that produced the number.

This is exactly what Mere is for. Not narrative, not publishing — a **bindable form with the calculation logic reproduced**, so the reader plays with the actual numbers instead of trusting the narrative.

---

## The concrete shape

The same `CaseBrief` JSON that `buildRcl()` (in `semantic-cal-workflow-mcp/src/tools/generate-case-html.ts`) mechanically transposes into `.rcl` source could have a sibling `buildMere()` transposing it into a companion `.mp.html`:

```html
<state>
  <value name="methodology" type="number" value="85" />
  <value name="performance" type="number" value="35" />
  <value name="chirp"       type="number" value="1" />
  <value name="confidence"  type="number" value="0.79" />
  <value name="threshold"   type="number" value="1000" />
</state>

<computed>
  <value name="drift" from="methodology, performance" op="subtract" />
  <value name="fetch" from="chirp, drift, confidence" op="???" />  <!-- needs a multiply op, see below -->
</computed>

<screen name="home">
  <heading>Recompute this cascade</heading>
  <field ~methodology placeholder="Methodology score" />
  <field ~performance placeholder="Performance score" />
  <field ~confidence  placeholder="Confidence (0–1)" />
  <badge @fetch></badge>
  <paragraph>Threshold: @threshold — @fetch exceeds it: {comparison}</paragraph>
</screen>
```

Same brief, second renderer, near-zero marginal authoring cost — this is the same pattern RECALL already uses (one brief, mechanically emitted into a target format), just with Mere as a second target alongside HTML.

### Two concrete primitives Mere is missing for this

Checked `src/runtime/state.ts` directly — the current computed ops are `count`, `sum`, `avg`, `min`, `max`, `subtract`, `add`, `percent`, `percent-of`, `sum-product`, `group-by`, `streak`, plus rolling-window `avg`. Two gaps block the FETCH formula specifically:

- **`abs`** — no absolute-value op exists. `DRIFT` in CAL is a signed gap; `FETCH` needs `|DRIFT|`.
- **A plain scalar `multiply`** (or `product` over N named scalars) — `sum-product` multiplies pairs *within a list*, not three independent named state values (`chirp × drift × confidence`).

Both are small, generic additions — not case-study-specific — and would be useful independent of this concept.

---

## Borrow the audit/provenance pattern, don't reinvent it

Mere's own `roadmap.md` already lists "audit / provenance divisions" as v0.3, independently converging on something RECALL already shipped: an `AUDIT DIVISION` with a type-constrained `CREATED-BY` (`Human` / `AI compositor` / `AI agent`), a `CHANGE-LOG`, and the original source embedded in the compiled artifact so `recall validate` can re-fetch a deployed page and prove it hasn't drifted from what was compiled.

Mere should lift this shape directly rather than design it from zero:
- An optional `<audit>` block — `created-by`, `created-date`, `change-log`
- The workbook's own source embedded in packed distributions (it already ships self-contained via `mere pack` — this is one more inclusion, not a new mechanism)
- `mere validate` (scoped in `docs/v03-scope.md`) becomes possible once the source is embedded — re-parse it, re-check it, confirm a downloaded packed file matches what the store approved

This is also a cleaner answer to `mere-store`'s still-open "author verification" question than any OAuth/ORCID scheme: instead of verifying *who* submitted a package, verify the *artifact hasn't changed* since approval. Smaller claim, and the file format can back it up unassisted.

---

## A shared footgun worth a structural fix

The CAL/RECALL team already built tooling (`audit-brief.ts`, an MCP freshness check) around a recurring problem: a running process silently serving a stale build after a sibling package rebuilds. Mere has the identical exposure — `mere-site/vendor/mere-runtime.js` is a **manual copy** of `mere/dist/mere-runtime.js`, kept in sync entirely by discipline ("rebuild mere → copy dist → rebuild mere-site → commit both", per project memory). Worth a one-line hash/version check in `mere-site/build.js` rather than trusting the ritual — same root cause as the problem the CAL/RECALL team already spent tooling on, easier to fix here because there are only two repos in the chain, not four.

---

## What this is not (yet)

This is a concept, not a design doc. Before building the `buildMere()` companion generator for real:
- Needs a decision on where generated companion workbooks are hosted/linked from a case study page (RECALL's output is static — does the companion live in `mere-store`, get inlined via `mere pack` and linked, or something else?)
- Needs the two computed-op primitives above
- Needs the audit/provenance division to exist in Mere first if the trust story matters for this use case
- Should prototype against **one real case study** before generalizing the transposition logic

Deliberately sequenced after the v0.3 CLI work in `docs/v03-scope.md` — fix Mere's own gaps first, then come back to this.
