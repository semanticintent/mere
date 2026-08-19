// ─── Travelling state: serialize the workbook back into itself ───────────────
//
// `persist` keeps state in OPFS, which is origin-scoped: the file travels but
// the data does not. `travel` closes that gap by writing state back into the
// <value> attributes of the workbook's own source, so the data IS the document.
//
// The output stays readable and diffable — named attributes in the file, not an
// opaque blob appended to it. That is the whole reason to do it this way.

import type { StateDecl } from './types.js';

export type SaveTier = 'file-system-access' | 'download';

export interface SaveResult {
  tier: SaveTier;
  bytes: number;
  cancelled: boolean;
}

// ─── Source snapshot ─────────────────────────────────────────────────────────

let sourceSnapshot: string | null = null;

/**
 * Capture the document as authored, before the runtime renders into it.
 * Must be called at bootstrap: once screens are rendered, the live DOM no
 * longer resembles the file, and fetching location.href does not work from
 * file:// where most workbooks are opened.
 */
export function captureSource(): void {
  if (sourceSnapshot !== null) return;
  const doctype = document.doctype ? '<!DOCTYPE html>\n' : '';
  sourceSnapshot = doctype + document.documentElement.outerHTML;
}

export function hasSource(): boolean {
  return sourceSnapshot !== null;
}

// ─── Serialization ───────────────────────────────────────────────────────────

