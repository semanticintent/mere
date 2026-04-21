import type { ASTNode, RenderContext } from './types.js';
import type { Store } from './state.js';
import { resolveRead, bindRead, bindText, bindTwoWay, bindAction, renderChildren } from './renderer.js';

// ─── Element handler type ─────────────────────────────────────────────────────

export type RenderFn = (
  node: ASTNode,
  store: Store,
  context: RenderContext,
  onGoTo: (screen: string, params?: Record<string, unknown>) => void,
  renderChildren: typeof import('./renderer.js').renderChildren,
) => HTMLElement;

export type ElementHandler = RenderFn;

// ─── Helper: create a classed div ─────────────────────────────────────────────

function div(cls: string, ...extra: string[]): HTMLDivElement {
  const el = document.createElement('div');
  el.classList.add('mp-' + cls, ...extra.map(c => 'mp-' + c));
  return el;
}

function span(cls: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.classList.add('mp-' + cls);
  return el;
}

// ─── screen-root ──────────────────────────────────────────────────────────────

const screenRoot: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = div('screen');
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── header ───────────────────────────────────────────────────────────────────

const header: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = document.createElement('header');
  el.classList.add('mp-header');
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── footer ───────────────────────────────────────────────────────────────────

const footer: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = document.createElement('footer');
  el.classList.add('mp-footer');
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── heading ──────────────────────────────────────────────────────────────────

const heading: RenderFn = (node, store, context, onGoTo) => {
  const el = document.createElement('h2');
  el.classList.add('mp-heading');
  if (node.bindings.read) {
    bindRead(el, node.bindings.read, store, context, v => { el.textContent = v; });
  } else {
    bindText(el, node.text, store, context);
  }
  return el;
};

// ─── subtitle ─────────────────────────────────────────────────────────────────

const subtitle: RenderFn = (node, store, context, onGoTo) => {
  const el = span('subtitle');
  if (node.bindings.read) {
    bindRead(el, node.bindings.read, store, context, v => { el.textContent = v; });
  } else {
    bindText(el, node.text, store, context);
  }
  return el;
};

// ─── paragraph ────────────────────────────────────────────────────────────────

const paragraph: RenderFn = (node, store, context, onGoTo) => {
  const el = document.createElement('p');
  el.classList.add('mp-paragraph');
  if (node.bindings.read) {
    bindRead(el, node.bindings.read, store, context, v => { el.textContent = v; });
  } else {
    bindText(el, node.text, store, context);
  }
  return el;
};

// ─── timestamp ────────────────────────────────────────────────────────────────

const timestamp: RenderFn = (node, store, context, onGoTo) => {
  const el = span('timestamp');
  const update = (raw: string) => {
    // Try to format as relative time or locale date
    const d = new Date(raw);
    el.textContent = isNaN(d.getTime()) ? raw : formatRelative(d);
    el.title = raw;
  };
  if (node.bindings.read) {
    bindRead(el, node.bindings.read, store, context, update);
  } else {
    update(node.text);
  }
  return el;
};

// ─── badge ────────────────────────────────────────────────────────────────────

const badge: RenderFn = (node, store, context, onGoTo) => {
  const el = span('badge');
  if (node.bindings.read) {
    bindRead(el, node.bindings.read, store, context, v => {
      el.textContent = v;
      el.style.display = v === '0' || v === '' ? 'none' : '';
    });
  } else {
    el.textContent = node.text;
  }
  return el;
};

// ─── avatar ───────────────────────────────────────────────────────────────────

const avatar: RenderFn = (node, store, context, onGoTo) => {
  const el = div('avatar');
  if (node.bindings.read) {
    bindRead(el, node.bindings.read, store, context, v => {
      if (v.startsWith('http') || v.startsWith('/') || v.startsWith('data:')) {
        el.innerHTML = `<img src="${v}" alt="">`;
      } else {
        // Use initials
        el.textContent = v.slice(0, 2).toUpperCase();
      }
    });
  }
  return el;
};

// ─── icon ─────────────────────────────────────────────────────────────────────

