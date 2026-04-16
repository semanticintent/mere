import { readFileSync } from 'fs';
import { parse } from 'node-html-parser';
import type { HTMLElement as NHTMLElement } from 'node-html-parser';
import { REGISTRY_MAP, KNOWN_THEMES } from '../registry.js';
import {
  CODES, makeDiagnostic, offsetToLocation,
  type Diagnostic, type SourceLocation,
} from './diagnostics.js';

// ─── Public entry ─────────────────────────────────────────────────────────────

export function checkFile(filePath: string): Diagnostic[] {
  let source: string;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch {
    return [{
      ...CODES.MPD_001,
      message: `Cannot read file: ${filePath}`,
      file: filePath, line: 1, column: 1,
      sourceLine: '', caret: '^',
    }];
  }

  const root = parse(source, { comment: false });
  const diagnostics: Diagnostic[] = [];

  // ── MPD-001: <workbook> root ───────────────────────────────────────────────

  const workbook = root.querySelector('workbook');
  if (!workbook) {
    diagnostics.push(makeDiagnostic(
      CODES.MPD_001,
      'No <workbook> root element found. Every .mp file must have a <workbook> element as its root content.',
      filePath,
      { line: 1, column: 1, sourceLine: source.split('\n')[0] ?? '' },
    ));
    return diagnostics; // cannot continue without root
  }

  // Collect declared identifiers for MPD-003 checks
  const stateNames   = new Set<string>();
  const computedNames = new Set<string>();
  const actionNames  = new Set<string>();
  const screenNames  = new Set<string>();

  // Gather state
  workbook.querySelectorAll('state > value').forEach(v => {
    const name = v.getAttribute('name');
    if (name) stateNames.add(name);
  });

  // Gather computed
  workbook.querySelectorAll('computed > value').forEach(v => {
    const name = v.getAttribute('name');
    if (name) computedNames.add(name);
  });

  // Gather actions
  workbook.querySelectorAll('actions > action').forEach(a => {
    const name = a.getAttribute('name');
    if (name) actionNames.add(name);
  });

  // Gather screens
  workbook.querySelectorAll('screen').forEach(s => {
    const name = s.getAttribute('name');
    if (name) screenNames.add(name);
  });

  const allStateIds = new Set([...stateNames, ...computedNames]);

  // ── MPD-008: circular computed dependency ─────────────────────────────────

  const computedDeps = new Map<string, string>();
  workbook.querySelectorAll('computed > value').forEach(v => {
    const name = v.getAttribute('name');
    const from = v.getAttribute('from');
    if (name && from) computedDeps.set(name, from);
  });
  for (const [name, from] of computedDeps) {
    if (computedDeps.has(from) && computedDeps.get(from) === name) {
      const loc = nodeLocation(source, workbook.querySelector(`computed > value[name="${name}"]`));
      diagnostics.push(makeDiagnostic(
        CODES.MPD_008,
        `Circular computed dependency: "${name}" ← "${from}" ← "${name}".`,
        filePath, loc, name.length,
      ));
    }
  }

  // ── Walk all screen elements ───────────────────────────────────────────────

  workbook.querySelectorAll('screen').forEach(screen => {
    walkElement(screen, source, filePath, allStateIds, computedNames, actionNames, diagnostics);
  });

  return diagnostics;
}

// ─── Element walker ───────────────────────────────────────────────────────────

function walkElement(
  el: NHTMLElement,
  source: string,
  file: string,
  stateIds: Set<string>,
  computedNames: Set<string>,
  actionNames: Set<string>,
  diags: Diagnostic[],
): void {
  const tag = el.tagName?.toLowerCase() ?? '';
  if (!tag || tag === 'screen') {
    // recurse into children
    el.childNodes.forEach(child => {
      if (child.nodeType === 1) walkElement(child as NHTMLElement, source, file, stateIds, computedNames, actionNames, diags);
    });
    return;
  }

  // ── MPD-002: unknown element ───────────────────────────────────────────────

  if (!REGISTRY_MAP.has(tag)) {
    const loc = nodeLocation(source, el);
    diags.push(makeDiagnostic(
      CODES.MPD_002,
      `Unknown element <${tag}>. Not in the Mere element registry.\n  Known elements: ${[...REGISTRY_MAP.keys()].join(', ')}`,
      file, loc, tag.length + 1,
    ));
    // still recurse — catch more errors in children
  }

  // ── Check attributes for sigil issues ─────────────────────────────────────

  const attrs = el.attributes as Record<string, string>;
  const attrEntries = Object.entries(attrs);
  let i = 0;

  while (i < attrEntries.length) {
    const [attrName] = attrEntries[i]!;
    i++;

    // ── MPD-004: malformed sigil ─────────────────────────────────────────────

    if (attrName === '@' || attrName === '~' || attrName === '!') {
      const loc = nodeLocation(source, el);
      diags.push(makeDiagnostic(
        CODES.MPD_004,
        `Malformed sigil "${attrName}" — sigil must be followed immediately by an identifier, e.g. @state-name.`,
        file, loc, attrName.length,
      ));
      continue;
    }

    if (attrName.startsWith('@')) {
      // ── MPD-003: unknown read binding ───────────────────────────────────────
      const statePath = attrName.slice(1).split('.')[0] ?? '';
      if (statePath && statePath !== 'item' && !stateIds.has(statePath)) {
        const loc = nodeLocation(source, el);
        diags.push(makeDiagnostic(
          CODES.MPD_003,
          `"${statePath}" is not declared in <state> or <computed>.`,
          file, loc, attrName.length,
        ));
      }
    } else if (attrName.startsWith('~')) {
      const stateName = attrName.slice(1);

      // ── MPD-003: unknown two-way binding ────────────────────────────────────
      if (stateName && !stateIds.has(stateName)) {
        const loc = nodeLocation(source, el);
        diags.push(makeDiagnostic(
          CODES.MPD_003,
          `"${stateName}" is not declared in <state> or <computed>.`,
          file, loc, attrName.length,
        ));
      }

      // ── MPD-007: two-way bind to computed (read-only) ───────────────────────
      if (stateName && computedNames.has(stateName)) {
        const loc = nodeLocation(source, el);
        diags.push(makeDiagnostic(
          CODES.MPD_007,
          `"${stateName}" is a computed value and is read-only. Use @ for read bindings, or bind to a <state> value instead.`,
          file, loc, attrName.length,
        ));
      }
    } else if (attrName.startsWith('!')) {
      const actionName = attrName.slice(1);

      // ── MPD-003: unknown action ─────────────────────────────────────────────
      if (actionName && !actionNames.has(actionName)) {
        const loc = nodeLocation(source, el);
        diags.push(makeDiagnostic(
          CODES.MPD_003,
          `"${actionName}" is not declared in <actions>.`,
          file, loc, attrName.length,
        ));
      }
    }
  }

  // Recurse
  el.childNodes.forEach(child => {
    if (child.nodeType === 1) walkElement(child as NHTMLElement, source, file, stateIds, computedNames, actionNames, diags);
  });
}

// ─── Location helper ──────────────────────────────────────────────────────────

function nodeLocation(source: string, el: NHTMLElement | null): SourceLocation {
  if (!el) return { line: 1, column: 1, sourceLine: source.split('\n')[0] ?? '' };
  // node-html-parser stores range as [start, end]
  const range = (el as unknown as { range?: [number, number] }).range;
  const offset = range?.[0] ?? 0;
  return offsetToLocation(source, offset);
}
