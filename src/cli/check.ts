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
  const stateNames    = new Set<string>();
  const computedNames = new Set<string>();
  const actionNames   = new Set<string>();
  const screenNames   = new Set<string>();
  // record-list schemas: listName → Set of declared field names
  const recordSchemas = new Map<string, Set<string>>();

  // Gather state
  workbook.querySelectorAll('state > value').forEach(v => {
    const name = v.getAttribute('name');
    if (!name) return;
    stateNames.add(name);
    if (v.getAttribute('type') === 'record-list') {
      const fieldNames = new Set<string>();
      v.querySelectorAll('field').forEach(f => {
        const fn = f.getAttribute('name');
        if (fn) fieldNames.add(fn);
      });
      if (fieldNames.size > 0) recordSchemas.set(name, fieldNames);
    }
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

  // Gather screens + their takes declarations
  const screenTakes = new Map<string, Set<string>>();
  workbook.querySelectorAll('screen').forEach(s => {
    const name = s.getAttribute('name');
    if (!name) return;
    screenNames.add(name);
    const takesAttr = s.getAttribute('takes') ?? '';
    if (takesAttr.trim()) {
      screenTakes.set(name, new Set(takesAttr.trim().split(/\s+/)));
    }
  });

  const allStateIds = new Set([...stateNames, ...computedNames]);

  // ── MPD-013: computed op missing required attribute ───────────────────────

  const FIELD_REQUIRED = new Set(['sum', 'avg', 'min', 'max', 'streak', 'sum-product', 'group-by']);
  const BY_REQUIRED    = new Set(['group-by', 'sum-product']);

  workbook.querySelectorAll('computed > value').forEach(v => {
    const name  = v.getAttribute('name') ?? '?';
    const op    = v.getAttribute('op');
    if (!op) return;
    const field = v.getAttribute('field');
    const by    = v.getAttribute('by');
    const loc   = nodeLocation(source, v);

    if (FIELD_REQUIRED.has(op) && !field) {
      diagnostics.push(makeDiagnostic(
        CODES.MPD_013,
        `Computed "${name}" with op="${op}" requires a field= attribute.`,
        filePath, loc, op.length,
      ));
    }
    if (BY_REQUIRED.has(op) && !by) {
      diagnostics.push(makeDiagnostic(
        CODES.MPD_013,
        `Computed "${name}" with op="${op}" requires a by= attribute.`,
        filePath, loc, op.length,
      ));
    }
  });

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

  // ── MPD-010: go-to param not declared in target screen's takes ───────────

  workbook.querySelectorAll('actions > action').forEach(action => {
    const body = action.textContent ?? '';
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      const m = line.match(/^go-to\s+(\S+)\s+with\s+(.+)$/);
      if (!m) continue;
      const targetScreen = m[1]!;
      const takes = screenTakes.get(targetScreen);
      if (!takes) continue; // screen has no takes — params silently ignored (not an error)
      // Parse "key = value" pairs to extract key names
      const tokens = m[2]!.match(/"[^"]*"|@[\w.\-]+|\S+/g) ?? [];
      for (let i = 0; i + 2 < tokens.length; i += 3) {
        const key = tokens[i]!;
        if (tokens[i + 1] !== '=') { i -= 2; continue; }
        if (!takes.has(key)) {
          const loc = nodeLocation(source, action);
          diagnostics.push(makeDiagnostic(
            CODES.MPD_010,
            `"${key}" is not declared in screen "${targetScreen}" takes="${[...takes].join(' ')}".`,
            filePath, loc, key.length,
          ));
        }
      }
    }
  });

  // ── MPD-009: add-to field not in record-list schema ───────────────────────

  if (recordSchemas.size > 0) {
    workbook.querySelectorAll('actions > action').forEach(action => {
      const body = action.textContent ?? '';
      for (const rawLine of body.split('\n')) {
        const line = rawLine.trim();
        const m = line.match(/^add-to\s+(\S+)\s+(.+)$/);
        if (!m) continue;
        const listName = m[1]!;
        const schema = recordSchemas.get(listName);
        if (!schema) continue;
        // Extract key names from "key value key value ..." pairs
        const tokens: string[] = [];
        const tokenRe = /"[^"]*"|\S+/g;
        let tm: RegExpExecArray | null;
        while ((tm = tokenRe.exec(m[2]!)) !== null) tokens.push(tm[0]!);
        for (let i = 0; i < tokens.length; i += 2) {
          const key = tokens[i]!;
          if (!key.startsWith('"') && !schema.has(key)) {
            const actionEl = action;
            const loc = nodeLocation(source, actionEl);
            diagnostics.push(makeDiagnostic(
              CODES.MPD_009,
              `Field "${key}" is not declared in the record-list schema for "${listName}". Declared fields: ${[...schema].join(', ')}.`,
              filePath, loc, key.length,
            ));
          }
        }
      }
    });
  }

  // ── Walk all screen elements ───────────────────────────────────────────────

  workbook.querySelectorAll('screen').forEach(screen => {
    const screenName = screen.getAttribute('name') ?? '';
    const navParams  = screenTakes.get(screenName) ?? new Set<string>();
    // Nav params are valid read bindings within their screen
    const screenStateIds = new Set([...allStateIds, ...navParams]);
    walkElement(screen, source, filePath, screenStateIds, computedNames, actionNames, diagnostics);
  });

  // ── MPD-011/012: chart element validation ─────────────────────────────────

  // Build a map of list/record-list state names for chart validation
  const listStateNames = new Set<string>();
  workbook.querySelectorAll('state > value').forEach(v => {
    const type = v.getAttribute('type');
    if (type === 'list' || type === 'record-list') {
      const name = v.getAttribute('name');
      if (name) listStateNames.add(name);
    }
  });

  workbook.querySelectorAll('chart').forEach(chartEl => {
    const from  = chartEl.getAttribute('from') ?? '';
    const field = chartEl.getAttribute('field') ?? '';

    // MPD-011: from must reference a list or record-list state
    if (from && !listStateNames.has(from)) {
      const loc = nodeLocation(source, chartEl);
      diagnostics.push(makeDiagnostic(
        CODES.MPD_011,
        `<chart from="${from}"> — "${from}" is not a list or record-list state value.`,
        filePath, loc, from.length,
      ));
    }

    // MPD-012: field should be a known numeric field in a record-list schema
    if (from && field && recordSchemas.has(from)) {
      const schema = recordSchemas.get(from)!;
      const fieldDecl = [...schema].find(f => f === field);
      if (!fieldDecl) {
        const loc = nodeLocation(source, chartEl);
        diagnostics.push(makeDiagnostic(
          CODES.MPD_012,
          `<chart field="${field}"> — "${field}" is not declared in the record-list schema for "${from}". Declared fields: ${[...schema].join(', ')}.`,
          filePath, loc, field.length,
        ));
      }
    }
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