const icon: RenderFn = (node, store, context, onGoTo) => {
  const el = span('icon');
  const name = node.bindings.positional ?? node.bindings.literal ?? node.text;
  el.dataset['icon'] = name;
  el.setAttribute('aria-label', name);
  // Simple text-based icons for M1; swap for SVG sprites in later milestones
  el.textContent = iconGlyph(name);
  return el;
};

// ─── tab-bar ──────────────────────────────────────────────────────────────────

const tabBar: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = div('tab-bar');
  const stateName = node.bindings.twoWay ?? '';

  // Render tabs and wire tab selection
  for (const child of node.children) {
    if (child.tag !== 'tab') continue;
    const tabEl = document.createElement('button');
    tabEl.classList.add('mp-tab');
    const tabValue = child.bindings.positional ?? child.bindings.literal ?? '';
    tabEl.dataset['value'] = tabValue;
    bindText(tabEl, child.text, store, context);

    // Active state
    const setActive = () => {
      const current = String(store.get(stateName, context));
      tabEl.classList.toggle('mp-tab--active', current === tabValue);
    };
    setActive();
    if (stateName) store.subscribe(stateName, setActive);

    tabEl.addEventListener('click', () => {
      if (stateName) store.set(stateName, tabValue);
    });
    el.appendChild(tabEl);
  }
  return el;
};

// ─── navigation-bar ───────────────────────────────────────────────────────────

const navigationBar: RenderFn = (node, store, context, onGoTo, rc) => {
  const position = node.bindings.literal ?? node.bindings.positional ?? 'bottom';
  const el = document.createElement('nav');
  el.classList.add('mp-navigation-bar', `mp-navigation-bar--${position}`);
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── nav-item ─────────────────────────────────────────────────────────────────

const navItem: RenderFn = (node, store, context, onGoTo) => {
  const el = document.createElement('button');
  el.classList.add('mp-nav-item');

  // First positional attr is the screen name or icon name
  const attrs = Array.from(
    (node as unknown as { _el?: Element })._el?.attributes ?? []
  );
  const target = node.bindings.literal ?? node.bindings.positional ?? '';
  el.dataset['target'] = target;
  el.textContent = node.text;

  if (node.bindings.action) {
    bindAction(el, node.bindings.action.name, node.bindings.action.args, store, context, onGoTo);
  } else if (target) {
    el.addEventListener('click', () => onGoTo(target));
  }
  return el;
};

// ─── message-list / card-list / list ─────────────────────────────────────────

function makeList(cls: string): RenderFn {
  return (node, store, context, onGoTo, rc) => {
    const el = div(cls);
    const stateName = node.bindings.read ?? '';
    const template = node.children[0]; // the item template

    const render = () => {
      el.innerHTML = '';
      if (!stateName || !template) return;
      const items = store.get(stateName, context);
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const itemContext: RenderContext = { ...context, item: item as Record<string, unknown> };
        const itemEl = renderChildren2(template, store, itemContext, onGoTo);
        el.appendChild(itemEl);
      }
    };

    render();
    if (stateName) store.subscribe(stateName, render);
    return el;
  };
}

// ─── message-card / card ──────────────────────────────────────────────────────

function makeCard(cls: string): RenderFn {
  return (node, store, context, onGoTo, rc) => {
    const el = div(cls);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    if (node.bindings.action) {
      bindAction(el, node.bindings.action.name, node.bindings.action.args, store, context, onGoTo);
      el.style.cursor = 'pointer';
    }

    rc(el, node, store, context, onGoTo);
    return el;
  };
}

// ─── form ─────────────────────────────────────────────────────────────────────

const form: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = document.createElement('form');
  el.classList.add('mp-form');
  el.addEventListener('submit', e => e.preventDefault());
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── field ────────────────────────────────────────────────────────────────────

const field: RenderFn = (node, store, context, onGoTo) => {
  const wrapper = div('field');
  const input = document.createElement('input');
  input.classList.add('mp-field__input');

  // Passthrough attrs
  for (const [k, v] of Object.entries(node.attrs)) {
    input.setAttribute(k, v);
  }
  if (node.bindings.twoWay) {
    bindTwoWay(input, node.bindings.twoWay, store, context);
  }
  wrapper.appendChild(input);
  return wrapper;
};

