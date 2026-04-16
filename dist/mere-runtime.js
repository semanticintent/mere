"use strict";
var Mere = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/runtime/index.ts
  var index_exports = {};
  __export(index_exports, {
    bootstrap: () => bootstrap
  });

  // src/runtime/parser.ts
  function parseWorkbook(el) {
    const theme = el.getAttribute("theme") ?? "classic-light";
    const state = parseState(el.querySelector(":scope > state"));
    const computed = parseComputed(el.querySelector(":scope > computed"));
    const actions = parseActions(el.querySelector(":scope > actions"));
    const screens = parseScreens(el.querySelectorAll(":scope > screen"));
    return { theme, state, computed, actions, screens };
  }
  function parseState(stateEl) {
    if (!stateEl) return [];
    return Array.from(stateEl.querySelectorAll(":scope > value")).map((v) => ({
      name: req(v, "name"),
      type: v.getAttribute("type") ?? "text",
      default: parseDefault(v.getAttribute("value") ?? v.getAttribute("default"), v.getAttribute("type") ?? "text"),
      persist: v.hasAttribute("persist")
    }));
  }
  function parseDefault(raw, type) {
    if (raw === null) return void 0;
    if (type === "number") return Number(raw);
    if (type === "boolean") return raw === "true";
    return raw;
  }
  function parseComputed(computedEl) {
    if (!computedEl) return [];
    return Array.from(computedEl.querySelectorAll(":scope > value")).map((v) => ({
      name: req(v, "name"),
      from: req(v, "from"),
      where: v.getAttribute("where") ?? void 0,
      op: v.getAttribute("op") ?? void 0
    }));
  }
  function parseActions(actionsEl) {
    if (!actionsEl) return [];
    return Array.from(actionsEl.querySelectorAll(":scope > action")).map((a) => {
      const takesAttr = a.getAttribute("takes") ?? "";
      const takes = takesAttr.trim() ? takesAttr.trim().split(/\s+/) : [];
      const text = a.textContent ?? "";
      const statements = parseActionBody(text.trim());
      return { name: req(a, "name"), takes, statements };
    });
  }
  function parseActionBody(body) {
    const stmts = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      const goTo = line.match(/^go-to\s+(\S+)$/);
      if (goTo) {
        stmts.push({ kind: "go-to", screen: goTo[1] });
        continue;
      }
      const setMatch = line.match(/^set\s+(\S+)\s+to\s+(.+?)(?:\s+where\s+(.+))?$/);
      if (setMatch) {
        stmts.push({
          kind: "set",
          target: setMatch[1],
          value: setMatch[2].trim(),
          where: setMatch[3]?.trim()
        });
        continue;
      }
      const clearMatch = line.match(/^clear\s+(\S+)$/);
      if (clearMatch) {
        stmts.push({ kind: "clear", target: clearMatch[1] });
        continue;
      }
      const addToMatch = line.match(/^add-to\s+(\S+)\s+(.+)$/);
      if (addToMatch) {
        const fields = parseKeyValuePairs(addToMatch[2].trim());
        stmts.push({ kind: "add-to", list: addToMatch[1], fields });
        continue;
      }
    }
    return stmts;
  }
  function parseKeyValuePairs(str) {
    const pairs = [];
    const tokens = [];
    const tokenRe = /"[^"]*"|\S+/g;
    let m;
    while ((m = tokenRe.exec(str)) !== null) tokens.push(m[0]);
    for (let i = 0; i + 1 < tokens.length; i += 2) {
      pairs.push({ key: tokens[i], value: tokens[i + 1] });
    }
    return pairs;
  }
  function parseScreens(screenEls) {
    return Array.from(screenEls).map((s) => {
      const name = s.getAttribute("name") ?? s.getAttribute("id") ?? "";
      const intent = extractIntent(s);
      const root = parseNode(s);
      root.tag = "screen-root";
      return { name, intent, root };
    });
  }
  function parseNode(el) {
    const tag = el.tagName.toLowerCase();
    const bindings = parseBindings(el);
    const attrs = parsePassthroughAttrs(el);
    const directText = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent ?? "").join("").trim();
    const children = Array.from(el.children).map((child) => parseNode(child));
    return { tag, bindings, attrs, children, text: directText };
  }
  var PASSTHROUGH_ATTRS = /* @__PURE__ */ new Set([
    "placeholder",
    "type",
    "required",
    "min",
    "max",
    "pattern",
    "autocomplete",
    "name",
    "id",
    "class",
    "style"
  ]);
  function parseBindings(el) {
    const binding = {};
    const attrs = Array.from(el.attributes);
    let i = 0;
    while (i < attrs.length) {
      const attr = attrs[i];
      const name = attr.name;
      const value = attr.value;
      if (name.startsWith("@")) {
        binding.read = name.slice(1) || value;
      } else if (name.startsWith("~")) {
        binding.twoWay = name.slice(1) || value;
      } else if (name.startsWith("!")) {
        const actionName = name.slice(1);
        const args = [];
        if (value) {
          const m = value.match(/^(?:with\s+)?(.+)$/);
          if (m) args.push(...m[1].replace(/,/g, " ").split(/\s+/).filter(Boolean));
        } else {
          let j = i + 1;
          if (j < attrs.length && attrs[j].name === "with") {
            j++;
            while (j < attrs.length) {
              const next = attrs[j];
              if (next.name.startsWith("@") || next.name.startsWith("~") || next.name.startsWith("!") || next.name.startsWith("?") || PASSTHROUGH_ATTRS.has(next.name)) break;
              args.push(next.name);
              j++;
            }
            i = j - 1;
          }
        }
        binding.action = { name: actionName, args };
      } else if (name.startsWith("?")) {
        binding.intent = value || name.slice(1);
      }
      i++;
    }
    const firstAttr = attrs[0];
    if (firstAttr && !firstAttr.name.startsWith("@") && !firstAttr.name.startsWith("~") && !firstAttr.name.startsWith("!") && !firstAttr.name.startsWith("?") && firstAttr.name !== "name" && firstAttr.name !== "theme" && !PASSTHROUGH_ATTRS.has(firstAttr.name)) {
      if (firstAttr.value) {
        binding.literal = firstAttr.value;
      } else {
        binding.positional = firstAttr.name;
      }
    }
    return binding;
  }
  function parsePassthroughAttrs(el) {
    const result = {};
    for (const attr of Array.from(el.attributes)) {
      if (PASSTHROUGH_ATTRS.has(attr.name)) {
        result[attr.name] = attr.value;
      }
    }
    return result;
  }
  function extractIntent(el) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("?")) return attr.value || attr.name.slice(1);
    }
    return void 0;
  }
  function req(el, attr) {
    const v = el.getAttribute(attr);
    if (!v) throw new Error(`[mere] <${el.tagName.toLowerCase()}> missing required attribute "${attr}"`);
    return v;
  }

  // src/runtime/state.ts
  var Store = class {
    values = /* @__PURE__ */ new Map();
    subs = /* @__PURE__ */ new Map();
    computed = [];
    stateDecls = /* @__PURE__ */ new Map();
    persist = null;
    saveTimers = /* @__PURE__ */ new Map();
    init(decl) {
      this.computed = decl.computed;
      for (const s of decl.state) {
        this.stateDecls.set(s.name, s);
        const initial = s.default !== void 0 ? s.default : defaultFor(s.type);
        this.values.set(s.name, initial);
      }
      for (const c of decl.computed) {
        this.values.set(c.name, this.evalComputed(c));
      }
    }
    // Called after persist.init() resolves — loads saved values and overrides defaults
    async loadPersisted(persist) {
      this.persist = persist;
      for (const [name, decl] of this.stateDecls) {
        if (!decl.persist) continue;
        const saved = await persist.load(name);
        if (saved !== void 0) {
          this.values.set(name, saved);
          this.notify(name);
          this.recomputeDepending(name);
        }
      }
    }
    get(name, context) {
      if (name.includes(".")) {
        const parts = name.split(".");
        const head = parts[0] ?? "";
        const path = parts.slice(1).join(".");
        if (head === "item" && context?.item) {
          return getPath(context.item, path);
        }
        const base = this.values.get(head);
        if (base && typeof base === "object") {
          return getPath(base, path);
        }
        return "";
      }
      return this.values.get(name) ?? "";
    }
    set(name, value) {
      if (name.includes(".")) {
        const parts = name.split(".");
        const head = parts[0] ?? "";
        const rest = parts.slice(1).join(".");
        const base = this.values.get(head);
        if (base && typeof base === "object") {
          const clone = { ...base };
          setPath(clone, rest, value);
          this.values.set(head, clone);
          this.notify(head);
          this.recomputeDepending(head);
        }
        return;
      }
      this.values.set(name, value);
      this.notify(name);
      this.recomputeDepending(name);
      this.scheduleSave(name);
    }
    scheduleSave(name) {
      if (!this.persist) return;
      const decl = this.stateDecls.get(name);
      if (!decl?.persist) return;
      const existing = this.saveTimers.get(name);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        this.persist.save(name, this.values.get(name));
        this.saveTimers.delete(name);
      }, 500);
      this.saveTimers.set(name, timer);
    }
    subscribe(name, fn) {
      const root = name.split(".")[0] ?? name;
      if (!this.subs.has(root)) this.subs.set(root, /* @__PURE__ */ new Set());
      this.subs.get(root).add(fn);
      fn();
    }
    unsubscribe(name, fn) {
      const root = name.split(".")[0] ?? name;
      this.subs.get(root)?.delete(fn);
    }
    // ── Filter a list state value by a where clause ────────────────────────────
    filter(from, where) {
      const list = this.values.get(from);
      if (!Array.isArray(list)) return [];
      if (!where) return list;
      return list.filter((item) => evalWhere(where, item, this));
    }
    // ── Invoke an action ───────────────────────────────────────────────────────
    invokeAction(name, args, argValues, onGoTo, context) {
      const action = this.actions?.get(name);
      if (!action) {
        console.warn(`[mere] Unknown action: ${name}`);
        return;
      }
      const scope = {};
      action.takes.forEach((param, i) => {
        scope[param] = argValues[i] ?? this.resolveArg(args[i] ?? "", context);
      });
      for (const stmt of action.statements) {
        if (stmt.kind === "set") {
          const value = scope[stmt.value] ?? this.resolveArg(stmt.value, context);
          if (stmt.where) {
            this.setWhere(stmt.target, stmt.value, stmt.where, scope, context);
          } else if (stmt.target.includes("=")) {
          } else {
            if (stmt.value.startsWith('"')) {
              this.set(stmt.target, stmt.value.slice(1, -1));
            } else {
              const src = this.values.get(stmt.value);
              if (Array.isArray(src) && stmt.where) {
                const match = src.find(
                  (item) => evalWhere(stmt.where, item, this, scope)
                );
                this.set(stmt.target, match ?? {});
              } else {
                this.set(stmt.target, src ?? scope[stmt.value] ?? value);
              }
            }
          }
        } else if (stmt.kind === "go-to") {
          onGoTo(stmt.screen);
        } else if (stmt.kind === "clear") {
          const decl = this.stateDecls.get(stmt.target);
          const resetVal = decl?.default !== void 0 ? decl.default : defaultFor(decl?.type ?? "text");
          this.set(stmt.target, resetVal);
        } else if (stmt.kind === "add-to") {
          const list = this.values.get(stmt.list);
          if (Array.isArray(list)) {
            const item = {};
            for (const { key, value } of stmt.fields) {
              if (value.startsWith('"') && value.endsWith('"')) {
                item[key] = value.slice(1, -1);
              } else {
                item[key] = scope[value] ?? this.resolveArg(value, context);
              }
            }
            if (!item["id"]) item["id"] = String(Date.now() + Math.random());
            this.set(stmt.list, [...list, item]);
          }
        }
      }
    }
    // Called once after parsing actions
    actions;
    resolveArg(arg, context) {
      if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
      const name = arg.startsWith("@") ? arg.slice(1) : arg;
      return this.get(name, context);
    }
    setWhere(target, field2, where, scope, context) {
      const [listName, fieldName] = target.split(".");
      if (!listName || !fieldName) return;
      const list = this.values.get(listName);
      if (!Array.isArray(list)) return;
      const value = scope[field2] ?? (field2.startsWith('"') ? field2.slice(1, -1) : this.get(field2, context));
      const updated = list.map(
        (item) => evalWhere(where, item, this, scope) ? { ...item, [fieldName]: value } : item
      );
      this.set(listName, updated);
    }
    notify(name) {
      this.subs.get(name)?.forEach((fn) => fn());
    }
    recomputeDepending(name) {
      for (const c of this.computed) {
        if (c.from === name) {
          const newVal = this.evalComputed(c);
          this.values.set(c.name, newVal);
          this.notify(c.name);
        }
      }
    }
    evalComputed(c) {
      const list = this.values.get(c.from);
      if (!Array.isArray(list)) return c.op === "count" ? 0 : [];
      const filtered = c.where ? list.filter((item) => evalWhere(c.where, item, this)) : list;
      if (c.op === "count") return filtered.length;
      return filtered;
    }
  };
  function defaultFor(type) {
    switch (type) {
      case "text":
        return "";
      case "number":
        return 0;
      case "boolean":
        return false;
      case "list":
        return [];
      case "map":
        return {};
      default:
        return null;
    }
  }
  function getPath(obj, path) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return "";
      cur = cur[p];
    }
    return cur ?? "";
  }
  function setPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (cur[key] == null || typeof cur[key] !== "object") cur[key] = {};
      cur = cur[key];
    }
    const last = parts[parts.length - 1];
    if (last) cur[last] = value;
  }
  function evalWhere(where, item, store, scope) {
    const match = where.match(/^(\S+)\s*=\s*(.+)$/);
    if (!match) return true;
    const [, lhs, rhs] = match;
    if (!lhs || !rhs) return true;
    const left = getPath(item, lhs);
    let right;
    const trimmed = rhs.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      right = trimmed.slice(1, -1);
    } else {
      right = scope?.[trimmed] ?? store.get(trimmed);
    }
    if (right === "all" || right === "") return true;
    return left === right;
  }

  // src/runtime/persist.ts
  var Persist = class {
    opfsDir = null;
    useOpfs = false;
    key;
    constructor() {
      this.key = workbookKey();
    }
    async init() {
      if (!("storage" in navigator) || !("getDirectory" in navigator.storage)) {
        console.info("[mere] OPFS unavailable \u2014 using localStorage");
        return;
      }
      try {
        const root = await navigator.storage.getDirectory();
        const base = await root.getDirectoryHandle("mere", { create: true });
        this.opfsDir = await base.getDirectoryHandle(this.key, { create: true });
        this.useOpfs = true;
        console.info("[mere] Persistence: OPFS");
      } catch {
        console.info("[mere] OPFS init failed \u2014 using localStorage");
      }
    }
    async load(name) {
      if (this.useOpfs && this.opfsDir) {
        try {
          const fh = await this.opfsDir.getFileHandle(name + ".json");
          const file = await fh.getFile();
          return JSON.parse(await file.text());
        } catch {
          return void 0;
        }
      } else {
        const raw = localStorage.getItem(lsKey(this.key, name));
        return raw !== null ? JSON.parse(raw) : void 0;
      }
    }
    async save(name, value) {
      const json = JSON.stringify(value);
      if (this.useOpfs && this.opfsDir) {
        try {
          const fh = await this.opfsDir.getFileHandle(name + ".json", { create: true });
          const writable = await fh.createWritable();
          await writable.write(json);
          await writable.close();
        } catch (e) {
          console.warn(`[mere] OPFS save failed for "${name}":`, e);
          try {
            localStorage.setItem(lsKey(this.key, name), json);
          } catch {
          }
        }
      } else {
        try {
          localStorage.setItem(lsKey(this.key, name), json);
        } catch {
          console.warn(`[mere] localStorage full \u2014 "${name}" not persisted`);
        }
      }
    }
  };
  function workbookKey() {
    const url = location.href.replace(/[?#].*$/, "");
    let h = 5381;
    for (let i = 0; i < url.length; i++) {
      h = (h << 5) + h + url.charCodeAt(i) | 0;
    }
    return "wb-" + Math.abs(h).toString(36);
  }
  function lsKey(workbook, state) {
    return `mere:${workbook}:${state}`;
  }

  // src/runtime/elements.ts
  function div(cls, ...extra) {
    const el = document.createElement("div");
    el.classList.add("mp-" + cls, ...extra.map((c) => "mp-" + c));
    return el;
  }
  function span(cls) {
    const el = document.createElement("span");
    el.classList.add("mp-" + cls);
    return el;
  }
  var screenRoot = (node, store, context, onGoTo, rc) => {
    const el = div("screen");
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var header = (node, store, context, onGoTo, rc) => {
    const el = document.createElement("header");
    el.classList.add("mp-header");
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var footer = (node, store, context, onGoTo, rc) => {
    const el = document.createElement("footer");
    el.classList.add("mp-footer");
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var heading = (node, store, context, onGoTo) => {
    const el = document.createElement("h2");
    el.classList.add("mp-heading");
    if (node.bindings.read) {
      bindRead(el, node.bindings.read, store, context, (v) => {
        el.textContent = v;
      });
    } else {
      bindText(el, node.text, store, context);
    }
    return el;
  };
  var subtitle = (node, store, context, onGoTo) => {
    const el = span("subtitle");
    if (node.bindings.read) {
      bindRead(el, node.bindings.read, store, context, (v) => {
        el.textContent = v;
      });
    } else {
      bindText(el, node.text, store, context);
    }
    return el;
  };
  var paragraph = (node, store, context, onGoTo) => {
    const el = document.createElement("p");
    el.classList.add("mp-paragraph");
    if (node.bindings.read) {
      bindRead(el, node.bindings.read, store, context, (v) => {
        el.textContent = v;
      });
    } else {
      bindText(el, node.text, store, context);
    }
    return el;
  };
  var timestamp = (node, store, context, onGoTo) => {
    const el = span("timestamp");
    const update = (raw) => {
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
  var badge = (node, store, context, onGoTo) => {
    const el = span("badge");
    if (node.bindings.read) {
      bindRead(el, node.bindings.read, store, context, (v) => {
        el.textContent = v;
        el.style.display = v === "0" || v === "" ? "none" : "";
      });
    } else {
      el.textContent = node.text;
    }
    return el;
  };
  var avatar = (node, store, context, onGoTo) => {
    const el = div("avatar");
    if (node.bindings.read) {
      bindRead(el, node.bindings.read, store, context, (v) => {
        if (v.startsWith("http") || v.startsWith("/") || v.startsWith("data:")) {
          el.innerHTML = `<img src="${v}" alt="">`;
        } else {
          el.textContent = v.slice(0, 2).toUpperCase();
        }
      });
    }
    return el;
  };
  var icon = (node, store, context, onGoTo) => {
    const el = span("icon");
    const name = node.bindings.positional ?? node.bindings.literal ?? node.text;
    el.dataset["icon"] = name;
    el.setAttribute("aria-label", name);
    el.textContent = iconGlyph(name);
    return el;
  };
  var tabBar = (node, store, context, onGoTo, rc) => {
    const el = div("tab-bar");
    const stateName = node.bindings.twoWay ?? "";
    for (const child of node.children) {
      if (child.tag !== "tab") continue;
      const tabEl = document.createElement("button");
      tabEl.classList.add("mp-tab");
      const tabValue = child.bindings.positional ?? child.bindings.literal ?? "";
      tabEl.dataset["value"] = tabValue;
      tabEl.textContent = child.text;
      const setActive = () => {
        const current = String(store.get(stateName, context));
        tabEl.classList.toggle("mp-tab--active", current === tabValue);
      };
      setActive();
      if (stateName) store.subscribe(stateName, setActive);
      tabEl.addEventListener("click", () => {
        if (stateName) store.set(stateName, tabValue);
      });
      el.appendChild(tabEl);
    }
    return el;
  };
  var navigationBar = (node, store, context, onGoTo, rc) => {
    const position = node.bindings.literal ?? node.bindings.positional ?? "bottom";
    const el = document.createElement("nav");
    el.classList.add("mp-navigation-bar", `mp-navigation-bar--${position}`);
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var navItem = (node, store, context, onGoTo) => {
    const el = document.createElement("button");
    el.classList.add("mp-nav-item");
    const attrs = Array.from(
      node._el?.attributes ?? []
    );
    const target = node.bindings.literal ?? node.bindings.positional ?? "";
    el.dataset["target"] = target;
    el.textContent = node.text;
    if (node.bindings.action) {
      bindAction(el, node.bindings.action.name, node.bindings.action.args, store, context, onGoTo);
    } else if (target) {
      el.addEventListener("click", () => onGoTo(target));
    }
    return el;
  };
  function makeList(cls) {
    return (node, store, context, onGoTo, rc) => {
      const el = div(cls);
      const stateName = node.bindings.read ?? "";
      const template = node.children[0];
      const render = () => {
        el.innerHTML = "";
        if (!stateName || !template) return;
        const items = store.get(stateName, context);
        if (!Array.isArray(items)) return;
        for (const item of items) {
          const itemContext = { ...context, item };
          const itemEl = renderChildren2(template, store, itemContext, onGoTo);
          el.appendChild(itemEl);
        }
      };
      render();
      if (stateName) store.subscribe(stateName, render);
      return el;
    };
  }
  function makeCard(cls) {
    return (node, store, context, onGoTo, rc) => {
      const el = div(cls);
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      if (node.bindings.action) {
        bindAction(el, node.bindings.action.name, node.bindings.action.args, store, context, onGoTo);
        el.style.cursor = "pointer";
      }
      rc(el, node, store, context, onGoTo);
      return el;
    };
  }
  var form = (node, store, context, onGoTo, rc) => {
    const el = document.createElement("form");
    el.classList.add("mp-form");
    el.addEventListener("submit", (e) => e.preventDefault());
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var field = (node, store, context, onGoTo) => {
    const wrapper = div("field");
    const input = document.createElement("input");
    input.classList.add("mp-field__input");
    for (const [k, v] of Object.entries(node.attrs)) {
      input.setAttribute(k, v);
    }
    if (node.bindings.twoWay) {
      bindTwoWay(input, node.bindings.twoWay, store, context);
    }
    wrapper.appendChild(input);
    return wrapper;
  };
  var button = (node, store, context, onGoTo) => {
    const el = document.createElement("button");
    el.classList.add("mp-button");
    el.textContent = node.text;
    for (const [k, v] of Object.entries(node.attrs)) {
      el.setAttribute(k, v);
    }
    if (node.bindings.action) {
      bindAction(el, node.bindings.action.name, node.bindings.action.args, store, context, onGoTo);
    }
    return el;
  };
  var toggle = (node, store, context, onGoTo) => {
    const label = document.createElement("label");
    label.classList.add("mp-toggle");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.classList.add("mp-toggle__input");
    const track = span("toggle__track");
    const textSpan = span("toggle__label");
    textSpan.textContent = node.text;
    if (node.bindings.twoWay) {
      const stateName = node.bindings.twoWay;
      const sync = () => {
        const val = store.get(stateName, context);
        input.checked = Boolean(val);
      };
      sync();
      store.subscribe(stateName, sync);
      input.addEventListener("change", () => store.set(stateName, input.checked));
    }
    label.appendChild(input);
    label.appendChild(track);
    label.appendChild(textSpan);
    return label;
  };
  var modal = (node, store, context, onGoTo, rc) => {
    const el = div("modal");
    el.setAttribute("role", "dialog");
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var toast = (node, store, context, onGoTo, rc) => {
    const el = div("toast");
    el.setAttribute("role", "status");
    el.textContent = node.text;
    return el;
  };
  var banner = (node, store, context, onGoTo, rc) => {
    const el = div("banner");
    el.setAttribute("role", "banner");
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var ELEMENTS = {
    "screen-root": screenRoot,
    "header": header,
    "footer": footer,
    "heading": heading,
    "subtitle": subtitle,
    "paragraph": paragraph,
    "timestamp": timestamp,
    "badge": badge,
    "avatar": avatar,
    "icon": icon,
    "tab-bar": tabBar,
    "tab": () => div("tab"),
    // handled inside tab-bar; standalone is a no-op
    "navigation-bar": navigationBar,
    "nav-item": navItem,
    "message-list": makeList("message-list"),
    "card-list": makeList("card-list"),
    "list": makeList("list"),
    "message-card": makeCard("message-card"),
    "card": makeCard("card"),
    "form": form,
    "field": field,
    "button": button,
    "toggle": toggle,
    "modal": modal,
    "toast": toast,
    "banner": banner
  };
  function renderChildren2(node, store, context, onGoTo) {
    const handler = ELEMENTS[node.tag];
    if (handler) {
      return handler(node, store, context, onGoTo, renderChildrenInline);
    }
    const el = document.createElement("div");
    el.dataset["tag"] = node.tag;
    renderChildrenInline(el, node, store, context, onGoTo);
    return el;
  }
  function renderChildrenInline(container, node, store, context, onGoTo) {
    for (const child of node.children) {
      container.appendChild(renderChildren2(child, store, context, onGoTo));
    }
    if (node.text && node.children.length === 0) {
      container.textContent = node.text;
    }
  }
  function formatRelative(d) {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 6e4);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }
  function iconGlyph(name) {
    const glyphs = {
      "inbox": "\u2709",
      "starred": "\u2605",
      "star": "\u2605",
      "settings": "\u2699",
      "archive": "\u2193",
      "arrow-left": "\u2190",
      "back": "\u2190",
      "search": "\u2315",
      "compose": "\u270E",
      "close": "\u2715",
      "check": "\u2713",
      "menu": "\u2261",
      "more": "\u2026"
    };
    return glyphs[name] ?? "\u25CB";
  }

  // src/runtime/renderer.ts
  function renderNode(node, store, context, onGoTo) {
    const handler = ELEMENTS[node.tag];
    if (handler) {
      return handler(node, store, context, onGoTo, renderChildren3);
    }
    const el = document.createElement("div");
    el.dataset["tag"] = node.tag;
    el.classList.add(`mp-unknown`);
    renderChildren3(el, node, store, context, onGoTo);
    return el;
  }
  function renderChildren3(container, node, store, context, onGoTo) {
    for (const child of node.children) {
      container.appendChild(renderNode(child, store, context, onGoTo));
    }
    if (node.text && node.children.length === 0) {
      container.textContent = node.text;
    }
  }
  function resolveRead2(name, store, context) {
    const val = store.get(name, context);
    if (val === null || val === void 0) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }
  function bindRead(el, stateName, store, context, apply) {
    const update = () => apply(resolveRead2(stateName, store, context));
    update();
    store.subscribe(stateName, update);
    return () => store.unsubscribe(stateName, update);
  }
  function bindText(el, template, store, context) {
    const refs = [...template.matchAll(/@([\w-]+(?:\.[\w-]+)*)/g)].map((m) => m[1]);
    if (refs.length === 0) {
      el.textContent = template;
      return;
    }
    const update = () => {
      el.textContent = template.replace(
        /@([\w-]+(?:\.[\w-]+)*)/g,
        (_, name) => String(store.get(name, context) ?? "")
      );
    };
    update();
    for (const ref of [...new Set(refs)]) {
      store.subscribe(ref, update);
    }
  }
  function bindTwoWay(el, stateName, store, context) {
    const update = () => {
      const val = store.get(stateName, context);
      el.value = val === null || val === void 0 ? "" : String(val);
    };
    update();
    store.subscribe(stateName, update);
    el.addEventListener("change", () => store.set(stateName, el.value));
    el.addEventListener("input", () => store.set(stateName, el.value));
  }
  function bindAction(el, actionName, args, store, context, onGoTo) {
    el.addEventListener("click", () => {
      const argValues = args.map((a) => store.get(a, context));
      store.invokeAction(actionName, args, argValues, onGoTo, context);
      console.log(`[mere] action: ${actionName}`, args, argValues);
    });
  }

  // src/themes/classic-light.css
  var classic_light_default = "/* \u2500\u2500 Mere: classic-light theme \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n:root {\n  --mp-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;\n  --mp-font-mono: 'SF Mono', 'Fira Code', monospace;\n\n  /* Palette */\n  --mp-bg: #ffffff;\n  --mp-bg-secondary: #f7f7f8;\n  --mp-bg-hover: #f0f0f2;\n  --mp-bg-active: #e8e8ec;\n  --mp-border: #e2e2e6;\n  --mp-border-strong: #c8c8ce;\n\n  --mp-text: #1a1a1f;\n  --mp-text-secondary: #5a5a6a;\n  --mp-text-tertiary: #9090a0;\n  --mp-text-inverse: #ffffff;\n\n  --mp-accent: #3b5bdb;\n  --mp-accent-hover: #2f4cc0;\n  --mp-accent-subtle: #e8ecfd;\n\n  --mp-danger: #c92a2a;\n  --mp-success: #2f9e44;\n\n  /* Geometry */\n  --mp-radius-sm: 6px;\n  --mp-radius: 10px;\n  --mp-radius-lg: 16px;\n\n  --mp-space-xs: 4px;\n  --mp-space-sm: 8px;\n  --mp-space-md: 14px;\n  --mp-space-lg: 20px;\n  --mp-space-xl: 28px;\n\n  --mp-shadow-sm: 0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04);\n  --mp-shadow: 0 2px 8px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05);\n\n  /* Typography */\n  --mp-text-xs: 11px;\n  --mp-text-sm: 13px;\n  --mp-text-base: 15px;\n  --mp-text-lg: 17px;\n  --mp-text-xl: 20px;\n  --mp-text-2xl: 24px;\n\n  --mp-weight-normal: 400;\n  --mp-weight-medium: 500;\n  --mp-weight-semibold: 600;\n  --mp-weight-bold: 700;\n\n  /* Motion */\n  --mp-transition: 150ms ease;\n}\n\n/* \u2500\u2500 Reset / base \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-workbook,\n.mp-workbook * {\n  box-sizing: border-box;\n  -webkit-font-smoothing: antialiased;\n}\n\n.mp-workbook {\n  font-family: var(--mp-font);\n  font-size: var(--mp-text-base);\n  color: var(--mp-text);\n  background: var(--mp-bg);\n  width: 100%;\n  min-height: 100dvh;\n  display: flex;\n  flex-direction: column;\n}\n\n/* \u2500\u2500 Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-screen {\n  display: flex;\n  flex-direction: column;\n  min-height: 100dvh;\n  background: var(--mp-bg);\n  max-width: 480px;\n  margin: 0 auto;\n  width: 100%;\n}\n\n/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--mp-space-sm);\n  padding: var(--mp-space-md) var(--mp-space-lg);\n  background: var(--mp-bg);\n  border-bottom: 1px solid var(--mp-border);\n  min-height: 56px;\n  position: sticky;\n  top: 0;\n  z-index: 10;\n}\n\n/* \u2500\u2500 Heading \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-heading {\n  font-size: var(--mp-text-xl);\n  font-weight: var(--mp-weight-bold);\n  color: var(--mp-text);\n  margin: 0;\n  line-height: 1.2;\n}\n\n.mp-header .mp-heading {\n  font-size: var(--mp-text-lg);\n  font-weight: var(--mp-weight-semibold);\n}\n\n/* \u2500\u2500 Subtitle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-subtitle {\n  font-size: var(--mp-text-sm);\n  color: var(--mp-text-secondary);\n  display: block;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n/* \u2500\u2500 Paragraph \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-paragraph {\n  font-size: var(--mp-text-base);\n  color: var(--mp-text);\n  line-height: 1.6;\n  margin: var(--mp-space-sm) 0;\n}\n\n/* \u2500\u2500 Timestamp \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-timestamp {\n  font-size: var(--mp-text-xs);\n  color: var(--mp-text-tertiary);\n  white-space: nowrap;\n}\n\n/* \u2500\u2500 Badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-badge {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 20px;\n  height: 20px;\n  padding: 0 6px;\n  background: var(--mp-accent);\n  color: var(--mp-text-inverse);\n  font-size: var(--mp-text-xs);\n  font-weight: var(--mp-weight-bold);\n  border-radius: 10px;\n  line-height: 1;\n}\n\n/* \u2500\u2500 Avatar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-avatar {\n  width: 40px;\n  height: 40px;\n  border-radius: 50%;\n  background: var(--mp-accent-subtle);\n  color: var(--mp-accent);\n  font-size: var(--mp-text-sm);\n  font-weight: var(--mp-weight-semibold);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  overflow: hidden;\n}\n\n.mp-avatar img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n\n/* \u2500\u2500 Icon \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-icon {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 24px;\n  height: 24px;\n  font-size: 16px;\n  color: var(--mp-text-secondary);\n}\n\n/* \u2500\u2500 Tab bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-tab-bar {\n  display: flex;\n  gap: 2px;\n  padding: var(--mp-space-xs) var(--mp-space-lg);\n  background: var(--mp-bg);\n  border-bottom: 1px solid var(--mp-border);\n  overflow-x: auto;\n  scrollbar-width: none;\n}\n\n.mp-tab-bar::-webkit-scrollbar { display: none; }\n\n.mp-tab {\n  flex: 1;\n  padding: var(--mp-space-sm) var(--mp-space-md);\n  background: none;\n  border: none;\n  border-radius: var(--mp-radius-sm);\n  font-family: var(--mp-font);\n  font-size: var(--mp-text-sm);\n  font-weight: var(--mp-weight-medium);\n  color: var(--mp-text-secondary);\n  cursor: pointer;\n  transition: background var(--mp-transition), color var(--mp-transition);\n  white-space: nowrap;\n}\n\n.mp-tab:hover {\n  background: var(--mp-bg-hover);\n  color: var(--mp-text);\n}\n\n.mp-tab--active {\n  background: var(--mp-accent-subtle);\n  color: var(--mp-accent);\n  font-weight: var(--mp-weight-semibold);\n}\n\n/* \u2500\u2500 Navigation bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-navigation-bar {\n  display: flex;\n  gap: 0;\n  background: var(--mp-bg);\n  border-top: 1px solid var(--mp-border);\n  padding: var(--mp-space-xs) 0;\n  padding-bottom: calc(var(--mp-space-xs) + env(safe-area-inset-bottom, 0px));\n  margin-top: auto;\n}\n\n.mp-navigation-bar--top {\n  border-top: none;\n  border-bottom: 1px solid var(--mp-border);\n  margin-top: 0;\n}\n\n.mp-nav-item {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 2px;\n  padding: var(--mp-space-xs) var(--mp-space-sm);\n  background: none;\n  border: none;\n  font-family: var(--mp-font);\n  font-size: var(--mp-text-xs);\n  color: var(--mp-text-tertiary);\n  cursor: pointer;\n  transition: color var(--mp-transition);\n  min-height: 48px;\n}\n\n.mp-nav-item:hover { color: var(--mp-accent); }\n\n/* \u2500\u2500 Lists \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-message-list,\n.mp-card-list,\n.mp-list {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  overflow-y: auto;\n}\n\n/* \u2500\u2500 Message card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-message-card {\n  display: grid;\n  grid-template-columns: 40px 1fr auto;\n  grid-template-rows: auto auto;\n  gap: 2px var(--mp-space-md);\n  padding: var(--mp-space-md) var(--mp-space-lg);\n  border-bottom: 1px solid var(--mp-border);\n  background: var(--mp-bg);\n  transition: background var(--mp-transition);\n  align-items: start;\n}\n\n.mp-message-card:hover { background: var(--mp-bg-hover); }\n.mp-message-card:active { background: var(--mp-bg-active); }\n\n.mp-message-card .mp-avatar { grid-row: 1 / 3; }\n.mp-message-card .mp-heading { font-size: var(--mp-text-base); font-weight: var(--mp-weight-semibold); }\n.mp-message-card .mp-subtitle { grid-column: 2; }\n.mp-message-card .mp-timestamp { grid-row: 1; }\n\n/* \u2500\u2500 Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-card {\n  background: var(--mp-bg);\n  border: 1px solid var(--mp-border);\n  border-radius: var(--mp-radius);\n  padding: var(--mp-space-lg);\n  margin: var(--mp-space-md) var(--mp-space-lg);\n  box-shadow: var(--mp-shadow-sm);\n  transition: box-shadow var(--mp-transition);\n}\n\n.mp-card:hover { box-shadow: var(--mp-shadow); }\n\n.mp-card .mp-header {\n  border: none;\n  padding: 0;\n  margin-bottom: var(--mp-space-md);\n  position: static;\n}\n\n/* \u2500\u2500 Form & inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-form {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mp-space-md);\n  padding: var(--mp-space-lg);\n}\n\n.mp-field {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mp-space-xs);\n}\n\n.mp-field__input {\n  font-family: var(--mp-font);\n  font-size: var(--mp-text-base);\n  color: var(--mp-text);\n  background: var(--mp-bg-secondary);\n  border: 1px solid var(--mp-border);\n  border-radius: var(--mp-radius-sm);\n  padding: var(--mp-space-sm) var(--mp-space-md);\n  width: 100%;\n  outline: none;\n  transition: border-color var(--mp-transition), box-shadow var(--mp-transition);\n}\n\n.mp-field__input:focus {\n  border-color: var(--mp-accent);\n  box-shadow: 0 0 0 3px rgba(59, 91, 219, 0.12);\n}\n\n.mp-field__input::placeholder { color: var(--mp-text-tertiary); }\n\n/* \u2500\u2500 Button \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-button {\n  font-family: var(--mp-font);\n  font-size: var(--mp-text-base);\n  font-weight: var(--mp-weight-semibold);\n  color: var(--mp-text-inverse);\n  background: var(--mp-accent);\n  border: none;\n  border-radius: var(--mp-radius-sm);\n  padding: var(--mp-space-sm) var(--mp-space-lg);\n  cursor: pointer;\n  transition: background var(--mp-transition);\n  width: 100%;\n  min-height: 44px;\n}\n\n.mp-button:hover { background: var(--mp-accent-hover); }\n.mp-button:active { transform: scale(0.98); }\n\n/* \u2500\u2500 Toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-toggle {\n  display: flex;\n  align-items: center;\n  gap: var(--mp-space-md);\n  padding: var(--mp-space-md) var(--mp-space-lg);\n  cursor: pointer;\n}\n\n.mp-toggle__input { position: absolute; opacity: 0; width: 0; height: 0; }\n\n.mp-toggle__track {\n  display: inline-block;\n  width: 44px;\n  height: 26px;\n  background: var(--mp-border-strong);\n  border-radius: 13px;\n  position: relative;\n  transition: background var(--mp-transition);\n  flex-shrink: 0;\n}\n\n.mp-toggle__track::after {\n  content: '';\n  position: absolute;\n  left: 3px;\n  top: 3px;\n  width: 20px;\n  height: 20px;\n  background: white;\n  border-radius: 50%;\n  box-shadow: var(--mp-shadow-sm);\n  transition: transform var(--mp-transition);\n}\n\n.mp-toggle__input:checked + .mp-toggle__track {\n  background: var(--mp-accent);\n}\n\n.mp-toggle__input:checked + .mp-toggle__track::after {\n  transform: translateX(18px);\n}\n\n.mp-toggle__label {\n  font-size: var(--mp-text-base);\n  color: var(--mp-text);\n}\n\n/* \u2500\u2500 Modal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-modal {\n  position: fixed;\n  inset: 0;\n  background: rgba(0,0,0,.4);\n  display: flex;\n  align-items: flex-end;\n  z-index: 100;\n}\n\n.mp-modal > * {\n  width: 100%;\n  max-height: 80dvh;\n  background: var(--mp-bg);\n  border-radius: var(--mp-radius-lg) var(--mp-radius-lg) 0 0;\n  padding: var(--mp-space-xl);\n  overflow-y: auto;\n}\n\n/* \u2500\u2500 Toast \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-toast {\n  position: fixed;\n  bottom: calc(80px + env(safe-area-inset-bottom, 0px));\n  left: 50%;\n  transform: translateX(-50%);\n  background: var(--mp-text);\n  color: var(--mp-text-inverse);\n  font-size: var(--mp-text-sm);\n  padding: var(--mp-space-sm) var(--mp-space-lg);\n  border-radius: var(--mp-radius);\n  box-shadow: var(--mp-shadow);\n  z-index: 200;\n  white-space: nowrap;\n}\n\n/* \u2500\u2500 Banner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-banner {\n  background: var(--mp-accent-subtle);\n  border-left: 3px solid var(--mp-accent);\n  padding: var(--mp-space-md) var(--mp-space-lg);\n  font-size: var(--mp-text-sm);\n  color: var(--mp-text);\n}\n";

  // src/themes/proton-mail.css
  var proton_mail_default = "/* \u2500\u2500 Mere: proton-mail theme \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n/* Clean, minimal, Swiss-influenced. Generous whitespace. Proton purple accent. */\n\n:root {\n  --mp-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n\n  /* Palette */\n  --mp-bg: #ffffff;\n  --mp-bg-secondary: #f5f4f7;\n  --mp-bg-hover: #eeecf4;\n  --mp-bg-active: #e4e1ef;\n  --mp-border: #e8e6f0;\n  --mp-border-strong: #c9c5db;\n\n  --mp-text: #1c1b23;\n  --mp-text-secondary: #534f6e;\n  --mp-text-tertiary: #9b96b4;\n  --mp-text-inverse: #ffffff;\n\n  --mp-accent: #6d4aff;\n  --mp-accent-hover: #5a38f0;\n  --mp-accent-subtle: #ede9ff;\n\n  --mp-danger: #dc2626;\n  --mp-success: #16a34a;\n\n  /* Geometry \u2014 tighter radii, more Swiss */\n  --mp-radius-sm: 4px;\n  --mp-radius: 8px;\n  --mp-radius-lg: 12px;\n\n  --mp-space-xs: 4px;\n  --mp-space-sm: 8px;\n  --mp-space-md: 16px;\n  --mp-space-lg: 24px;\n  --mp-space-xl: 32px;\n\n  --mp-shadow-sm: 0 1px 2px rgba(109,74,255,.06), 0 1px 3px rgba(0,0,0,.04);\n  --mp-shadow: 0 2px 8px rgba(109,74,255,.08), 0 1px 4px rgba(0,0,0,.04);\n\n  /* Typography \u2014 Inter optical sizing */\n  --mp-text-xs: 11px;\n  --mp-text-sm: 12px;\n  --mp-text-base: 14px;\n  --mp-text-lg: 16px;\n  --mp-text-xl: 18px;\n  --mp-text-2xl: 22px;\n\n  --mp-weight-normal: 400;\n  --mp-weight-medium: 500;\n  --mp-weight-semibold: 600;\n  --mp-weight-bold: 700;\n\n  --mp-transition: 120ms ease;\n}\n\n.mp-workbook, .mp-workbook * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }\n\n.mp-workbook {\n  font-family: var(--mp-font);\n  font-size: var(--mp-text-base);\n  color: var(--mp-text);\n  background: var(--mp-bg);\n  width: 100%;\n  min-height: 100dvh;\n  display: flex;\n  flex-direction: column;\n}\n\n/* \u2500\u2500 Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-screen {\n  display: flex;\n  flex-direction: column;\n  min-height: 100dvh;\n  background: var(--mp-bg-secondary);\n  max-width: 480px;\n  margin: 0 auto;\n  width: 100%;\n}\n\n/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--mp-space-sm);\n  padding: var(--mp-space-md) var(--mp-space-lg);\n  background: var(--mp-bg);\n  border-bottom: 1px solid var(--mp-border);\n  min-height: 52px;\n  position: sticky;\n  top: 0;\n  z-index: 10;\n}\n\n.mp-heading { font-size: var(--mp-text-xl); font-weight: var(--mp-weight-bold); color: var(--mp-text); margin: 0; line-height: 1.2; }\n.mp-header .mp-heading { font-size: var(--mp-text-lg); font-weight: var(--mp-weight-semibold); }\n.mp-subtitle { font-size: var(--mp-text-sm); color: var(--mp-text-secondary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.mp-paragraph { font-size: var(--mp-text-base); color: var(--mp-text); line-height: 1.65; margin: var(--mp-space-sm) 0; }\n.mp-timestamp { font-size: var(--mp-text-xs); color: var(--mp-text-tertiary); white-space: nowrap; }\n\n/* \u2500\u2500 Badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-badge {\n  display: inline-flex; align-items: center; justify-content: center;\n  min-width: 18px; height: 18px; padding: 0 5px;\n  background: var(--mp-accent); color: var(--mp-text-inverse);\n  font-size: 10px; font-weight: var(--mp-weight-bold);\n  border-radius: 9px; line-height: 1;\n}\n\n/* \u2500\u2500 Avatar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-avatar {\n  width: 36px; height: 36px; border-radius: 50%;\n  background: var(--mp-accent-subtle); color: var(--mp-accent);\n  font-size: var(--mp-text-xs); font-weight: var(--mp-weight-bold);\n  display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;\n}\n.mp-avatar img { width: 100%; height: 100%; object-fit: cover; }\n\n/* \u2500\u2500 Icon \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-icon { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; font-size: 14px; color: var(--mp-text-secondary); }\n\n/* \u2500\u2500 Tab bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-tab-bar {\n  display: flex; gap: 0;\n  padding: 0 var(--mp-space-lg);\n  background: var(--mp-bg);\n  border-bottom: 1px solid var(--mp-border);\n  overflow-x: auto; scrollbar-width: none;\n}\n.mp-tab-bar::-webkit-scrollbar { display: none; }\n\n.mp-tab {\n  padding: var(--mp-space-md) var(--mp-space-sm);\n  background: none; border: none; border-bottom: 2px solid transparent;\n  font-family: var(--mp-font); font-size: var(--mp-text-sm);\n  font-weight: var(--mp-weight-medium); color: var(--mp-text-secondary);\n  cursor: pointer; white-space: nowrap; margin-bottom: -1px;\n  transition: color var(--mp-transition), border-color var(--mp-transition);\n}\n.mp-tab:hover { color: var(--mp-text); }\n.mp-tab--active { color: var(--mp-accent); border-bottom-color: var(--mp-accent); font-weight: var(--mp-weight-semibold); }\n\n/* \u2500\u2500 Navigation bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-navigation-bar {\n  display: flex; background: var(--mp-bg);\n  border-top: 1px solid var(--mp-border);\n  padding: var(--mp-space-xs) 0;\n  padding-bottom: calc(var(--mp-space-xs) + env(safe-area-inset-bottom, 0px));\n  margin-top: auto;\n}\n.mp-navigation-bar--top { border-top: none; border-bottom: 1px solid var(--mp-border); margin-top: 0; }\n\n.mp-nav-item {\n  flex: 1; display: flex; flex-direction: column; align-items: center;\n  justify-content: center; gap: 2px; padding: var(--mp-space-xs) var(--mp-space-sm);\n  background: none; border: none; font-family: var(--mp-font); font-size: 10px;\n  color: var(--mp-text-tertiary); cursor: pointer; min-height: 48px;\n  transition: color var(--mp-transition);\n}\n.mp-nav-item:hover { color: var(--mp-accent); }\n\n/* \u2500\u2500 Lists \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-message-list, .mp-card-list, .mp-list {\n  display: flex; flex-direction: column; flex: 1; overflow-y: auto;\n  padding: var(--mp-space-md);\n  gap: var(--mp-space-sm);\n}\n\n/* \u2500\u2500 Message card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-message-card {\n  display: grid;\n  grid-template-columns: 36px 1fr auto;\n  grid-template-rows: auto auto;\n  gap: 2px var(--mp-space-md);\n  padding: var(--mp-space-md);\n  border-radius: var(--mp-radius);\n  background: var(--mp-bg);\n  box-shadow: var(--mp-shadow-sm);\n  transition: box-shadow var(--mp-transition);\n  align-items: start;\n}\n.mp-message-card:hover { box-shadow: var(--mp-shadow); }\n.mp-message-card:active { transform: scale(0.99); }\n.mp-message-card .mp-avatar { grid-row: 1 / 3; }\n.mp-message-card .mp-heading { font-size: var(--mp-text-base); font-weight: var(--mp-weight-semibold); }\n.mp-message-card .mp-subtitle { grid-column: 2; }\n.mp-message-card .mp-timestamp { grid-row: 1; }\n\n/* \u2500\u2500 Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-card {\n  background: var(--mp-bg);\n  border-radius: var(--mp-radius);\n  padding: var(--mp-space-lg);\n  margin: var(--mp-space-sm) var(--mp-space-md);\n  box-shadow: var(--mp-shadow-sm);\n}\n.mp-card:hover { box-shadow: var(--mp-shadow); }\n.mp-card .mp-header { border: none; padding: 0; margin-bottom: var(--mp-space-md); position: static; }\n\n/* \u2500\u2500 Form & inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-form { display: flex; flex-direction: column; gap: var(--mp-space-md); padding: var(--mp-space-lg); }\n.mp-field { display: flex; flex-direction: column; gap: var(--mp-space-xs); }\n\n.mp-field__input {\n  font-family: var(--mp-font); font-size: var(--mp-text-base); color: var(--mp-text);\n  background: var(--mp-bg); border: 1px solid var(--mp-border); border-radius: var(--mp-radius-sm);\n  padding: 10px var(--mp-space-md); width: 100%; outline: none;\n  transition: border-color var(--mp-transition), box-shadow var(--mp-transition);\n}\n.mp-field__input:focus { border-color: var(--mp-accent); box-shadow: 0 0 0 3px rgba(109,74,255,.15); }\n.mp-field__input::placeholder { color: var(--mp-text-tertiary); }\n\n.mp-button {\n  font-family: var(--mp-font); font-size: var(--mp-text-base); font-weight: var(--mp-weight-semibold);\n  color: var(--mp-text-inverse); background: var(--mp-accent); border: none;\n  border-radius: var(--mp-radius-sm); padding: 10px var(--mp-space-lg);\n  cursor: pointer; width: 100%; min-height: 42px;\n  transition: background var(--mp-transition);\n}\n.mp-button:hover { background: var(--mp-accent-hover); }\n.mp-button:active { transform: scale(0.98); }\n\n/* \u2500\u2500 Toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-toggle { display: flex; align-items: center; gap: var(--mp-space-md); padding: var(--mp-space-md) var(--mp-space-lg); cursor: pointer; }\n.mp-toggle__input { position: absolute; opacity: 0; width: 0; height: 0; }\n.mp-toggle__track { display: inline-block; width: 40px; height: 22px; background: var(--mp-border-strong); border-radius: 11px; position: relative; transition: background var(--mp-transition); flex-shrink: 0; }\n.mp-toggle__track::after { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform var(--mp-transition); }\n.mp-toggle__input:checked + .mp-toggle__track { background: var(--mp-accent); }\n.mp-toggle__input:checked + .mp-toggle__track::after { transform: translateX(18px); }\n.mp-toggle__label { font-size: var(--mp-text-base); color: var(--mp-text); }\n\n.mp-modal { position: fixed; inset: 0; background: rgba(28,27,35,.5); display: flex; align-items: flex-end; z-index: 100; }\n.mp-modal > * { width: 100%; max-height: 80dvh; background: var(--mp-bg); border-radius: var(--mp-radius-lg) var(--mp-radius-lg) 0 0; padding: var(--mp-space-xl); overflow-y: auto; }\n.mp-toast { position: fixed; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); background: var(--mp-text); color: var(--mp-text-inverse); font-size: var(--mp-text-sm); padding: var(--mp-space-sm) var(--mp-space-lg); border-radius: var(--mp-radius); box-shadow: var(--mp-shadow); z-index: 200; white-space: nowrap; }\n.mp-banner { background: var(--mp-accent-subtle); border-left: 3px solid var(--mp-accent); padding: var(--mp-space-md) var(--mp-space-lg); font-size: var(--mp-text-sm); color: var(--mp-text); }\n";

  // src/themes/brutalist.css
  var brutalist_default = "/* \u2500\u2500 Mere: brutalist theme \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n/* Hard edges. Heavy type. No shadows. No radius. Aggressive contrast.         */\n/* Inspired by: brutalist.website, early web, raw industrial design.            */\n\n:root {\n  --mp-font: 'Arial Black', 'Arial Bold', Gadget, sans-serif;\n\n  /* Palette \u2014 stark black and white with one hot accent */\n  --mp-bg: #ffffff;\n  --mp-bg-secondary: #f0f0f0;\n  --mp-bg-hover: #e0e0e0;\n  --mp-bg-active: #000000;\n  --mp-border: #000000;\n  --mp-border-strong: #000000;\n\n  --mp-text: #000000;\n  --mp-text-secondary: #333333;\n  --mp-text-tertiary: #666666;\n  --mp-text-inverse: #ffffff;\n\n  --mp-accent: #ff0000;\n  --mp-accent-hover: #cc0000;\n  --mp-accent-subtle: #fff0f0;\n\n  --mp-danger: #ff0000;\n  --mp-success: #006600;\n\n  /* Geometry \u2014 zero radius, hard edges */\n  --mp-radius-sm: 0px;\n  --mp-radius: 0px;\n  --mp-radius-lg: 0px;\n\n  --mp-space-xs: 4px;\n  --mp-space-sm: 8px;\n  --mp-space-md: 14px;\n  --mp-space-lg: 20px;\n  --mp-space-xl: 28px;\n\n  --mp-shadow-sm: none;\n  --mp-shadow: none;\n\n  /* Typography \u2014 heavy */\n  --mp-text-xs: 11px;\n  --mp-text-sm: 13px;\n  --mp-text-base: 15px;\n  --mp-text-lg: 18px;\n  --mp-text-xl: 22px;\n  --mp-text-2xl: 28px;\n\n  --mp-weight-normal: 700;\n  --mp-weight-medium: 700;\n  --mp-weight-semibold: 900;\n  --mp-weight-bold: 900;\n\n  --mp-transition: 0ms;\n}\n\n.mp-workbook, .mp-workbook * { box-sizing: border-box; }\n\n.mp-workbook {\n  font-family: var(--mp-font);\n  font-size: var(--mp-text-base);\n  font-weight: 700;\n  color: var(--mp-text);\n  background: var(--mp-bg);\n  width: 100%;\n  min-height: 100dvh;\n  display: flex;\n  flex-direction: column;\n}\n\n/* \u2500\u2500 Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-screen {\n  display: flex;\n  flex-direction: column;\n  min-height: 100dvh;\n  background: var(--mp-bg);\n  max-width: 480px;\n  margin: 0 auto;\n  width: 100%;\n  border-left: 3px solid #000;\n  border-right: 3px solid #000;\n}\n\n/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--mp-space-sm);\n  padding: var(--mp-space-md) var(--mp-space-lg);\n  background: #000000;\n  color: #ffffff;\n  border-bottom: 3px solid #000;\n  min-height: 54px;\n  position: sticky;\n  top: 0;\n  z-index: 10;\n}\n\n.mp-heading {\n  font-size: var(--mp-text-xl);\n  font-weight: 900;\n  color: var(--mp-text);\n  margin: 0;\n  line-height: 1.1;\n  text-transform: uppercase;\n  letter-spacing: -0.02em;\n}\n.mp-header .mp-heading {\n  font-size: var(--mp-text-lg);\n  color: #ffffff;\n  text-transform: uppercase;\n}\n\n.mp-subtitle { font-size: var(--mp-text-sm); font-weight: 700; color: var(--mp-text-secondary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.mp-paragraph { font-size: var(--mp-text-base); font-weight: 700; color: var(--mp-text); line-height: 1.5; margin: var(--mp-space-sm) 0; }\n.mp-timestamp { font-size: var(--mp-text-xs); font-weight: 700; color: var(--mp-text-tertiary); white-space: nowrap; font-family: monospace; }\n\n/* \u2500\u2500 Badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-badge {\n  display: inline-flex; align-items: center; justify-content: center;\n  min-width: 22px; height: 22px; padding: 0 6px;\n  background: var(--mp-accent); color: #ffffff;\n  font-size: 11px; font-weight: 900; font-family: monospace;\n  border: 2px solid #000; line-height: 1;\n}\n\n/* \u2500\u2500 Avatar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-avatar {\n  width: 40px; height: 40px; border: 3px solid #000;\n  background: #000; color: #fff;\n  font-size: var(--mp-text-sm); font-weight: 900;\n  display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;\n  font-family: monospace;\n}\n.mp-avatar img { width: 100%; height: 100%; object-fit: cover; }\n\n.mp-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; font-size: 16px; color: #ffffff; }\n\n/* \u2500\u2500 Tab bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-tab-bar {\n  display: flex; gap: 0;\n  padding: 0;\n  background: var(--mp-bg-secondary);\n  border-bottom: 3px solid #000;\n  overflow-x: auto; scrollbar-width: none;\n}\n.mp-tab-bar::-webkit-scrollbar { display: none; }\n\n.mp-tab {\n  flex: 1; padding: var(--mp-space-md) var(--mp-space-sm);\n  background: none; border: none; border-right: 2px solid #000;\n  font-family: var(--mp-font); font-size: var(--mp-text-sm);\n  font-weight: 900; color: #000; cursor: pointer;\n  white-space: nowrap; text-transform: uppercase; letter-spacing: 0.04em;\n}\n.mp-tab:last-child { border-right: none; }\n.mp-tab:hover { background: var(--mp-bg-hover); }\n.mp-tab--active { background: #000; color: #fff; }\n\n/* \u2500\u2500 Navigation bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-navigation-bar {\n  display: flex; background: #000;\n  border-top: 3px solid #000;\n  padding: 0;\n  margin-top: auto;\n}\n.mp-navigation-bar--top { border-top: none; border-bottom: 3px solid #000; margin-top: 0; }\n\n.mp-nav-item {\n  flex: 1; display: flex; flex-direction: column; align-items: center;\n  justify-content: center; gap: 0; padding: var(--mp-space-md) var(--mp-space-sm);\n  background: none; border: none; border-right: 2px solid #333;\n  font-family: var(--mp-font); font-size: 10px; font-weight: 900;\n  color: #ffffff; cursor: pointer; min-height: 48px; text-transform: uppercase;\n}\n.mp-nav-item:last-child { border-right: none; }\n.mp-nav-item:hover { background: #222; color: var(--mp-accent); }\n\n/* \u2500\u2500 Lists \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-message-list, .mp-card-list, .mp-list {\n  display: flex; flex-direction: column; flex: 1; overflow-y: auto;\n}\n\n/* \u2500\u2500 Message card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-message-card {\n  display: grid;\n  grid-template-columns: 40px 1fr auto;\n  grid-template-rows: auto auto;\n  gap: 2px var(--mp-space-md);\n  padding: var(--mp-space-md) var(--mp-space-lg);\n  border-bottom: 2px solid #000;\n  background: var(--mp-bg);\n  align-items: start;\n}\n.mp-message-card:hover { background: var(--mp-bg-secondary); }\n.mp-message-card:active { background: #000; color: #fff; }\n.mp-message-card .mp-avatar { grid-row: 1 / 3; }\n.mp-message-card .mp-heading { font-size: var(--mp-text-base); font-weight: 900; }\n.mp-message-card .mp-subtitle { grid-column: 2; font-weight: 700; }\n.mp-message-card .mp-timestamp { grid-row: 1; }\n\n/* \u2500\u2500 Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-card {\n  background: var(--mp-bg);\n  border: 3px solid #000;\n  padding: var(--mp-space-lg);\n  margin: var(--mp-space-md);\n}\n.mp-card .mp-header { border: none; background: none; padding: 0; margin-bottom: var(--mp-space-md); position: static; color: #000; }\n.mp-card .mp-header .mp-heading { color: #000; }\n\n/* \u2500\u2500 Form & inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-form { display: flex; flex-direction: column; gap: var(--mp-space-md); padding: var(--mp-space-lg); }\n.mp-field { display: flex; flex-direction: column; gap: var(--mp-space-xs); }\n\n.mp-field__input {\n  font-family: monospace; font-size: var(--mp-text-base); font-weight: 700; color: #000;\n  background: #fff; border: 3px solid #000;\n  padding: var(--mp-space-sm) var(--mp-space-md); width: 100%; outline: none;\n}\n.mp-field__input:focus { background: #fffbe6; }\n.mp-field__input::placeholder { color: #999; font-weight: 400; }\n\n.mp-button {\n  font-family: var(--mp-font); font-size: var(--mp-text-base); font-weight: 900;\n  color: #fff; background: #000; border: 3px solid #000;\n  padding: var(--mp-space-sm) var(--mp-space-lg);\n  cursor: pointer; width: 100%; min-height: 44px; text-transform: uppercase;\n  letter-spacing: 0.06em;\n}\n.mp-button:hover { background: var(--mp-accent); border-color: var(--mp-accent); }\n.mp-button:active { transform: translate(2px, 2px); }\n\n/* \u2500\u2500 Toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.mp-toggle { display: flex; align-items: center; gap: var(--mp-space-md); padding: var(--mp-space-md) var(--mp-space-lg); cursor: pointer; border-bottom: 2px solid #000; }\n.mp-toggle__input { position: absolute; opacity: 0; width: 0; height: 0; }\n.mp-toggle__track { display: inline-block; width: 44px; height: 24px; background: #fff; border: 3px solid #000; position: relative; flex-shrink: 0; }\n.mp-toggle__track::after { content: ''; position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; background: #000; }\n.mp-toggle__input:checked + .mp-toggle__track { background: #000; }\n.mp-toggle__input:checked + .mp-toggle__track::after { transform: translateX(18px); background: #fff; }\n.mp-toggle__label { font-size: var(--mp-text-base); font-weight: 900; color: #000; text-transform: uppercase; }\n\n.mp-modal { position: fixed; inset: 0; background: rgba(0,0,0,.8); display: flex; align-items: flex-end; z-index: 100; }\n.mp-modal > * { width: 100%; max-height: 80dvh; background: #fff; border-top: 4px solid #000; padding: var(--mp-space-xl); overflow-y: auto; }\n.mp-toast { position: fixed; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); background: #000; color: #fff; font-size: var(--mp-text-sm); font-weight: 900; padding: var(--mp-space-sm) var(--mp-space-lg); border: 3px solid #ff0000; z-index: 200; white-space: nowrap; font-family: monospace; text-transform: uppercase; }\n.mp-banner { background: var(--mp-accent); color: #fff; font-weight: 900; padding: var(--mp-space-md) var(--mp-space-lg); text-transform: uppercase; }\n";

  // src/runtime/index.ts
  var THEMES = {
    "classic-light": classic_light_default,
    "proton-mail": proton_mail_default,
    "brutalist": brutalist_default
  };
  async function bootstrap(workbookEl) {
    const decl = parseWorkbook(workbookEl);
    injectTheme(decl.theme);
    const store = new Store();
    store.init(decl);
    store.actions = new Map(decl.actions.map((a) => [a.name, a]));
    const hasPersisted = decl.state.some((s) => s.persist);
    if (hasPersisted) {
      const persist = new Persist();
      await persist.init();
      await store.loadPersisted(persist);
    }
    const screenMap = new Map(decl.screens.map((s) => [s.name, s]));
    let currentScreenEl = null;
    const firstScreen = decl.screens[0]?.name ?? "";
    const host = document.createElement("div");
    host.classList.add("mp-workbook");
    workbookEl.replaceWith(host);
    function goTo(screenName) {
      const screen = screenMap.get(screenName);
      if (!screen) {
        console.warn(`[mere] Unknown screen: ${screenName}`);
        return;
      }
      if (currentScreenEl) currentScreenEl.remove();
      const el = renderNode(screen.root, store, {}, goTo);
      host.appendChild(el);
      currentScreenEl = el;
    }
    if (decl.screens.length > 0) {
      goTo(firstScreen);
    } else {
      console.warn("[mere] No screens found in workbook.");
    }
    console.log(`[mere] Loaded. Theme: ${decl.theme}. Screens: ${[...screenMap.keys()].join(", ")}`);
    window["__mereStore"] = store;
  }
  function injectTheme(name) {
    const css = THEMES[name];
    if (!css) {
      console.warn(`[mere] Unknown theme: "${name}". Falling back to classic-light.`);
      injectTheme("classic-light");
      return;
    }
    if (document.querySelector(`style[data-mere-theme="${name}"]`)) return;
    const style = document.createElement("style");
    style.dataset["mereTheme"] = name;
    style.textContent = css;
    document.head.appendChild(style);
  }
  function init() {
    const workbookEl = document.querySelector("workbook");
    if (workbookEl) {
      bootstrap(workbookEl);
    } else {
      console.warn("[mere] No <workbook> element found in document.");
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=mere-runtime.js.map
