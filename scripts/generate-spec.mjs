#!/usr/bin/env node
/**
 * generate-spec.mjs — publish the language registry into every spec surface.
 *
 * Source of truth: `mere schema --json` (src/registry.ts + src/cli/diagnostics.ts).
 * Targets:
 *   - docs/spec.md                 (markdown tables)
 *   - ../mere-site/src/spec.html   (HTML tables) — only when the sibling repo is checked out
 *
 * Each target carries paired markers:
 *   <!-- BEGIN GENERATED: elements -->  …  <!-- END GENERATED: elements -->
 * Everything between them is overwritten. Everything outside is hand-written prose.
 *
 * Why this exists: docs/spec.md and mere-site/src/spec.html had drifted into a
 * stale subset of the real language (4 of 6 state types, 4 of 7 statements,
 * 0 of 12 computed operators). Because the spec is documentation for the
 * *generator*, that drift degraded the quality of every AI-authored workbook.
 *
 * Run `npm run generate-spec` after any language change; `npm run build` runs it too.
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load the registry through the CLI's own public interface ─────────────────

const registry = JSON.parse(
  execFileSync('node', [resolve(ROOT, 'dist/mere-cli.js'), 'schema', '--json'], { encoding: 'utf8' }),
);

// ── Helpers ──────────────────────────────────────────────────────────────────

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Markdown tables use | as the column separator, so any literal | must escape.
const mdCell = s => String(s).replace(/\|/g, '\\|');

const mdTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `|${headers.map(() => '---').join('|')}|`,
  ...rows.map(r => `| ${r.map(mdCell).join(' | ')} |`),
].join('\n');

const htmlTable = (headers, rows) => [
  '<div class="table-wrap">',
  '  <table>',
  '    <thead>',
  `      <tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`,
  '    </thead>',
  '    <tbody>',
  ...rows.map(r => `      <tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`),
  '    </tbody>',
  '  </table>',
  '</div>',
].join('\n');

const code = (s, html) => (html ? `<code>${esc(s)}</code>` : `\`${s}\``);

// Plain-text cell: escaped for HTML, passed through for markdown.
const txt = (s, html) => (html ? esc(s) : String(s));

// ── Section builders ─────────────────────────────────────────────────────────
// Each returns { headers, rows } so markdown and HTML stay in lockstep.

function elements(html) {
  return {
    headers: ['Element', 'Sigils', 'Passthrough attrs', 'Description'],
    rows: registry.elements.map(el => [
      code(el.tag, html),
      txt(el.sigils.join(' ') || '—', html),
      txt(el.attrs.length ? el.attrs.join(', ') : '—', html),
      txt(el.description, html),
    ]),
  };
}

function stateTypes(html) {
  return {
    headers: ['Type', 'Empty value', 'Description'],
    rows: registry.stateTypes.map(t => [code(t.type, html), code(t.emptyValue, html), txt(t.description, html)]),
  };
}

function statements(html) {
  return {
    headers: ['Statement', 'Grammar', 'Description'],
    rows: registry.statements.map(s => [code(s.keyword, html), code(s.grammar, html), txt(s.description, html)]),
  };
}

function computedOps(html) {
  return {
    headers: ['Operator', 'Source', 'Requires', 'Optional', 'Description'],
    rows: registry.computedOps.map(o => [
      code(o.op, html),
      o.source === 'pair' ? code('from="a,b"', html) : txt('list', html),
      txt(o.requires.length ? o.requires.join(', ') : '—', html),
      txt(o.optional.length ? o.optional.join(', ') : '—', html),
      txt(o.description, html),
    ]),
  };
}

function diagnostics(html) {
  return {
    headers: ['Code', 'Category', 'Severity', 'Description'],
    rows: registry.diagnostics.map(d => [
      code(d.code, html),
      txt(d.category, html),
      txt(d.emitted ? d.severity : `${d.severity} (reserved)`, html),
      txt(d.description, html),
    ]),
  };
}

function themes(html) {
  return {
    headers: ['Theme', 'Character'],
    rows: registry.themes.map(t => [code(t, html), txt(THEME_CHARACTER[t] ?? '—', html)]),
  };
}

// Themes carry a prose character line that has no home in the runtime registry.
const THEME_CHARACTER = {
  'classic-light':  'Neutral baseline. Clean cards, comfortable spacing. The default.',
  'proton-mail':    'Purple accent, underline tabs, 14px base type.',
  'brutalist':      'Zero radius, 3px black borders, inverted header, red accent.',
  'warm-brutalist': 'Parchment and ink, restrained indigo accent, generous radius — brutalist’s warmer sibling.',
};

function themeCards() {
  return [
    '<div class="grid-3" style="margin-top:24px;">',
    ...registry.themes.flatMap(t => [
      '  <div class="card">',
      `    <h3>${esc(t)}</h3>`,
      `    <p>${esc(THEME_CHARACTER[t] ?? '')}</p>`,
      `    <code style="margin-top:12px; display:block; font-size:11px;">theme="${esc(t)}"</code>`,
      '  </div>',
    ]),
    '</div>',
  ].join('\n');
}

const SECTIONS = { elements, stateTypes, statements, computedOps, diagnostics, themes };

// Inline scalars — the hand-maintained counts that drifted three times
// (26 -> 39 -> 40) before this existed. Emitted as bare text inside markers.
const SCALARS = {
  elementCount:    () => String(registry.elements.length),
  diagnosticCount: () => String(registry.diagnostics.length),
  themeCount:      () => String(registry.themes.length),
  // README's inline vocabulary line — backticked tags in registry order.
  elementList:     () => registry.elements.map(e => `\`${e.tag}\``).join(' '),
};

// ── Marker replacement ───────────────────────────────────────────────────────

function fill(source, file, html) {
  let out = source;
  let replaced = 0;

  for (const [name, build] of Object.entries(SECTIONS)) {
    const begin = `<!-- BEGIN GENERATED: ${name} -->`;
    const end   = `<!-- END GENERATED: ${name} -->`;
    const re = new RegExp(`${begin}[\\s\\S]*?${end}`);
    if (!re.test(out)) continue;

    const { headers, rows } = build(html);
    // Themes keep their card layout on the site rather than becoming a table.
    const table = name === 'themes' && html
      ? themeCards()
      : html ? htmlTable(headers, rows) : mdTable(headers, rows);
    out = out.replace(re, `${begin}\n${table}\n${end}`);
    replaced++;
  }

  for (const [name, build] of Object.entries(SCALARS)) {
    const begin = `<!-- BEGIN GENERATED: ${name} -->`;
    const end   = `<!-- END GENERATED: ${name} -->`;
    const re = new RegExp(`${begin}[\\s\\S]*?${end}`);
    if (!re.test(out)) continue;
    out = out.replace(re, `${begin}${build()}${end}`);
    replaced++;
  }

  if (replaced === 0) {
    console.warn(`  ${file}: no generated markers found — nothing written`);
    return null;
  }
  return { out, replaced };
}

function apply(path, label, html) {
  if (!existsSync(path)) {
    console.log(`  ${label}: not found — skipping (expected when the sibling repo isn't checked out)`);
    return;
  }
  const before = readFileSync(path, 'utf8');
  const result = fill(before, label, html);
  if (!result) return;

  if (result.out === before) {
    console.log(`  ${label}: already up to date (${result.replaced} sections)`);
  } else {
    writeFileSync(path, result.out);
    console.log(`  ${label}: wrote ${result.replaced} sections`);
  }
}

console.log('generate-spec: publishing language registry');
console.log(
  `  registry: ${registry.elements.length} elements, ${registry.stateTypes.length} state types, ` +
  `${registry.statements.length} statements, ${registry.computedOps.length} computed ops, ` +
  `${registry.diagnostics.length} diagnostics, ${registry.themes.length} themes`,
);

apply(resolve(ROOT, 'docs/spec.md'), 'docs/spec.md', false);
apply(resolve(ROOT, 'README.md'), 'README.md', false);
apply(resolve(ROOT, '../mere-site/src/spec.html'), '../mere-site/src/spec.html', true);