// ─── button ───────────────────────────────────────────────────────────────────

const button: RenderFn = (node, store, context, onGoTo) => {
  const el = document.createElement('button');
  el.classList.add('mp-button');
  el.textContent = node.text;
  for (const [k, v] of Object.entries(node.attrs)) {
    el.setAttribute(k, v);
  }
  if (node.bindings.action) {
    bindAction(el, node.bindings.action.name, node.bindings.action.args, store, context, onGoTo);
  }
  return el;
};

// ─── toggle ───────────────────────────────────────────────────────────────────

const toggle: RenderFn = (node, store, context, onGoTo) => {
  const label = document.createElement('label');
  label.classList.add('mp-toggle');

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.classList.add('mp-toggle__input');

  const track = span('toggle__track');
  const textSpan = span('toggle__label');
  textSpan.textContent = node.text;

  if (node.bindings.twoWay) {
    const stateName = node.bindings.twoWay;
    const sync = () => {
      const val = store.get(stateName, context);
      input.checked = Boolean(val);
    };
    sync();
    store.subscribe(stateName, sync);
    input.addEventListener('change', () => store.set(stateName, input.checked));
  }

  label.appendChild(input);
  label.appendChild(track);
  label.appendChild(textSpan);
  return label;
};

// ─── sidebar ──────────────────────────────────────────────────────────────────

const sidebar: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = document.createElement('nav');
  el.classList.add('mp-sidebar');
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── sidebar-brand ────────────────────────────────────────────────────────────

const sidebarBrand: RenderFn = (node, store, context, onGoTo) => {
  const el = div('sidebar-brand');
  el.textContent = node.text;
  return el;
};

// ─── sidebar-section ──────────────────────────────────────────────────────────

const sidebarSection: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = div('sidebar-section');
  const label = node.attrs['label'] ?? node.bindings.literal ?? node.bindings.positional ?? '';
  if (label) {
    const labelEl = span('sidebar-label');
    labelEl.textContent = label;
    el.appendChild(labelEl);
  }
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── data-table ───────────────────────────────────────────────────────────────

