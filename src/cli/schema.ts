import { REGISTRY, KNOWN_THEMES } from '../registry.js';

// ─── mere schema ──────────────────────────────────────────────────────────────

export function printSchema(asJson: boolean): void {
  if (asJson) {
    console.log(JSON.stringify(REGISTRY, null, 2));
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
  line('\x1b[1mMere element registry\x1b[0m  — v0.1');
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
  line('');
  line('\x1b[1mThemes\x1b[0m');
  line(KNOWN_THEMES.join('  '));
  line('');
  line('\x1b[2mRun \x1b[0mmere schema --json\x1b[2m for machine-readable output.\x1b[0m');
  line('');
}
