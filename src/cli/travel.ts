import { readFileSync } from 'fs';
import { parse } from 'node-html-parser';
import { STATE_MODIFIERS } from '../registry.js';

// ─── mere check --travel ─────────────────────────────────────────────────────
//
// Prints exactly what leaves the machine when this workbook is sent.
//
// The privacy property of `travel` is only worth anything if it is inspectable.
// Excel's nearest equivalent, Document Inspector, is buried in a menu and
// effectively nobody runs it; this is one flag on the command authors already
// use before publishing.

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const CYAN  = '\x1b[36m';
const YELLOW= '\x1b[33m';
const GREEN = '\x1b[32m';

// A workbook large enough to bounce off a mail server is a workbook that has
// stopped being sendable, which is the entire premise.
const SIZE_WARN_BYTES = 10 * 1024 * 1024;

interface TravelValue {
  name: string;
  type: string;
  modifier: 'travel' | 'persist' | 'transient';
  bytes: number;
  summary: string;
  images: number;
  imagesWithExif: number;
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Heuristic EXIF detection on an embedded image.
 *
 * A JPEG carrying EXIF has an APP1 segment beginning with the ASCII marker
 * "Exif" near the start of the file. Decoding a prefix is enough to find it and
 * avoids materialising multi-megabyte buffers just to answer yes/no.
 */
function hasExif(base64: string): boolean {
  const prefix = base64.slice(0, 8192);
  let buf: Buffer;
  try {
    buf = Buffer.from(prefix, 'base64');
  } catch {
    return false;
  }
  return buf.includes(Buffer.from('Exif'));
}

function inspectValue(raw: string, type: string): Pick<TravelValue, 'summary' | 'images' | 'imagesWithExif'> {
  const dataUrls = [...raw.matchAll(/data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)/g)];
  const images = dataUrls.length;
  const imagesWithExif = dataUrls.filter(m => hasExif(m[1] ?? '')).length;

  let summary: string;
  if (images > 0) {
    summary = `${images} image${images === 1 ? '' : 's'}`;
  } else if (type === 'list' || type === 'record-list') {
    try {
      const parsed: unknown = JSON.parse(raw || '[]');
      const n = Array.isArray(parsed) ? parsed.length : 0;
      summary = `${n} record${n === 1 ? '' : 's'}`;
    } catch {
      summary = 'unparsed list';
    }
  } else if (type === 'map') {
    try {
      const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
      const n = Object.keys(parsed).length;
      summary = `${n} key${n === 1 ? '' : 's'}`;
    } catch {
      summary = 'unparsed map';
    }
  } else {
    summary = raw.length > 32 ? `"${raw.slice(0, 29)}…"` : raw === '' ? '(empty)' : `"${raw}"`;
  }
  return { summary, images, imagesWithExif };
}

export function runTravelReport(filePath: string): number {
  let source: string;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch {
    console.error(`Cannot read file: ${filePath}`);
    return 1;
  }

  const root = parse(source, { comment: false });
  const workbook = root.querySelector('workbook');
  if (!workbook) {
    console.error(`${filePath}: no <workbook> root element found.`);
    return 1;
  }

  const values: TravelValue[] = [];
  workbook.querySelectorAll('state > value').forEach(v => {
    const name = v.getAttribute('name');
    if (!name) return;
    const type = v.getAttribute('type') ?? 'text';
    const raw  = v.getAttribute('value') ?? v.getAttribute('default') ?? '';
    const modifier: TravelValue['modifier'] =
      v.hasAttribute('travel') ? 'travel' : v.hasAttribute('persist') ? 'persist' : 'transient';
    values.push({
      name, type, modifier,
      bytes: Buffer.byteLength(raw, 'utf8'),
      ...inspectValue(raw, type),
    });
  });

  const travelling = values.filter(v => v.modifier === 'travel');
  const staying    = values.filter(v => v.modifier !== 'travel');
  const totalBytes = travelling.reduce((n, v) => n + v.bytes, 0);
  const exifCount  = travelling.reduce((n, v) => n + v.imagesWithExif, 0);

  const nameW = Math.max(12, ...values.map(v => v.name.length));
  const typeW = Math.max(11, ...values.map(v => v.type.length));

  console.log('');
  console.log(`${BOLD}${filePath}${RESET}`);
  console.log('');

  if (travelling.length === 0) {
    console.log(`${DIM}No values are declared ${RESET}travel${DIM} — nothing in this workbook's state leaves the machine when it is sent.${RESET}`);
  } else {
    console.log(`${BOLD}TRAVEL STATE${RESET} ${DIM}(${travelling.length} value${travelling.length === 1 ? '' : 's'}, ${humanBytes(totalBytes)}) — ships with the file${RESET}`);
    for (const v of travelling) {
      const warn = v.imagesWithExif > 0
        ? `  ${YELLOW}⚠ ${v.imagesWithExif} retain${v.imagesWithExif === 1 ? 's' : ''} EXIF metadata${RESET}`
        : '';
      console.log(
        `  ${CYAN}${v.name.padEnd(nameW)}${RESET} ${v.type.padEnd(typeW)} ` +
        `${v.summary.padEnd(18)} ${humanBytes(v.bytes).padStart(9)}${warn}`,
      );
    }
  }

  if (staying.length > 0) {
    console.log('');
    console.log(`${BOLD}NOT SENT${RESET} ${DIM}(transient and persist values stay on this machine)${RESET}`);
    for (const v of staying) {
      console.log(
        `  ${DIM}${v.name.padEnd(nameW)} ${v.type.padEnd(typeW)} ${v.summary.padEnd(18)} ${v.modifier}${RESET}`,
      );
    }
  }

  const notes: string[] = [];
  if (exifCount > 0) {
    notes.push(
      `${YELLOW}⚠ ${exifCount} embedded image${exifCount === 1 ? '' : 's'} still carr${exifCount === 1 ? 'ies' : 'y'} EXIF metadata, which can include GPS coordinates.${RESET}\n` +
      `  Captures made by the camera element are stripped automatically; these were embedded another way.`,
    );
  }
  if (totalBytes > SIZE_WARN_BYTES) {
    notes.push(
      `${YELLOW}⚠ Travel payload is ${humanBytes(totalBytes)}. Most mail servers reject attachments over ~25 MB.${RESET}`,
    );
  }

  console.log('');
  if (notes.length > 0) {
    for (const n of notes) console.log(n);
  } else if (travelling.length > 0) {
    console.log(`${GREEN}✓ Nothing unexpected — ${humanBytes(totalBytes)} of declared state, no metadata warnings.${RESET}`);
  }
  console.log('');

  return exifCount > 0 || totalBytes > SIZE_WARN_BYTES ? 2 : 0;
}

/** Names of the modifiers, for help text — kept in sync via the registry. */
export const MODIFIER_NAMES = STATE_MODIFIERS.map(m => m.modifier).join(', ');
