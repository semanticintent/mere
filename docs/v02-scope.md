# Mere v0.2 — Format Evolution Scope

**Status:** Scoped, not yet implemented
**Builds on:** v0.1 complete (M1–M4, all diagnostic codes, CLI, three themes)

---

## Overview

Four features that push the ceiling of what a single `.mp.html` file can express — without adding a server, breaking the self-contained constraint, or inflating the runtime past 50KB gzipped.

Each is independent and can ship in any order.

---

## Feature 1 — Object lists as first-class state

### What it is
State of type `list` already exists and `add-to` / `remove-from` already work. The gap: list items are untyped `Record<string, unknown>` bags — no declared shape, no validation, no authoring guidance. An author must know the field names by convention.

Introduce a `record` state type with a declared schema:

```xml
<state>
  <value name="transactions" type="record-list" persist>
    <field name="date"     type="text" />
    <field name="amount"   type="number" />
    <field name="category" type="text" default="uncategorised" />
    <field name="note"     type="text" />
  </value>
</state>
```

### What changes

| Layer | Change |
|-------|--------|
| `types.ts` | Add `FieldDecl` interface. Add `'record-list'` to `StateType`. Add `fields?: FieldDecl[]` to `StateDecl`. |
| `parser.ts` | Parse `<field>` children inside a `<value type="record-list">`. |
| `state.ts` | On `add-to`, validate/coerce fields against schema. Default missing fields from declaration. |
| `check.ts` | New diagnostic **MPD-009** — `add-to` references field not declared in record schema. |
| `spec.md` | Document `record-list` type and `<field>` child syntax. |

### What it unlocks
- Computed `sum`, `avg`, `group-by` become reliable — fields are typed
- CLI can validate `add-to` field names at author time, not runtime
- AI generation improves — LLM can see the schema and produce correct `add-to` calls

### Constraint
No breaking change to existing `list` type. `record-list` is additive.

---

## Feature 2 — Screen navigation with parameters

### What it is
`go-to` today is `go-to screen-name` — a plain jump, no data passed. Screens are tabs. To show a detail view for a selected item, authors must first `set selected-item` then `go-to detail-screen` as two separate statements. The selected item lives in global state, not in the navigation.

Extend `go-to` to carry a parameter binding:

```xml
<!-- In an action -->
go-to deal-detail with deal = @item.id
```

```xml
<!-- deal-detail screen receives it -->
<screen name="deal-detail" takes="deal">
  <heading @deals where="id = deal" field="name" />
</screen>
```

### What changes

| Layer | Change |
|-------|--------|
| `types.ts` | Extend `go-to` statement: add optional `params?: Array<{ key: string; value: string }>`. Add `takes?: string[]` to `ScreenDecl`. |
| `parser.ts` | Parse `go-to screen with key = value` syntax. Parse `takes="..."` attr on `<screen>`. |
| `state.ts` | `invokeAction` passes param values to `onGoTo` callback. |
| `index.ts` | `goTo(screen, params?)` injects params into a transient render context for the screen. |
| `renderer.ts` | Screen render context carries nav params so `@deal` resolves inside the screen. |
| `check.ts` | New diagnostic **MPD-010** — `go-to` passes param not declared in target screen's `takes`. |
| `spec.md` | Document `with` keyword, `takes` attribute, param scoping rules. |

### What it unlocks
- Master/detail patterns without polluting global state
- List → item → back navigation feels native
- Screens become reusable: same screen, different param = different record shown

### Constraint
Params are transient — they live only for the duration of that screen visit. They are not persisted. Navigation history is not tracked (no back stack in v0.2).

---

## Feature 3 — Declarative `<chart>` element

### What it is
A new semantic element bound to a list state value. No D3, no Chart.js — rendered as inline SVG by the runtime. Self-contained, no external dependency, file stays under 50KB gzipped.

```xml
<chart type="bar" from="expenses" field="amount" label="category" />
<chart type="line" from="daily-weight" field="value" label="date" />
<chart type="pie" from="budget-categories" field="spent" label="name" />
```

### What changes

