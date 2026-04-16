# Mere — Project Instructions

## What this is

Mere is a workbook format for apps. A `.mp` file is a single portable artifact containing screens, state, behavior, theme, and data. Open it — it runs. Send it — it travels. No server, no account, no build step.

The name is the philosophy: a mere is a lake (still, self-contained) and "mere" means *only, just* — it's merely a file. That is enough.

## Key documents

- `docs/concept.md` — what Mere is, who it's for, the six commitments
- `docs/spec.md` — full language specification (sigils, vocabulary, state, actions, diagnostics)
- `docs/roadmap.md` — technology stack, four milestones, open questions

## Principles (do not violate)

1. The file is the app — no server features
2. User owns their data — nothing leaves the workbook by default
3. Restraint over capability — do not expand the vocabulary without explicit approval
4. Readable by human and AI — clarity over cleverness
5. Beautiful by default — themes are personalities, not palette swaps
6. Sovereign, not networked — offline, forever, no permissions required

## Implementation rules

- TypeScript strict mode
- No external dependencies at workbook runtime — the bundle is self-contained
- Native DOM rendering — no React, no Vue, no virtual DOM
- Native web components as the element substrate
- Target: under 50KB gzipped for the runtime core
- Do not add new sigils, elements, or state semantics without asking the author

## CLI commands (target)

```
mere check <file>    validate without running
mere schema          print element registry
mere run <file>      run a workbook
```

## File extension

`.mp` — Mere Package. A self-contained workbook artifact.
