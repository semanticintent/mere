import { parseWorkbook } from './parser.js';
import { Store } from './state.js';
import { Persist } from './persist.js';
import { renderNode } from './renderer.js';
import type { ASTNode } from './types.js';
import classicLight from '../themes/classic-light.css';
import protonMail from '../themes/proton-mail.css';
import brutalist from '../themes/brutalist.css';

// Theme registry — injected as inlined CSS strings
const THEMES: Record<string, string> = {
  'classic-light': classicLight,
  'proton-mail':   protonMail,
  'brutalist':     brutalist,
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(workbookEl: Element): Promise<void> {
  // Parse
  const decl = parseWorkbook(workbookEl);

  // Inject theme
  injectTheme(decl.theme);

  // Build store
  const store = new Store();
  store.init(decl);
  store.actions = new Map(decl.actions.map(a => [a.name, a]));

  // Init persistence and load saved state before first render
  const hasPersisted = decl.state.some(s => s.persist);
  if (hasPersisted) {
    const persist = new Persist();
    await persist.init();
    await store.loadPersisted(persist);
  }

  // Build screen map
  const screenMap = new Map(decl.screens.map(s => [s.name, s]));

  // Navigation state
  let currentScreenEl: HTMLElement | null = null;
  const firstScreen = decl.screens[0]?.name ?? '';

  // Create workbook host div
  const host = document.createElement('div');
  host.classList.add('mp-workbook');
  if (decl.layout === 'full') host.dataset['layout'] = 'full';
  workbookEl.replaceWith(host);

  // For full layout: build sidebar + main structure
  let renderTarget: HTMLElement = host;
  let sidebarSlot: HTMLElement | null = null;

  if (decl.layout === 'full') {
    const inner = document.createElement('div');
    inner.classList.add('mp-layout-inner');
    host.appendChild(inner);

    sidebarSlot = document.createElement('div');
    sidebarSlot.classList.add('mp-sidebar-slot');
    inner.appendChild(sidebarSlot);

    const main = document.createElement('div');
    main.classList.add('mp-main');
    inner.appendChild(main);
    renderTarget = main;
  }

  function goTo(screenName: string, params?: Record<string, unknown>): void {
    const screen = screenMap.get(screenName);
    if (!screen) {
      console.warn(`[mere] Unknown screen: ${screenName}`);
      return;
    }
    if (currentScreenEl) currentScreenEl.remove();
    const ctx = params ? { ...params } : {};
    const el = renderNode(screen.root, store, ctx, goTo);
    renderTarget.appendChild(el);
    currentScreenEl = el;

    // Update active state on sidebar nav items
    host.querySelectorAll<HTMLElement>('.mp-nav-item[data-target]').forEach(btn => {
      btn.classList.toggle('mp-nav-item--active', btn.dataset['target'] === screenName);
    });
  }

  // Render sidebar after goTo is defined (nav items need goTo wired up)
  if (decl.layout === 'full' && decl.sidebar && sidebarSlot) {
    const sidebarEl = renderNode(decl.sidebar as ASTNode, store, {}, goTo);
    sidebarSlot.appendChild(sidebarEl);
  }

  if (decl.screens.length > 0) {
    goTo(firstScreen);
  } else {
    console.warn('[mere] No screens found in workbook.');
  }

  console.log(`[mere] Loaded. Theme: ${decl.theme}. Screens: ${[...screenMap.keys()].join(', ')}`);

  // Expose store for dev tooling and seed scripts
  (window as unknown as Record<string, unknown>)['__mereStore'] = store;
}

// ─── Theme injection ──────────────────────────────────────────────────────────

function injectTheme(name: string): void {
  const css = THEMES[name];
  if (!css) {
    console.warn(`[mere] Unknown theme: "${name}". Falling back to classic-light.`);
    injectTheme('classic-light');
    return;
  }
  if (document.querySelector(`style[data-mere-theme="${name}"]`)) return;
  const style = document.createElement('style');
  style.dataset['mereTheme'] = name;
  style.textContent = css;
  document.head.appendChild(style);
}

// ─── Auto-bootstrap ───────────────────────────────────────────────────────────

function init(): void {
  const workbookEl = document.querySelector('workbook');
  if (workbookEl) {
    bootstrap(workbookEl);
  } else {
    console.warn('[mere] No <workbook> element found in document.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export { bootstrap };
