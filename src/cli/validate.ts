import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse } from 'node-html-parser';
import { checkFile } from './check.js';
import { formatDiagnostic } from './diagnostics.js';
import { diffFiles } from './diff.js';

function extractEmbeddedSource(packedFile: string): string | null {
  const html = readFileSync(packedFile, 'utf8');
  const root = parse(html, { comment: false });
  const tag = root.querySelector('#mere-original-source')
    ?? root.querySelector('script[type="application/mere-source"]');
  if (!tag) return null;
  try {
    return Buffer.from(tag.textContent.trim(), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export function runValidateCommand(args: string[]): void {
  const files = args.filter(a => !a.startsWith('--'));
  if (files.length !== 1) {
    console.error('Usage: mere validate <packed.mp.html>');
    console.error('(only local files are supported today — no URL fetch yet)');
    process.exit(1);
  }

  const packedFile = files[0];
  const useColor = process.stdout.isTTY;
  const originalSource = extractEmbeddedSource(packedFile);

  if (originalSource === null) {
    console.error(`✘ ${packedFile} — no embedded source found (was this packed with "mere pack"?)`);
    process.exit(1);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'mere-validate-'));
  const tmpFile = join(tmpDir, 'original.mp.html');
  writeFileSync(tmpFile, originalSource, 'utf8');

  try {
    // 1. The embedded source itself should still be valid Mere.
    const diags = checkFile(tmpFile);
    const errors = diags.filter(d => d.severity === 'error');
    if (errors.length > 0) {
      console.log(`✘ embedded source fails mere check (${errors.length} error(s)):\n`);
      for (const d of errors) console.log(formatDiagnostic(d, useColor));
      process.exit(1);
    }

    // 2. The packed file's visible workbook body must match what packing
    // the embedded source would produce — proves the workbook wasn't
    // hand-edited after packing. Runtime/banner differences are expected
    // and ignored (diffFiles only looks inside <workbook>).
    const { lines, changed } = diffFiles(tmpFile, packedFile);

    if (!changed) {
      console.log(`✓ ${packedFile} — matches its embedded source, no drift detected`);
      process.exit(0);
    }

    console.log(`✘ ${packedFile} — workbook content has drifted from its embedded source:\n`);
    for (const line of lines) console.log(line);
    console.log(`\nThis proves the artifact changed since it was packed — not who changed it.`);
    process.exit(1);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