const dataTable: RenderFn = (node, store, context, onGoTo) => {
  const wrapper = div('data-table-wrap');
  const table = document.createElement('table');
  table.classList.add('mp-data-table');

  const stateName = node.bindings.read ?? '';
  const cols = node.children.filter(c => c.tag === 'column');
  const actionBinding = node.bindings.action;

  // thead from column definitions
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of cols) {
    const th = document.createElement('th');
    th.textContent = col.attrs['label'] ?? col.attrs['field'] ?? '';
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const render = () => {
    tbody.innerHTML = '';
    const items = store.get(stateName, context);
    if (!Array.isArray(items)) return;

    for (const rawItem of items) {
      const item = rawItem as Record<string, unknown>;
      const tr = document.createElement('tr');
      tr.classList.add('mp-data-table__row');

      if (actionBinding) {
        tr.style.cursor = 'pointer';
        const rowContext = { ...context, item };
        tr.addEventListener('click', () => {
          const argValues = actionBinding.args.map(a => store.get(a, rowContext));
          store.invokeAction(actionBinding.name, actionBinding.args, argValues, onGoTo, rowContext);
        });
      }

      for (const col of cols) {
        const td = document.createElement('td');
        const field = col.attrs['field'] ?? '';
        const asType = col.attrs['as'] ?? '';
        const value = String(item[field] ?? '');

        if (asType === 'status-badge') {
          const badge = document.createElement('span');
          const slug = value.toLowerCase().replace(/[\s/]+/g, '-');
          badge.classList.add('mp-status-badge', `mp-status-badge--${slug}`);
          badge.textContent = value;
          td.appendChild(badge);
        } else if (asType === 'name-url') {
          // name on first line, url muted below
          const nameEl = document.createElement('div');
          nameEl.classList.add('mp-cell-name');
          nameEl.textContent = value;
          const urlEl = document.createElement('div');
          urlEl.classList.add('mp-cell-url');
          urlEl.textContent = String(item['url'] ?? '');
          td.appendChild(nameEl);
          td.appendChild(urlEl);
        } else if (asType === 'contact') {
          // person name + email
          const nameEl = document.createElement('div');
          nameEl.classList.add('mp-cell-name');
          nameEl.textContent = value;
          const emailEl = document.createElement('div');
          emailEl.classList.add('mp-cell-url');
          emailEl.textContent = String(item[field + '-email'] ?? item['email'] ?? '');
          td.appendChild(nameEl);
          td.appendChild(emailEl);
        } else if (asType === 'currency') {
          td.textContent = formatCurrency(Number(item[field]) || 0);
          td.style.textAlign = 'right';
          td.style.fontVariantNumeric = 'tabular-nums';
        } else if (asType === 'product') {
          const byField = col.attrs['by'] ?? '';
          const a = Number(item[field]) || 0;
          const b = Number(item[byField]) || 0;
          td.textContent = formatCurrency(a * b);
          td.style.textAlign = 'right';
          td.style.fontVariantNumeric = 'tabular-nums';
        } else {
          td.textContent = value;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  };

  render();
  if (stateName) store.subscribe(stateName, render);

  wrapper.appendChild(table);
  return wrapper;
};

// ─── search-bar ───────────────────────────────────────────────────────────────

const searchBar: RenderFn = (node, store, context, onGoTo) => {
  const wrapper = div('search-bar');
  const iconEl = document.createElement('span');
  iconEl.classList.add('mp-search-bar__icon');
  iconEl.textContent = '⌕';
  const input = document.createElement('input');
  input.classList.add('mp-search-bar__input');
  input.type = 'search';
  for (const [k, v] of Object.entries(node.attrs)) {
    input.setAttribute(k, v);
  }
  if (node.bindings.twoWay) {
    bindTwoWay(input, node.bindings.twoWay, store, context);
  }
  wrapper.appendChild(iconEl);
  wrapper.appendChild(input);
  return wrapper;
};

// ─── spreadsheet ─────────────────────────────────────────────────────────────

const spreadsheet: RenderFn = (node, store, context, onGoTo) => {
  const wrapper = div('spreadsheet-wrap');
  const table = document.createElement('table');
  table.classList.add('mp-spreadsheet');

  const stateName = node.bindings.read ?? '';
  const cols = node.children.filter(c => c.tag === 'column');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of cols) {
    const th = document.createElement('th');
    th.textContent = col.attrs['label'] ?? col.attrs['field'] ?? '';
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const render = () => {
    tbody.innerHTML = '';
    const items = store.get(stateName, context);
    if (!Array.isArray(items)) return;

    (items as Record<string, unknown>[]).forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.classList.add('mp-spreadsheet__row');

      for (const col of cols) {
        const td = document.createElement('td');
        const fieldName = col.attrs['field'] ?? '';
        const format = col.attrs['format'] ?? '';
        const raw = item[fieldName];

        if ('editable' in col.attrs) {
          const input = document.createElement('input');
          input.classList.add('mp-spreadsheet__input');
          input.value = String(raw ?? '');
          input.addEventListener('change', () => {
            const list = store.get(stateName, context);
            if (!Array.isArray(list)) return;
            const newVal = format === 'currency' || format === 'number'
              ? parseFloat(input.value) || 0
              : input.value;
            store.set(stateName, (list as Record<string, unknown>[]).map(
              (it, i) => i === idx ? { ...it, [fieldName]: newVal } : it
            ));
          });
          td.appendChild(input);
        } else {
          td.textContent = format === 'currency'
            ? formatCurrency(Number(raw) || 0)
            : String(raw ?? '');
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  };

  render();
  if (stateName) store.subscribe(stateName, render);
  wrapper.appendChild(table);
  return wrapper;
};

// ─── metric ───────────────────────────────────────────────────────────────────

const metric: RenderFn = (node, store, context, onGoTo) => {
  const el = div('metric');
  const format = node.attrs['format'] ?? '';

  const valueEl = document.createElement('div');
  valueEl.classList.add('mp-metric__value');

  const labelEl = document.createElement('div');
  labelEl.classList.add('mp-metric__label');
  labelEl.textContent = node.text;

  const update = (v: string) => {
    const num = parseFloat(v) || 0;
    if (format === 'currency') valueEl.textContent = formatCurrency(num);
    else if (format === 'percent') valueEl.textContent = `${num}%`;
    else valueEl.textContent = v;
  };

  if (node.bindings.read) {
    bindRead(valueEl, node.bindings.read, store, context, update);
  } else {
    update(node.text);
  }

  el.appendChild(valueEl);
  el.appendChild(labelEl);
  return el;
};

// ─── metric-group ─────────────────────────────────────────────────────────────

const metricGroup: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = div('metric-group');
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── bar ──────────────────────────────────────────────────────────────────────

const bar: RenderFn = (node, store, context, onGoTo) => {
  const wrapper = div('bar');
  const label = node.attrs['label'] ?? node.text;

  const headerEl = div('bar__header');
  const labelEl = document.createElement('span');
  labelEl.classList.add('mp-bar__label');
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.classList.add('mp-bar__value');
  headerEl.appendChild(labelEl);
  headerEl.appendChild(valueEl);

  const track = div('bar__track');
  const fill = div('bar__fill');
  track.appendChild(fill);

  if (node.bindings.read) {
    bindRead(wrapper, node.bindings.read, store, context, v => {
      const pct = Math.min(100, Math.max(0, parseFloat(v) || 0));
      fill.style.width = `${pct}%`;
      valueEl.textContent = `${pct}%`;
    });
  }

  wrapper.appendChild(headerEl);
  wrapper.appendChild(track);
  return wrapper;
};

// ─── kv (key-value row) ───────────────────────────────────────────────────────

const kv: RenderFn = (node, store, context, onGoTo) => {
  const el = div('kv');
  const format = node.attrs['format'] ?? '';
  const label = node.attrs['label'] ?? node.bindings.literal ?? node.bindings.positional ?? '';

  const labelEl = document.createElement('span');
  labelEl.classList.add('mp-kv__label');
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.classList.add('mp-kv__value');

  const update = (v: string) => {
    const num = parseFloat(v) || 0;
    if (format === 'currency') valueEl.textContent = formatCurrency(num);
    else if (format === 'percent') valueEl.textContent = `${num}%`;
    else valueEl.textContent = v;
  };

  if (node.bindings.read) {
    bindRead(valueEl, node.bindings.read, store, context, update);
  } else {
    update(node.text);
  }

  el.appendChild(labelEl);
  el.appendChild(valueEl);
  return el;
};

// ─── modal / toast / banner ───────────────────────────────────────────────────

const modal: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = div('modal');
  el.setAttribute('role', 'dialog');
  rc(el, node, store, context, onGoTo);
  return el;
};

const toast: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = div('toast');
  el.setAttribute('role', 'status');
  el.textContent = node.text;
  return el;
};

const banner: RenderFn = (node, store, context, onGoTo, rc) => {
  const el = div('banner');
  el.setAttribute('role', 'banner');
  rc(el, node, store, context, onGoTo);
  return el;
};

// ─── Chart ────────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  'var(--mp-accent)', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function toNum(v: unknown): number {
  return typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0;
}

function chartBar(data: Array<Record<string, unknown>>, field: string, label: string): SVGElement {
  const W = 280, ROW = 26, GAP = 5, LABEL_W = 80, PAD = 8;
  const rows = data.slice(0, 9);
  const H = rows.length * (ROW + GAP) + PAD * 2;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%' }) as SVGSVGElement;

  const max = Math.max(...rows.map(r => toNum(r[field])), 1);
  const barW = W - LABEL_W - PAD * 2;

  rows.forEach((row, i) => {
    const y    = PAD + i * (ROW + GAP);
    const val  = toNum(row[field]);
    const lbl  = String(row[label] ?? '');
    const fill = toNum(val / max * barW);

    // Track
    svg.appendChild(svgEl('rect', { x: LABEL_W, y, width: barW, height: ROW,
      rx: 4, fill: 'var(--mp-bg-secondary)' }));
    // Bar
    if (fill > 0) svg.appendChild(svgEl('rect', { x: LABEL_W, y, width: fill, height: ROW,
      rx: 4, fill: 'var(--mp-accent)', opacity: 0.85 }));
    // Label
    const txt = svgEl('text', { x: LABEL_W - 6, y: y + ROW / 2 + 4,
      'text-anchor': 'end', fill: 'var(--mp-text-secondary)',
      'font-size': 11, 'font-family': 'var(--mp-font)' });
    txt.textContent = lbl.length > 11 ? lbl.slice(0, 10) + '…' : lbl;
    svg.appendChild(txt);
    // Value
    const vtxt = svgEl('text', { x: LABEL_W + fill + 5, y: y + ROW / 2 + 4,
      fill: 'var(--mp-text-secondary)', 'font-size': 10, 'font-family': 'var(--mp-font)' });
    vtxt.textContent = String(Math.round(val * 10) / 10);
    svg.appendChild(vtxt);
  });
  return svg;
}

function chartLine(data: Array<Record<string, unknown>>, field: string): SVGElement {
  const W = 280, H = 120, PAD = 16;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%' }) as SVGSVGElement;
  const pts  = data.slice(-30);
  if (pts.length < 2) return svg;

  const vals = pts.map(r => toNum(r[field]));
  const min  = Math.min(...vals);
  const max  = Math.max(...vals, min + 1);
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const px = (i: number) => PAD + (i / (pts.length - 1)) * plotW;
  const py = (v: number) => PAD + plotH - ((v - min) / (max - min)) * plotH;

  // Grid lines (3)
  for (let g = 0; g <= 2; g++) {
    const gy = PAD + (g / 2) * plotH;
    svg.appendChild(svgEl('line', { x1: PAD, y1: gy, x2: W - PAD, y2: gy,
      stroke: 'var(--mp-border)', 'stroke-width': 1 }));
  }

  // Area fill
  const areaPoints = pts.map((r, i) => `${px(i)},${py(toNum(r[field]))}`).join(' ');
  const area = svgEl('polygon', {
    points: `${PAD},${PAD + plotH} ${areaPoints} ${W - PAD},${PAD + plotH}`,
    fill: 'var(--mp-accent)', opacity: 0.08,
  });
  svg.appendChild(area);

  // Line
  const polyline = svgEl('polyline', {
    points: areaPoints,
    fill: 'none', stroke: 'var(--mp-accent)', 'stroke-width': 2,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  });
  svg.appendChild(polyline);

  // Dots
  pts.forEach((r, i) => {
    svg.appendChild(svgEl('circle', { cx: px(i), cy: py(toNum(r[field])), r: 3,
      fill: 'var(--mp-accent)' }));
  });
  return svg;
}

function chartPie(data: Array<Record<string, unknown>>, field: string, label: string): SVGElement {
  const W = 280, H = 180, CX = 100, CY = 90, R = 72;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%' }) as SVGSVGElement;

  const slices = data.slice(0, 8);
  const total  = slices.reduce((s, r) => s + toNum(r[field]), 0);
  if (total === 0) return svg;

  let angle = -Math.PI / 2;
  slices.forEach((row, i) => {
    const val    = toNum(row[field]);
    const sweep  = (val / total) * Math.PI * 2;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    angle += sweep;
    const x2 = CX + R * Math.cos(angle);
    const y2 = CY + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const path = svgEl('path', {
      d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
      fill: CHART_COLORS[i % CHART_COLORS.length]!,
      opacity: 0.9,
      stroke: 'var(--mp-bg)', 'stroke-width': 1.5,
    });
    svg.appendChild(path);

    // Legend dot + label on right side
    const ly = 16 + i * 20;
    svg.appendChild(svgEl('circle', { cx: 196, cy: ly - 4, r: 5,
      fill: CHART_COLORS[i % CHART_COLORS.length]! }));
    const ltxt = svgEl('text', { x: 206, y: ly,
      fill: 'var(--mp-text-secondary)', 'font-size': 10,
      'font-family': 'var(--mp-font)' });
    const lbl = String(row[label] ?? '');
    ltxt.textContent = (lbl.length > 10 ? lbl.slice(0, 9) + '…' : lbl)
      + `  ${Math.round(val / total * 100)}%`;
    svg.appendChild(ltxt);
  });
  return svg;
}

const chart: RenderFn = (node, store, context) => {
  const type  = node.attrs['type'] ?? 'bar';
  const from  = node.attrs['from'] ?? (node.bindings.read ?? '');
  const field = node.attrs['field'] ?? '';
  const label = node.attrs['label'] ?? '';
  const where = node.attrs['where'];

  const wrap = div('chart');
  wrap.dataset['chartType'] = type;

  function render() {
    const raw = where ? store.filter(from, where) : store.get(from, context);
    const data = Array.isArray(raw) ? raw as Record<string, unknown>[] : [];
    wrap.innerHTML = '';
    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mp-chart-empty';
      empty.textContent = 'No data';
      wrap.appendChild(empty);
      return;
    }
    const svg = type === 'pie'  ? chartPie(data, field, label)
              : type === 'line' ? chartLine(data, field)
              :                   chartBar(data, field, label);
    wrap.appendChild(svg);
  }

  render();
  store.subscribe(from, render);
  return wrap;
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ELEMENTS: Record<string, ElementHandler> = {
  'screen-root': screenRoot,
  'header': header,
  'footer': footer,
  'heading': heading,
  'subtitle': subtitle,
  'paragraph': paragraph,
  'timestamp': timestamp,
  'badge': badge,
  'avatar': avatar,
  'icon': icon,
  'tab-bar': tabBar,
  'tab': () => div('tab'), // handled inside tab-bar; standalone is a no-op
  'navigation-bar': navigationBar,
  'nav-item': navItem,
  'message-list': makeList('message-list'),
  'card-list': makeList('card-list'),
  'list': makeList('list'),
  'message-card': makeCard('message-card'),
  'card': makeCard('card'),
  'form': form,
  'field': field,
  'button': button,
  'toggle': toggle,
  'modal': modal,
  'toast': toast,
  'banner': banner,
  // Full / dashboard layout
  'sidebar': sidebar,
  'sidebar-brand': sidebarBrand,
  'sidebar-section': sidebarSection,
  'data-table': dataTable,
  'column': () => { const el = document.createElement('span'); el.style.display = 'none'; return el; },
  'search-bar': searchBar,
  // Spreadsheet + metrics
  'spreadsheet': spreadsheet,
  'metric': metric,
  'metric-group': metricGroup,
  'bar': bar,
  // Key-value row
  'kv': kv,
  // Data visualisation
  'chart': chart,
};

// ─── Shared render-children without circular import ───────────────────────────
// Imported lazily to avoid circular dep with renderer.ts

function renderChildren2(
  node: ASTNode,
  store: Store,
  context: RenderContext,
  onGoTo: (screen: string, params?: Record<string, unknown>) => void,
): HTMLElement {
  // Dynamic import would break the bundle; use the registry directly
  const handler = ELEMENTS[node.tag];
  if (handler) {
    return handler(node, store, context, onGoTo, renderChildrenInline);
  }
  const el = document.createElement('div');
  el.dataset['tag'] = node.tag;
  renderChildrenInline(el, node, store, context, onGoTo);
  return el;
}

function renderChildrenInline(
  container: HTMLElement,
  node: ASTNode,
  store: Store,
  context: RenderContext,
  onGoTo: (screen: string, params?: Record<string, unknown>) => void,
): void {
  for (const child of node.children) {
    container.appendChild(renderChildren2(child, store, context, onGoTo));
  }
  if (node.text && node.children.length === 0) {
    container.textContent = node.text;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function iconGlyph(name: string): string {
  const glyphs: Record<string, string> = {
    'inbox': '✉',
    'starred': '★',
    'star': '★',
    'settings': '⚙',
    'archive': '↓',
    'arrow-left': '←',
    'back': '←',
    'search': '⌕',
    'compose': '✎',
    'close': '✕',
    'check': '✓',
    'menu': '≡',
    'more': '…',
  };
  return glyphs[name] ?? '○';
}
