import type { ASTNode, RenderContext } from './types.js';
import type { Store } from './state.js';
import { ELEMENTS, type ElementHandler } from './elements.js';

// ─── Public ───────────────────────────────────────────────────────────────────

export function renderNode(
  node: ASTNode,
  store: Store,
  context: RenderContext,
  onGoTo: (screen: string) => void,
): HTMLElement {
  const handler = ELEMENTS[node.tag];
  if (handler) {
    return handler(node, store, context, onGoTo, renderChildren);
  }
  // Unknown element — render as a div with data-tag for debugging
  const el = document.createElement('div');
  el.dataset['tag'] = node.tag;
  el.classList.add(`mp-unknown`);
  renderChildren(el, node, store, context, onGoTo);
  return el;
}

// ─── Child rendering helper (passed into element handlers) ───────────────────

export function renderChildren(
  container: HTMLElement,
  node: ASTNode,
  store: Store,
  context: RenderContext,
  onGoTo: (screen: string) => void,
): void {
  for (const child of node.children) {
    container.appendChild(renderNode(child, store, context, onGoTo));
  }
  if (node.text && node.children.length === 0) {
    container.textContent = node.text;
  }
}

// ─── Binding helpers ──────────────────────────────────────────────────────────

/** Resolve a read binding (@name or @item.field) to a display string. */
export function resolveRead(name: string, store: Store, context: RenderContext): string {
  const val = store.get(name, context);
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/** Wire a read binding so the element re-renders text on state change. */
export function bindRead(
  el: HTMLElement,
  stateName: string,
  store: Store,
  context: RenderContext,
  apply: (val: string) => void,
): () => void {
  const update = () => apply(resolveRead(stateName, store, context));
  update();
  store.subscribe(stateName, update);
  return () => store.unsubscribe(stateName, update);
}

/** Wire a two-way binding between an input element and state. */
export function bindTwoWay(
  el: HTMLInputElement | HTMLSelectElement,
  stateName: string,
  store: Store,
  context: RenderContext,
): void {
  // state → input
  const update = () => {
    const val = store.get(stateName, context);
    el.value = val === null || val === undefined ? '' : String(val);
  };
  update();
  store.subscribe(stateName, update);

  // input → state
  el.addEventListener('change', () => store.set(stateName, el.value));
  el.addEventListener('input', () => store.set(stateName, el.value));
}

/** Wire an action invocation to a click/tap event. */
export function bindAction(
  el: HTMLElement,
  actionName: string,
  args: string[],
  store: Store,
  context: RenderContext,
  onGoTo: (screen: string) => void,
): void {
  el.addEventListener('click', () => {
    const argValues = args.map(a => store.get(a, context));
    store.invokeAction(actionName, args, argValues, onGoTo, context);
    console.log(`[mere] action: ${actionName}`, args, argValues);
  });
}
