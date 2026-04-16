import { parseWorkbook } from './parser.js';
import { Store } from './state.js';
import { renderNode } from './renderer.js';
import classicLight from '../themes/classic-light.css';

// Theme registry — injected as inlined CSS strings
const THEMES: Record<string, string> = {
  'classic-light': classicLight,
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function bootstrap(workbookEl: Element): void {
  // Parse
  const decl = parseWorkbook(workbookEl);

  // Inject theme
  injectTheme(decl.theme);

  // Build store
  const store = new Store();
  store.init(decl);

  // Register actions map on store for invocation
  store.actions = new Map(decl.actions.map(a => [a.name, a]));

  // Build screen map
  const screenMap = new Map(decl.screens.map(s => [s.name, s]));

  // Navigation state
  let currentScreenEl: HTMLElement | null = null;
  let currentScreenName = decl.screens[0]?.name ?? '';

  // Create workbook host div
  const host = document.createElement('div');
  host.classList.add('mp-workbook');
  workbookEl.replaceWith(host);

  function goTo(screenName: string): void {
    const screen = screenMap.get(screenName);
    if (!screen) {
      console.warn(`[mere] Unknown screen: ${screenName}`);
      return;
    }
    if (currentScreenEl) currentScreenEl.remove();
    currentScreenName = screenName;
    const el = renderNode(screen.root, store, {}, goTo);
    host.appendChild(el);
    currentScreenEl = el;
  }

  // Navigate to first screen
  if (decl.screens.length > 0) {
    goTo(currentScreenName);
  } else {
    console.warn('[mere] No screens found in workbook.');
  }

  console.log(`[mere] Workbook loaded. Theme: ${decl.theme}. Screens: ${[...screenMap.keys()].join(', ')}`);

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
