import { readFileSync } from 'fs';
import { safeImageSrc } from '../src/runtime/safe-url.js';
import { REGISTRY, STATE_TYPES, STATEMENTS, COMPUTED_OPS, DIAGNOSTIC_DOCS } from '../src/registry.js';

// Minimal assertion harness — no test framework, no dependencies.
let failures = 0;
let checks = 0;

function ok(condition: boolean, label: string): void {
  checks++;
  if (condition) return;
  failures++;
  console.error(`  \x1b[31m✘\x1b[0m ${label}`);
}

function group(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ── Security: <img src> allowlist ────────────────────────────────────────────
//
// Guards the avatar element. Before v0.6.0 this interpolated a state value
// straight into an innerHTML string, so a value beginning "http" could close
// the attribute and inject an event handler.

group('safeImageSrc — accepts legitimate sources', () => {
  ok(safeImageSrc('https://example.com/a.png') === 'https://example.com/a.png', 'https URL');
  ok(safeImageSrc('http://example.com/a.png') !== null, 'http URL');
  ok(safeImageSrc('/avatars/me.png') !== null, 'root-relative path');
  ok(safeImageSrc('./me.png') !== null, 'dot-relative path');
  ok(safeImageSrc('data:image/png;base64,iVBORw0KGgo=') !== null, 'data:image URI');
  ok(safeImageSrc('  https://example.com/a.png  ') === 'https://example.com/a.png', 'trims surrounding space');
});

group('safeImageSrc — rejects injection and non-image schemes', () => {
  ok(safeImageSrc('http" onerror="alert(1)') === null, 'attribute break-out (the v0.5 XSS)');
  ok(safeImageSrc('https://x.png"><script>alert(1)</script>') === null, 'tag injection after a valid prefix');
  ok(safeImageSrc('javascript:alert(1)') === null, 'javascript: scheme');
  ok(safeImageSrc('data:text/html,<script>alert(1)</script>') === null, 'data: with a non-image type');
  ok(safeImageSrc('java\nscript:alert(1)') === null, 'newline smuggling');
  ok(safeImageSrc('\u0000https://example.com/a.png') === null, 'NUL prefix');
  ok(safeImageSrc('Michael Shatny') === null, 'a plain name falls through to initials');
});

// ── Registry integrity ───────────────────────────────────────────────────────
//
// The published spec is generated from these tables, so a malformed entry
// would ship silently into docs.mere.fyi.

group('registry — well-formed entries', () => {
  ok(REGISTRY.length > 0, 'elements present');
  ok(REGISTRY.every(e => !!e.tag && !!e.description), 'every element has a tag and description');
  ok(new Set(REGISTRY.map(e => e.tag)).size === REGISTRY.length, 'element tags are unique');
  ok(STATE_TYPES.every(t => !!t.type && !!t.description && !!t.emptyValue), 'state types complete');
  ok(STATEMENTS.every(s => !!s.keyword && !!s.grammar && !!s.description), 'statements complete');
  ok(COMPUTED_OPS.every(o => !!o.op && !!o.description && Array.isArray(o.requires)), 'computed ops complete');
  ok(DIAGNOSTIC_DOCS.every(d => /^MPD-\d{3}$/.test(d.code) && !!d.description), 'diagnostic codes well-formed');
  ok(new Set(DIAGNOSTIC_DOCS.map(d => d.code)).size === DIAGNOSTIC_DOCS.length, 'diagnostic codes are unique');
});

group('registry — codes are never renumbered', () => {
  // MPD codes are a permanent public contract. This asserts the historical
  // prefix is intact; new codes append after it.
  const expected = ['MPD-001','MPD-002','MPD-003','MPD-004','MPD-005','MPD-006','MPD-007','MPD-008','MPD-009','MPD-010','MPD-011','MPD-012','MPD-013','MPD-014','MPD-015'];
  const actual = DIAGNOSTIC_DOCS.map(d => d.code);
  ok(expected.every((c, i) => actual[i] === c), 'MPD-001..014 present, in order, unrenumbered');
});

// ── Runtime invariant: state never reaches the DOM as markup ─────────────────
//
// Every @ binding must render through textContent. This is a security
// invariant, not a style preference: state is untrusted input, so the moment
// one binding is written through innerHTML the whole format has a stored-XSS
// surface. Asserted against the source so a future "just this once" is caught
// in CI rather than in a workbook someone forwarded.

group('runtime — no markup sinks', () => {
  // Bundled to a temp dir before running, so resolve from the repo root
  // (npm scripts always run there) rather than from import.meta.url.
  const src = readFileSync(`${process.cwd()}/src/runtime/elements.ts`, 'utf8');

  // Clearing a container is fine; assigning anything else is not.
  const assignments = [...src.matchAll(/\.innerHTML\s*=\s*([^;]+);/g)].map(m => m[1].trim());
  const nonEmpty = assignments.filter(v => v !== "''" && v !== '""' && v !== '``');
  ok(nonEmpty.length === 0, `innerHTML is only ever cleared (found: ${nonEmpty.join(' | ') || 'none'})`);

  ok(!/\.outerHTML\s*=/.test(src), 'no outerHTML assignment');
  ok(!/insertAdjacentHTML/.test(src), 'no insertAdjacentHTML');
  ok(!/document\.write/.test(src), 'no document.write');

  // The avatar element is the one place a state value reaches an attribute
  // that can execute; it must go through the allowlist.
  ok(/safeImageSrc\(/.test(src), 'image sources go through safeImageSrc');
});

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\x1b[31m${failures} failing\x1b[0m`);
  process.exit(1);
}
console.log('\x1b[32mok\x1b[0m');
