// ─── Mere diagnostic system ───────────────────────────────────────────────────
//
// 8 stable codes, stable forever. Every error has a code, category, message,
// source location, and a caret string pointing at the exact problem.

export type DiagnosticCategory =
  | 'structural'
  | 'unknown-element'
  | 'unknown-identifier'
  | 'syntax'
  | 'type-mismatch';

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  code: string;
  category: DiagnosticCategory;
  severity: Severity;
  message: string;
  file: string;
  line: number;     // 1-based
  column: number;   // 1-based
  sourceLine: string;
  caret: string;
}

// ─── Diagnostic codes ─────────────────────────────────────────────────────────

export const CODES = {
  MPD_001: { code: 'MPD-001', category: 'structural'         as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_002: { code: 'MPD-002', category: 'unknown-element'    as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_003: { code: 'MPD-003', category: 'unknown-identifier' as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_004: { code: 'MPD-004', category: 'syntax'             as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_005: { code: 'MPD-005', category: 'type-mismatch'      as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_006: { code: 'MPD-006', category: 'structural'         as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_007: { code: 'MPD-007', category: 'structural'         as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_008: { code: 'MPD-008', category: 'structural'         as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_009: { code: 'MPD-009', category: 'type-mismatch'      as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_010: { code: 'MPD-010', category: 'unknown-identifier' as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_011: { code: 'MPD-011', category: 'type-mismatch'      as DiagnosticCategory, severity: 'error'   as Severity },
  MPD_012: { code: 'MPD-012', category: 'type-mismatch'      as DiagnosticCategory, severity: 'warning' as Severity },
} as const;

// ─── Location helpers ─────────────────────────────────────────────────────────

export interface SourceLocation {
  line: number;
  column: number;
  sourceLine: string;
}

export function offsetToLocation(source: string, offset: number): SourceLocation {
  const before = source.slice(0, Math.max(0, offset));
  const lines = before.split('\n');
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  const sourceLine = source.split('\n')[line - 1] ?? '';
  return { line, column, sourceLine };
}

export function makeCaret(sourceLine: string, column: number, length: number): string {
  const pad = ' '.repeat(Math.max(0, column - 1));
  const hat = '^'.repeat(Math.max(1, length));
  return pad + hat;
}

// ─── Diagnostic builder ───────────────────────────────────────────────────────

export function makeDiagnostic(
  base: typeof CODES[keyof typeof CODES],
  message: string,
  file: string,
  loc: SourceLocation,
  tokenLength = 1,
): Diagnostic {
  return {
    ...base,
    message,
    file,
    line: loc.line,
    column: loc.column,
    sourceLine: loc.sourceLine,
    caret: makeCaret(loc.sourceLine, loc.column, tokenLength),
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

export function formatDiagnostic(d: Diagnostic, useColor = true): string {
  const c = (s: string, code: string) => useColor ? code + s + RESET : s;

  const loc     = `${d.file}:${d.line}:${d.column}`;
  const sev     = d.severity === 'error'
    ? c('error', RED + BOLD)
    : c('warning', YELLOW + BOLD);
  const code    = c(d.code, CYAN);
  const cat     = c(`[${d.category}]`, DIM);
  const lineNum = String(d.line).padStart(4);
  const sep     = c(' | ', DIM);

  return [
    `${c(loc, BOLD)} ${sev} ${code} ${cat}`,
    `${c(lineNum, DIM)}${sep}${d.sourceLine}`,
    `     ${sep}${c(d.caret, d.severity === 'error' ? RED : YELLOW)}`,
    `  ${d.message}`,
  ].join('\n');
}

export function formatSummary(errors: number, warnings: number, useColor = true): string {
  const c = (s: string, code: string) => useColor ? code + s + RESET : s;
  if (errors === 0 && warnings === 0) return c('✓ No errors', '\x1b[32m\x1b[1m');
  const parts: string[] = [];
  if (errors > 0)   parts.push(c(`${errors} error${errors > 1 ? 's' : ''}`, RED + BOLD));
  if (warnings > 0) parts.push(c(`${warnings} warning${warnings > 1 ? 's' : ''}`, YELLOW + BOLD));
  return parts.join(', ');
}
