#!/usr/bin/env node
import { checkFile } from './check.js';
import { printSchema } from './schema.js';
import { formatDiagnostic, formatSummary } from './diagnostics.js';

// ─── CLI entry point ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

const HELP = `
\x1b[1mMere\x1b[0m — a workbook format for apps
\x1b[2mVersion 0.1.0\x1b[0m

\x1b[1mUsage:\x1b[0m
  mere check <file.mp>    Validate a workbook. Exit 0 = clean, 1 = errors, 2 = warnings only.
  mere schema             Print the element registry as a table.
  mere schema --json      Print the element registry as JSON.
  mere help               Show this help.

\x1b[1mDiagnostic codes:\x1b[0m
  MPD-001  structural        Workbook root element missing or invalid
  MPD-002  unknown-element   Tag not in the element registry
  MPD-003  unknown-id        Sigil references undeclared state or action
  MPD-004  syntax            Malformed sigil attribute
  MPD-005  type-mismatch     Binding to incompatible state type
  MPD-006  structural        Action invoked with wrong number of arguments
  MPD-007  structural        Two-way binding target is read-only (computed value)
  MPD-008  structural        Circular computed value dependency

\x1b[2mFile extension: .mp (Mere Package)\x1b[0m
`;

switch (command) {
  case 'check': {
    const files = args.slice(1).filter(a => !a.startsWith('--'));
    if (files.length === 0) {
      console.error('Usage: mere check <file.mp> [file.mp ...]');
      process.exit(1);
    }

    let totalErrors = 0;
    let totalWarnings = 0;
    const useColor = process.stdout.isTTY;

    for (const file of files) {
      const diags = checkFile(file);
      const errors   = diags.filter(d => d.severity === 'error').length;
      const warnings = diags.filter(d => d.severity === 'warning').length;
      totalErrors   += errors;
      totalWarnings += warnings;

      if (diags.length === 0) {
        const tick = useColor ? '\x1b[32m✓\x1b[0m' : '✓';
        console.log(`${tick} ${file} — no errors`);
      } else {
        console.log('');
        for (const d of diags) {
          console.log(formatDiagnostic(d, useColor));
          console.log('');
        }
        console.log(`${file}: ${formatSummary(errors, warnings, useColor)}`);
        console.log('');
      }
    }

    if (files.length > 1) {
      console.log(formatSummary(totalErrors, totalWarnings, useColor));
    }

    if (totalErrors > 0)   process.exit(1);
    if (totalWarnings > 0) process.exit(2);
    process.exit(0);
  }

  case 'schema': {
    const asJson = args.includes('--json');
    printSchema(asJson);
    process.exit(0);
  }

  case 'help':
  case '--help':
  case '-h':
  case undefined: {
    console.log(HELP);
    process.exit(0);
  }

  default: {
    console.error(`Unknown command: ${command}`);
    console.error('Run "mere help" for usage.');
    process.exit(1);
  }
}
