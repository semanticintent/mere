#!/usr/bin/env node
import { checkFile } from './check.js';
import { printSchema } from './schema.js';
import { runPackCommand } from './pack.js';
import { runInspectCommand } from './inspect.js';
import { runDevCommand } from './dev.js';
import { runDiffCommand } from './diff.js';
import { runValidateCommand } from './validate.js';
import { runTravelReport } from './travel.js';
import { formatDiagnostic, formatSummary } from './diagnostics.js';
import { buildDiagnosticTable } from './schema.js';
import { VERSION } from '../version.js';

// ─── CLI entry point ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

// Rendered from the same registry `mere schema` and the published spec read,
// so help can never drift from the checker the way it did through v0.5.
const DIAGNOSTIC_HELP = buildDiagnosticTable()
  .map(d => {
    const code = d.code.padEnd(9);
    const cat  = (d.emitted ? d.category : d.category + ' (reserved)').padEnd(26);
    return `  ${code}${cat}${d.description}`;
  })
  .join('\n');

const HELP = `
\x1b[1mMere\x1b[0m — a workbook format for apps
\x1b[2mVersion ${VERSION}\x1b[0m

\x1b[1mUsage:\x1b[0m
  mere check <file.mp>    Validate a workbook. Exit 0 = clean, 1 = errors, 2 = warnings only.
  mere check --travel <f> Report exactly what leaves the machine when this file is sent.
  mere inspect <file.mp>  Report screens, state, elements, theme, layout — the quality profile.
  mere pack <file.mp>     Inline the runtime. Produces a fully self-contained .packed.mp.html file.
  mere dev [path]         Serve workbooks locally with check-on-save and live reload.
  mere diff <a> <b>       Structural diff between two workbook versions — screens/state/computed/actions.
  mere validate <packed>  Confirm a packed file's workbook body still matches its embedded source.
  mere schema             Print the language registry as a table.
  mere schema --json      Print the full language registry as JSON.
  mere help               Show this help.

\x1b[1mmere pack options:\x1b[0m
  --out <path>            Output path (default: <name>.packed.mp.html)
  --runtime <path>        Path to mere-runtime.js (default: auto-detected)
  --skip-check            Skip mere check before packing

\x1b[1mmere dev options:\x1b[0m
  --port=<n>               Port to serve on (default: 4321)
  --no-open                Don't open the default browser automatically

\x1b[1mDiagnostic codes:\x1b[0m
${DIAGNOSTIC_HELP}

\x1b[2mFile extension: .mp.html (Mere Package) — .mp also accepted\x1b[0m
`;

switch (command) {
  case 'check': {
    const files = args.slice(1).filter(a => !a.startsWith('--'));
    if (files.length === 0) {
      console.error('Usage: mere check <file.mp> [file.mp ...]');
      process.exit(1);
    }

    // --travel reports what leaves the machine rather than validating syntax
    if (args.includes('--travel')) {
      let worst = 0;
      for (const file of files) worst = Math.max(worst, runTravelReport(file));
      process.exit(worst === 2 ? 2 : 0);
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

  case 'inspect': {
    runInspectCommand(args.slice(1));
    process.exit(0);
  }

  case 'pack': {
    runPackCommand(args.slice(1));
    process.exit(0);
  }

  case 'dev': {
    runDevCommand(args.slice(1));
    break; // long-running — do not process.exit()
  }

  case 'diff': {
    runDiffCommand(args.slice(1));
    break;
  }

  case 'validate': {
    runValidateCommand(args.slice(1));
    break;
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
