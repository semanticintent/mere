import {
  REGISTRY, KNOWN_THEMES,
  STATE_TYPES, STATEMENTS, COMPUTED_OPS, DIAGNOSTIC_DOCS,
} from '../registry.js';
import { CODES } from './diagnostics.js';

// ─── Language registry assembly ───────────────────────────────────────────────

/**
 * Join DIAGNOSTIC_DOCS (description + emission status, in registry.ts) with
 * CODES (category + severity, in diagnostics.ts) into one table.
 *
 * These are deliberately two sources: CODES is what the checker emits, and
 * DIAGNOSTIC_DOCS is what the spec publishes. Joining them here — and throwing
 * on any disagreement — means a code can never ship undocumented, and a
 * documented code can never quietly vanish from the implementation.
 */
export function buildDiagnosticTable() {
  const byCode = new Map<string, { code: string; category: string; severity: string }>(
    Object.values(CODES).map(c => [c.code as string, c as { code: string; category: string; severity: string }]),
  );
  const documented = new Set(DIAGNOSTIC_DOCS.map(d => d.code));

  const undocumented = [...byCode.keys()].filter(c => !documented.has(c));
  const orphaned     = [...documented].filter(c => !byCode.has(c));

  if (undocumented.length || orphaned.length) {
    const parts: string[] = [];
    if (undocumented.length) parts.push(`emitted but undocumented: ${undocumented.join(', ')} — add to DIAGNOSTIC_DOCS in src/registry.ts`);
    if (orphaned.length)     parts.push(`documented but not defined: ${orphaned.join(', ')} — remove from DIAGNOSTIC_DOCS or restore in src/cli/diagnostics.ts`);
    throw new Error(`[mere] diagnostic registry out of sync — ${parts.join('; ')}`);
  }

  return DIAGNOSTIC_DOCS.map(doc => {
    const base = byCode.get(doc.code)!;
    return {
      code:        doc.code,
      category:    base.category,
      severity:    base.severity,
      description: doc.description,
      emitted:     doc.emitted,
    };
  });
}

/** The complete machine-readable language surface — what `--json` emits. */
export function buildLanguageRegistry() {
  return {
    elements:    REGISTRY,
    themes:      [...KNOWN_THEMES],
    stateTypes:  STATE_TYPES,
    statements:  STATEMENTS,
    computedOps: COMPUTED_OPS,
    diagnostics: buildDiagnosticTable(),
  };
}

// ─── mere schema ──────────────────────────────────────────────────────────────

export function printSchema(asJson: boolean): void {
  if (asJson) {
    console.log(JSON.stringify(buildLanguageRegistry(), null, 2));
    return;
  }

  const COL = {
    tag:    18,
    sigils: 10,
    attrs:  36,
  };

  const line = (s: string) => console.log(s);
  const pad  = (s: string, n: number) => s.padEnd(n);
  const hr   = '─'.repeat(COL.tag + COL.sigils + COL.attrs + 14);

  line('');
  line('\x1b[1mMere element registry\x1b[0m');
  line(hr);
  line(
    '\x1b[2m' +
    pad('tag', COL.tag) +
    pad('sigils', COL.sigils) +
    pad('passthrough attrs', COL.attrs) +
    'description' +
    '\x1b[0m'
  );
  line(hr);

  for (const el of REGISTRY) {
    const sigils = el.sigils.join(' ') || '—';
    const attrs  = el.attrs.length ? el.attrs.join(', ') : '—';
    line(
      '\x1b[36m' + pad(el.tag, COL.tag) + '\x1b[0m' +
      pad(sigils, COL.sigils) +
      pad(attrs, COL.attrs) +
      '\x1b[2m' + el.description + '\x1b[0m'
    );
  }

  line(hr);
  line(`\x1b[2m${REGISTRY.length} elements\x1b[0m`);

  // ── Language summary ────────────────────────────────────────────────────────

  const diagnostics = buildDiagnosticTable();
  const reserved    = diagnostics.filter(d => !d.emitted);

  line('');
  line('\x1b[1mState types\x1b[0m');
  line(STATE_TYPES.map(t => t.type).join('  '));
  line('');
  line('\x1b[1mAction statements\x1b[0m');
  for (const s of STATEMENTS) line('  ' + s.grammar);
  line('');
  line('\x1b[1mComputed operators\x1b[0m');
  line('  list   ' + COMPUTED_OPS.filter(o => o.source === 'list').map(o => o.op).join('  '));
  line('  pair   ' + COMPUTED_OPS.filter(o => o.source === 'pair').map(o => o.op).join('  '));
  line('');
  line('\x1b[1mDiagnostics\x1b[0m');
  line(`  ${diagnostics.length} codes, ${diagnostics.length - reserved.length} emitted` +
       (reserved.length ? `, ${reserved.length} reserved (${reserved.map(d => d.code).join(', ')})` : ''));
  line('');
  line('\x1b[1mThemes\x1b[0m');
  line(KNOWN_THEMES.join('  '));
  line('');
  line('\x1b[2mRun \x1b[0mmere schema --json\x1b[2m for the full machine-readable language registry.\x1b[0m');
  line('');
}