/** Render a live state value into the string form `value=` expects. */
export function serializeValue(value: unknown, type: string): string {
  if (value === undefined || value === null) return '';
  if (type === 'list' || type === 'record-list' || type === 'map') {
    return JSON.stringify(value);
  }
  if (type === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/**
 * Produce the file's new contents: the captured source with every `travel`
 * value's `value=` attribute replaced by its current state.
 *
 * Works on a parsed copy rather than by string substitution — a regex over
 * markup would corrupt any value containing quotes or angle brackets, which
 * is exactly the data most worth saving.
 */
function buildDocument(state: StateDecl[], read: (name: string) => unknown): Document {
  if (sourceSnapshot === null) {
    throw new Error('[mere] save: no source snapshot — captureSource() was not called at bootstrap');
  }

  const doc = new DOMParser().parseFromString(sourceSnapshot, 'text/html');
  const stateEl = doc.querySelector('workbook > state');
  if (!stateEl) throw new Error('[mere] save: workbook has no <state> block to write into');

  for (const decl of state) {
    if (!decl.travel) continue;
    const valueEl = stateEl.querySelector(`:scope > value[name="${CSS.escape(decl.name)}"]`);
    if (!valueEl) continue;
    valueEl.setAttribute('value', serializeValue(read(decl.name), decl.type));
  }
  return doc;
}

/**
 * Make the saved file stand on its own.
 *
 * A workbook served from a site references the runtime by path
 * (`src="/mere-runtime.js"`). Saved and reopened from a downloads folder that
 * resolves to `file:///mere-runtime.js`, which does not exist — the runtime
 * never loads and the file renders as raw markup. A workbook that only works
 * on the server it came from is not a workbook that travels.
 *
 * Every external script is dropped and the runtime is embedded instead. That
 * also removes anything the *host* injected rather than the author — a
 * Cloudflare analytics beacon was being baked into saved files, which would
 * have made a supposedly offline, nothing-leaves-your-machine artifact phone
 * home the moment someone opened it.
 */
async function selfContain(doc: Document): Promise<void> {
  const externals = [...doc.querySelectorAll('script[src]')];
  const runtimeTag = externals.find(el => /mere-runtime/i.test(el.getAttribute('src') ?? ''));

  let runtimeSource: string | null = null;
  if (runtimeTag) {
    const src = runtimeTag.getAttribute('src') ?? '';
    try {
      const res = await fetch(new URL(src, location.href).href);
      if (res.ok) runtimeSource = await res.text();
    } catch {
      // file:// blocks fetch, and the page may be offline. Handled below.
    }
  }

  for (const el of externals) el.remove();

  const head = doc.head ?? doc.documentElement;
  if (runtimeSource) {
    const inline = doc.createElement('script');
    inline.textContent = runtimeSource;
    head.appendChild(inline);
  } else if (runtimeTag) {
    // Could not read the runtime — keep the reference, but make it absolute so
    // it at least resolves from wherever the saved file is opened.
    const absolute = new URL(runtimeTag.getAttribute('src') ?? '', location.href).href;
    const tag = doc.createElement('script');
    tag.setAttribute('src', absolute);
    head.appendChild(tag);
    console.warn('[mere] save: could not inline the runtime; the saved file will need network access to open.');
  }
}

export async function serializeWorkbook(
  state: StateDecl[],
  read: (name: string) => unknown,
): Promise<string> {
  const doc = buildDocument(state, read);
  await selfContain(doc);
  const doctype = doc.doctype ? '<!DOCTYPE html>\n' : '';
  return doctype + doc.documentElement.outerHTML;
}

// ─── Save tiers ──────────────────────────────────────────────────────────────

/**
 * Which save path this browser can offer.
 *
 * Tier 1 (File System Access) opens a real save dialog and writes the file the
 * user chooses. Unavailable in Firefox, Safari, and on mobile.
 * Tier 2 downloads a copy — universal, but it lands in the downloads folder
 * rather than replacing the file the workbook was opened from.
 */
export function saveTier(): SaveTier {
  return typeof (globalThis as Record<string, unknown>)['showSaveFilePicker'] === 'function'
    ? 'file-system-access'
    : 'download';
}

/** Exported for tests — pure, so it can be checked without a DOM. */
export function normaliseSaveName(pathname: string): string {
  const path = decodeURIComponent(pathname.split('/').pop() || '');
  const stem = path.replace(/\.mp\.html$/i, '').replace(/\.mp$/i, '').replace(/\.html$/i, '');
  // Always normalise to the canonical extension. A host serving clean URLs
  // redirects /x.mp.html to /x.mp, so location.pathname alone would save the
  // file as .mp — the extension this format deliberately avoids, because
  // .mp maps to MPEG audio and Safari then refuses to open it as a document.
  return `${stem || 'workbook'}.mp.html`;
}

function suggestedName(): string {
  return normaliseSaveName(location.pathname);
}

/**
 * Tell the user what actually happened.
 *
 * The two tiers do materially different things — one writes the file, the
 * other leaves a copy in the downloads folder — and a workbook's save button
 * carries the same label for both. Without this, a Tier 2 save looks like it
 * did nothing: the page still shows the old file, so reloading appears to
 * have discarded the work. Reported by the format's own author within minutes
 * of first use, which is about as clear a signal as feedback gets.
 */
function announce(message: string): void {
  const el = document.createElement('div');
  el.classList.add('mp-toast');           // styled by every theme already
  el.setAttribute('role', 'status');
  el.textContent = message;               // text only — never markup
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

export async function saveWorkbook(
  state: StateDecl[],
  read: (name: string) => unknown,
): Promise<SaveResult> {
  const contents = await serializeWorkbook(state, read);
  const bytes = new Blob([contents]).size;

  if (saveTier() === 'file-system-access') {
    try {
      const picker = (globalThis as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<{
          createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
        }>;
      }).showSaveFilePicker;

      const handle = await picker({
        suggestedName: suggestedName(),
        types: [{ description: 'Mere workbook', accept: { 'text/html': ['.mp.html'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      announce('Saved.');
      return { tier: 'file-system-access', bytes, cancelled: false };
    } catch (err) {
      // The user dismissing the dialog is a cancellation, not a failure —
      // silently downloading a copy instead would be the wrong thing to do.
      if (err && (err as { name?: string }).name === 'AbortError') {
        return { tier: 'file-system-access', bytes, cancelled: true };
      }
      // Anything else (permission denied, unsupported on this origin) falls
      // through to the universal path rather than losing the user's work.
      console.warn('[mere] save: file picker unavailable, downloading a copy instead', err);
    }
  }

  const url = URL.createObjectURL(new Blob([contents], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  announce('Downloaded an updated copy — open that file to see your changes. This page still shows the original.');
  return { tier: 'download', bytes, cancelled: false };
}
