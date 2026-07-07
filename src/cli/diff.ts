import { readFileSync } from 'fs';
import { parse, type HTMLElement } from 'node-html-parser';

interface WorkbookShape {
  valid:     boolean
  theme:     string | null
  layout:    string | null
  screens:   Map<string, string>   // name -> normalised inner markup
  state:     Map<string, string>   // name -> "type|default|persist"
  computed:  Map<string, string>   // name -> "op|from|field|by|window"
  actions:   Map<string, string>   // name -> normalised statement text
}

function normalise(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function extract(filePath: string): WorkbookShape {
  const empty: WorkbookShape = {
    valid: false, theme: null, layout: null,
    screens: new Map(), state: new Map(), computed: new Map(), actions: new Map(),
  };

  let source: string;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch {
    return empty;
  }

  const root = parse(source, { comment: false });
  const workbook = root.querySelector('workbook');
  if (!workbook) return empty;

  const shape: WorkbookShape = {
    valid: true,
    theme: workbook.getAttribute('theme') ?? null,
    layout: workbook.getAttribute('layout') ?? null,
    screens: new Map(), state: new Map(), computed: new Map(), actions: new Map(),
  };

  for (const s of workbook.querySelectorAll('screen')) {
    const name = s.getAttribute('name');
    if (name) shape.screens.set(name, normalise(s.innerHTML));
  }

  for (const v of workbook.querySelectorAll('state > value')) {
    const name = v.getAttribute('name');
    if (!name) continue;
    const type = v.getAttribute('type') ?? '';
    const def = v.getAttribute('value') ?? '';
    const persist = v.hasAttribute('persist') ? 'persist' : '';
    shape.state.set(name, [type, def, persist].join('|'));
  }

  for (const c of workbook.querySelectorAll('computed > value')) {
    const name = c.getAttribute('name');
    if (!name) continue;
    const parts = ['op', 'from', 'field', 'by', 'window'].map(a => c.getAttribute(a) ?? '');
    shape.computed.set(name, parts.join('|'));
  }

  for (const a of workbook.querySelectorAll('actions > action')) {
    const name = a.getAttribute('name');
    if (name) shape.actions.set(name, normalise(a.textContent));
  }

  return shape;
}

function diffMap(label: string, a: Map<string, string>, b: Map<string, string>, lines: string[]) {
  const names = new Set([...a.keys(), ...b.keys()]);
  for (const name of [...names].sort()) {
    const inA = a.has(name);
    const inB = b.has(name);
    if (inA && !inB) lines.push(`- ${label}: ${name}`);
    else if (!inA && inB) lines.push(`+ ${label}: ${name}`);
    else if (a.get(name) !== b.get(name)) lines.push(`~ ${label}: ${name}`);
  }
}

export function diffFiles(fileA: string, fileB: string): { lines: string[]; changed: boolean } {
  const a = extract(fileA);
  const b = extract(fileB);
  const lines: string[] = [];

  if (!a.valid || !b.valid) {
    if (!a.valid) lines.push(`✘ ${fileA} — no <workbook> root, cannot diff`);
    if (!b.valid) lines.push(`✘ ${fileB} — no <workbook> root, cannot diff`);
    return { lines, changed: true };
  }

  if (a.theme !== b.theme)   lines.push(`~ theme: ${a.theme ?? '(none)'} → ${b.theme ?? '(none)'}`);
  if (a.layout !== b.layout) lines.push(`~ layout: ${a.layout ?? 'mobile'} → ${b.layout ?? 'mobile'}`);

  diffMap('screen', a.screens, b.screens, lines);
  diffMap('state', a.state, b.state, lines);
  diffMap('computed', a.computed, b.computed, lines);
  diffMap('action', a.actions, b.actions, lines);

  return { lines, changed: lines.length > 0 };
}

export function runDiffCommand(args: string[]): void {
  const files = args.filter(a => !a.startsWith('--'));
  if (files.length !== 2) {
    console.error('Usage: mere diff <old.mp.html> <new.mp.html>');
    process.exit(1);
  }

  const { lines, changed } = diffFiles(files[0], files[1]);

  if (!changed) {
    console.log(`✓ ${files[0]} and ${files[1]} are structurally identical`);
    process.exit(0);
  }

  console.log(`${files[0]} → ${files[1]}\n`);
  for (const line of lines) console.log(line);
  process.exit(1);
}
