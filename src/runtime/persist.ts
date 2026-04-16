// ─── Mere persistence layer ───────────────────────────────────────────────────
//
// Persists state values marked with `persist` to OPFS (Origin Private File
// System). Falls back to localStorage if OPFS is unavailable (e.g. file://).
//
// Storage layout:
//   OPFS root /
//     mere/
//       <workbook-key>/        ← one dir per workbook URL
//         current-tab.json
//         messages.json
//         ...
//
// The workbook key is a short hash of the page URL (without query/fragment),
// so two different .mp files on the same origin have separate storage.

export class Persist {
  private opfsDir: FileSystemDirectoryHandle | null = null;
  private useOpfs = false;
  private key: string;

  constructor() {
    this.key = workbookKey();
  }

  async init(): Promise<void> {
    if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
      console.info('[mere] OPFS unavailable — using localStorage');
      return;
    }
    try {
      const root = await navigator.storage.getDirectory();
      const base = await root.getDirectoryHandle('mere', { create: true });
      this.opfsDir = await base.getDirectoryHandle(this.key, { create: true });
      this.useOpfs = true;
      console.info('[mere] Persistence: OPFS');
    } catch {
      console.info('[mere] OPFS init failed — using localStorage');
    }
  }

  async load(name: string): Promise<unknown> {
    if (this.useOpfs && this.opfsDir) {
      try {
        const fh = await this.opfsDir.getFileHandle(name + '.json');
        const file = await fh.getFile();
        return JSON.parse(await file.text());
      } catch {
        return undefined; // not yet persisted
      }
    } else {
      const raw = localStorage.getItem(lsKey(this.key, name));
      return raw !== null ? JSON.parse(raw) : undefined;
    }
  }

  async save(name: string, value: unknown): Promise<void> {
    const json = JSON.stringify(value);
    if (this.useOpfs && this.opfsDir) {
      try {
        const fh = await this.opfsDir.getFileHandle(name + '.json', { create: true });
        const writable = await fh.createWritable();
        await writable.write(json);
        await writable.close();
      } catch (e) {
        console.warn(`[mere] OPFS save failed for "${name}":`, e);
        // Degrade to localStorage
        try { localStorage.setItem(lsKey(this.key, name), json); } catch { /* full */ }
      }
    } else {
      try {
        localStorage.setItem(lsKey(this.key, name), json);
      } catch {
        console.warn(`[mere] localStorage full — "${name}" not persisted`);
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function workbookKey(): string {
  // Hash the URL (minus query/fragment) so each workbook gets its own bucket.
  const url = location.href.replace(/[?#].*$/, '');
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  }
  return 'wb-' + Math.abs(h).toString(36);
}

function lsKey(workbook: string, state: string): string {
  return `mere:${workbook}:${state}`;
}