| Layer | Change |
|-------|--------|
| `registry.ts` | Add `chart` to REGISTRY — leaf element, no children, allowed sigils: `@`. |
| `types.ts` | No type changes — chart is a pure element, no new state semantics. |
| `elements.ts` | Add `chart` RenderFn. Reads `type`, `from`, `field`, `label` attrs. Queries store for list. Renders inline SVG. Subscribes to source list — re-renders on change. |
| `check.ts` | New diagnostic **MPD-011** — `from` references non-list state. **MPD-012** — `field` not a known numeric field (if `record-list` schema exists). |
| `spec.md` | Document `<chart>` element, three types, attrs. |

### SVG rendering approach
- `bar` — horizontal or vertical bars, normalised to container width, themed via CSS custom properties
- `line` — polyline, points normalised to container, no axes (sparkline style for v0.2)
- `pie` — SVG path arcs, labelled with `label` field

All three use `var(--accent)` and theme palette so they inherit the workbook theme automatically. Target: ~200 lines of SVG math, no dependencies.

### Constraint
Charts are read-only. No interactivity (tooltips, click-to-filter) in v0.2 — that's v0.3. Keep the SVG renderer under 5KB gzipped.

---

## Feature 4 — Computed depth: aggregates over time and grouping

### What it is
Computed today handles `count`, `sum`, `avg`, `subtract`, `add`, `percent`, `percent-of`, `sum-product` — all over a flat list with an optional `where` filter. The gap: no temporal ops, no `group-by`, no running totals.

Extend `ComputedDecl` with new operations:

```xml
<computed>
  <!-- running streak: consecutive days with done = true -->
  <value name="current-streak" from="habit-log" op="streak" field="done" by="date" />

  <!-- group-by: produces a list of { key, count/sum } — feeds a chart -->
  <value name="spend-by-category" from="transactions" op="group-by" field="amount" by="category" />

  <!-- rolling average: last N items -->
  <value name="avg-7d" from="daily-weight" op="avg" field="value" window="7" />
</computed>
```

### What changes

| Layer | Change |
|-------|--------|
| `types.ts` | Add `'streak' \| 'group-by' \| 'min' \| 'max'` to `ComputedDecl.op`. Add `window?: number` to `ComputedDecl` for rolling window. |
| `parser.ts` | Parse `window` attribute on `<value>` inside `<computed>`. |
| `state.ts` | `evalComputed` handles new ops: `group-by` returns `Array<{ key, value }>`, `streak` counts consecutive truthy records, `min`/`max` scan field values, `avg` with `window` limits to last N items. |
| `check.ts` | New diagnostic **MPD-013** — `streak` op used without `by` date field. |
| `spec.md` | Document new ops, `window` attr, `group-by` output shape (feeds `<chart>`). |

### The `group-by` + `<chart>` pairing
`group-by` output is itself a list — it feeds directly into `<chart from="spend-by-category" field="value" label="key" />`. This is the primary use case: one computed produces a grouped summary, one chart renders it. Together they make a real analytics view without any code.

### Constraint
`streak` assumes items are sorted by `by` field descending (newest first) — consistent with `add-to` append order. Document this assumption explicitly.

---

## Sizing estimate

| Feature | Runtime lines | Parser lines | Types lines | Check lines |
|---------|--------------|-------------|-------------|-------------|
| Object lists | ~40 | ~30 | ~15 | ~20 |
| Screen params | ~60 | ~40 | ~10 | ~15 |
| Chart element | ~220 | ~5 | ~0 | ~20 |
| Computed depth | ~80 | ~15 | ~10 | ~15 |
| **Total** | **~400** | **~90** | **~35** | **~70** |

Estimated bundle size increase: ~4–6KB gzipped (mostly the SVG chart renderer).
Runtime stays well under 50KB gzipped.

---

## Suggested ship order

1. **Object lists** — foundational, unblocks everything else (schema-aware computed, chart validation)
2. **Computed depth** — builds on typed lists, enables `group-by` for charts
3. **Chart element** — consuming the `group-by` output is the payoff moment
4. **Screen params** — independent, can ship any time, biggest UX jump

---

## Diagnostic code register (v0.2 additions)

| Code | Severity | Description |
|------|----------|-------------|
| MPD-009 | error | `add-to` field not declared in `record-list` schema |
| MPD-010 | error | `go-to` param not declared in target screen's `takes` |
| MPD-011 | error | `<chart from="...">` references non-list state |
| MPD-012 | warning | `<chart field="...">` not a known numeric field in schema |
| MPD-013 | error | `streak` op missing required `by` field |
