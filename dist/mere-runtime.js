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
    const layout = el.getAttribute("layout") ?? "mobile";
    const state = parseState(el.querySelector(":scope > state"));
    const computed = parseComputed(el.querySelector(":scope > computed"));
    const actions = parseActions(el.querySelector(":scope > actions"));
    const screens = parseScreens(el.querySelectorAll(":scope > screen"));
    const sidebarEl = el.querySelector(":scope > sidebar");
    const sidebar2 = sidebarEl ? parseNode(sidebarEl) : void 0;
    return { theme, layout, state, computed, actions, screens, sidebar: sidebar2 };
  }
  function parseState(stateEl) {
    if (!stateEl) return [];
    return Array.from(stateEl.querySelectorAll(":scope > value")).map((v) => {
      const type = v.getAttribute("type") ?? "text";
      const fields = type === "record-list" ? parseFieldDecls(v) : void 0;
      return {
        name: req(v, "name"),
        type,
        default: parseDefault(v.getAttribute("value") ?? v.getAttribute("default"), type),
        persist: v.hasAttribute("persist"),
        fields
      };
    });
  }
  function parseFieldDecls(valueEl) {
    return Array.from(valueEl.querySelectorAll(":scope > field")).map((f) => {
      const rawDefault = f.getAttribute("default") ?? void 0;
      const type = f.getAttribute("type") ?? "text";
      return {
        name: req(f, "name"),
        type,
        default: rawDefault !== void 0 ? parseDefault(rawDefault, type) : void 0
      };
    });
  }
  function parseDefault(raw, type) {
    if (raw === null) return void 0;
    if (type === "number") return Number(raw);
    if (type === "boolean") return raw === "true";
    if (type === "list" || type === "record-list" || type === "map") {
      try {
        return JSON.parse(raw);
      } catch {
        return type === "map" ? {} : [];
      }
    }
    return raw;
  }
  function parseComputed(computedEl) {
    if (!computedEl) return [];
    return Array.from(computedEl.querySelectorAll(":scope > value")).map((v) => ({
      name: req(v, "name"),
      from: req(v, "from"),
      where: v.getAttribute("where") ?? void 0,
      op: v.getAttribute("op") ?? void 0,
      field: v.getAttribute("field") ?? void 0,
      by: v.getAttribute("by") ?? void 0
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
      const removeMatch = line.match(/^remove-from\s+(\S+)\s+where\s+(.+)$/);
      if (removeMatch) {
        stmts.push({ kind: "remove-from", list: removeMatch[1], where: removeMatch[2].trim() });
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
    "style",
    // data-table column definitions
    "field",
    "label",
    "as",
    // spreadsheet / metric / kv / data-table product column
    "editable",
    "format",
    "by"
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
        let attrName = firstAttr.name;
        if (attrName.startsWith('"') && attrName.endsWith('"') || attrName.startsWith("'") && attrName.endsWith("'")) {
          attrName = attrName.slice(1, -1);
        }
        binding.positional = attrName;
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
    fieldSchemas = /* @__PURE__ */ new Map();
    persist = null;
    saveTimers = /* @__PURE__ */ new Map();
    init(decl) {
      this.computed = decl.computed;
      for (const s of decl.state) {
        this.stateDecls.set(s.name, s);
        if (s.type === "record-list" && s.fields?.length) {
          this.fieldSchemas.set(s.name, s.fields);
        }
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
    has(name) {
      return this.values.has(name.split(".")[0] ?? name);
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
          if (stmt.where && stmt.target.includes(".")) {
            this.setWhere(stmt.target, stmt.value, stmt.where, scope, context);
          } else if (stmt.where) {
            const src = this.values.get(stmt.value);
            if (Array.isArray(src)) {
              const match = src.find(
                (item) => evalWhere(stmt.where, item, this, scope)
              );
              this.set(stmt.target, match ?? {});
            }
          } else if (stmt.target.includes("=")) {
          } else {
            if (stmt.value.startsWith('"')) {
              this.set(stmt.target, stmt.value.slice(1, -1));
            } else {
              const src = this.values.get(stmt.value);
              this.set(stmt.target, src ?? scope[stmt.value] ?? value);
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
            const schema = this.fieldSchemas.get(stmt.list);
            if (schema) {
              for (const fieldDecl of schema) {
                if (!(fieldDecl.name in item) && fieldDecl.default !== void 0) {
                  item[fieldDecl.name] = coerceField(fieldDecl.default, fieldDecl.type);
                }
              }
            }
            if (!item["id"]) item["id"] = String(Date.now() + Math.random());
            if (!item["received-at"]) item["received-at"] = (/* @__PURE__ */ new Date()).toISOString();
            this.set(stmt.list, [...list, item]);
          }
        } else if (stmt.kind === "remove-from") {
          const list = this.values.get(stmt.list);
          if (Array.isArray(list)) {
            const updated = list.filter(
              (item) => !evalWhere(stmt.where, item, this, scope)
            );
            this.set(stmt.list, updated);
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
        const sources = c.from.split(",").map((s) => s.trim());
        if (sources.includes(name) || whereReferencesState(c.where, name)) {
          const newVal = this.evalComputed(c);
          this.values.set(c.name, newVal);
          this.notify(c.name);
          this.recomputeDepending(c.name);
        }
      }
    }
    evalComputed(c) {
      const source = this.values.get(c.from);
      if (c.op === "subtract") {
        const [a, b] = c.from.split(",").map((n) => toNumber(this.values.get(n.trim())));
        return (a ?? 0) - (b ?? 0);
      }
      if (c.op === "add") {
        const [a, b] = c.from.split(",").map((n) => toNumber(this.values.get(n.trim())));
        return (a ?? 0) + (b ?? 0);
      }
      if (c.op === "percent") {
        const [a, b] = c.from.split(",").map((n) => toNumber(this.values.get(n.trim())));
        if (!b) return 0;
        return Math.round((a ?? 0) / b * 100);
      }
      if (c.op === "percent-of") {
        const [a, b] = c.from.split(",").map((n) => toNumber(this.values.get(n.trim())));
        return (a ?? 0) * (b ?? 0) / 100;
      }
      if (c.op === "sum-product") {
        if (!c.field || !c.by || !Array.isArray(source)) return 0;
        const filtered2 = c.where ? source.filter((item) => evalWhere(c.where, item, this)) : source;
        return filtered2.reduce(
          (acc, item) => acc + toNumber(item[c.field]) * toNumber(item[c.by]),
          0
        );
      }
      if (!Array.isArray(source)) return c.op === "count" ? 0 : 0;
      const filtered = c.where ? source.filter((item) => evalWhere(c.where, item, this)) : source;
      if (c.op === "count") return filtered.length;
      if (c.op === "sum") {
        if (!c.field) return 0;
        return filtered.reduce((acc, item) => acc + toNumber(item[c.field]), 0);
      }
      if (c.op === "avg") {
        if (!c.field || filtered.length === 0) return 0;
        const total = filtered.reduce((acc, item) => acc + toNumber(item[c.field]), 0);
        return Math.round(total / filtered.length);
      }
      return filtered;
    }
  };
  function toNumber(v) {
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseFloat(v.replace(/[^0-9.\-]/g, "")) || 0;
    return 0;
  }
  function defaultFor(type) {
    switch (type) {
      case "text":
        return "";
      case "number":
        return 0;
      case "boolean":
        return false;
      case "list":
      case "record-list":
        return [];
      case "map":
        return {};
      default:
        return null;
    }
  }
  function coerceField(value, type) {
    if (type === "number") return typeof value === "number" ? value : parseFloat(String(value)) || 0;
    if (type === "boolean") return value === true || value === "true";
    return String(value ?? "");
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
  function whereReferencesState(where, name) {
    if (!where) return false;
    const match = where.match(/^(\S+)\s*=\s*(.+)$/);
    if (!match) return false;
    const rhs = match[2].trim();
    return rhs === name && !rhs.startsWith('"') && !rhs.startsWith("'");
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
    } else if (trimmed === "true") {
      right = true;
    } else if (trimmed === "false") {
      right = false;
    } else if (scope?.[trimmed] !== void 0) {
      right = scope[trimmed];
    } else if (store.has(trimmed)) {
      right = store.get(trimmed);
    } else {
      right = trimmed;
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
      bindText(tabEl, child.text, store, context);
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
  var sidebar = (node, store, context, onGoTo, rc) => {
    const el = document.createElement("nav");
    el.classList.add("mp-sidebar");
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var sidebarBrand = (node, store, context, onGoTo) => {
    const el = div("sidebar-brand");
    el.textContent = node.text;
    return el;
  };
  var sidebarSection = (node, store, context, onGoTo, rc) => {
    const el = div("sidebar-section");
    const label = node.attrs["label"] ?? node.bindings.literal ?? node.bindings.positional ?? "";
    if (label) {
      const labelEl = span("sidebar-label");
      labelEl.textContent = label;
      el.appendChild(labelEl);
    }
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var dataTable = (node, store, context, onGoTo) => {
    const wrapper = div("data-table-wrap");
    const table = document.createElement("table");
    table.classList.add("mp-data-table");
    const stateName = node.bindings.read ?? "";
    const cols = node.children.filter((c) => c.tag === "column");
    const actionBinding = node.bindings.action;
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const col of cols) {
      const th = document.createElement("th");
      th.textContent = col.attrs["label"] ?? col.attrs["field"] ?? "";
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    const render = () => {
      tbody.innerHTML = "";
      const items = store.get(stateName, context);
      if (!Array.isArray(items)) return;
      for (const rawItem of items) {
        const item = rawItem;
        const tr = document.createElement("tr");
        tr.classList.add("mp-data-table__row");
        if (actionBinding) {
          tr.style.cursor = "pointer";
          const rowContext = { ...context, item };
          tr.addEventListener("click", () => {
            const argValues = actionBinding.args.map((a) => store.get(a, rowContext));
            store.invokeAction(actionBinding.name, actionBinding.args, argValues, onGoTo, rowContext);
          });
        }
        for (const col of cols) {
          const td = document.createElement("td");
          const field2 = col.attrs["field"] ?? "";
          const asType = col.attrs["as"] ?? "";
          const value = String(item[field2] ?? "");
          if (asType === "status-badge") {
            const badge2 = document.createElement("span");
            const slug = value.toLowerCase().replace(/[\s/]+/g, "-");
            badge2.classList.add("mp-status-badge", `mp-status-badge--${slug}`);
            badge2.textContent = value;
            td.appendChild(badge2);
          } else if (asType === "name-url") {
            const nameEl = document.createElement("div");
            nameEl.classList.add("mp-cell-name");
            nameEl.textContent = value;
            const urlEl = document.createElement("div");
            urlEl.classList.add("mp-cell-url");
            urlEl.textContent = String(item["url"] ?? "");
            td.appendChild(nameEl);
            td.appendChild(urlEl);
          } else if (asType === "contact") {
            const nameEl = document.createElement("div");
            nameEl.classList.add("mp-cell-name");
            nameEl.textContent = value;
            const emailEl = document.createElement("div");
            emailEl.classList.add("mp-cell-url");
            emailEl.textContent = String(item[field2 + "-email"] ?? item["email"] ?? "");
            td.appendChild(nameEl);
            td.appendChild(emailEl);
          } else if (asType === "currency") {
            td.textContent = formatCurrency(Number(item[field2]) || 0);
            td.style.textAlign = "right";
            td.style.fontVariantNumeric = "tabular-nums";
          } else if (asType === "product") {
            const byField = col.attrs["by"] ?? "";
            const a = Number(item[field2]) || 0;
            const b = Number(item[byField]) || 0;
            td.textContent = formatCurrency(a * b);
            td.style.textAlign = "right";
            td.style.fontVariantNumeric = "tabular-nums";
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
  var searchBar = (node, store, context, onGoTo) => {
    const wrapper = div("search-bar");
    const iconEl = document.createElement("span");
    iconEl.classList.add("mp-search-bar__icon");
    iconEl.textContent = "\u2315";
    const input = document.createElement("input");
    input.classList.add("mp-search-bar__input");
    input.type = "search";
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
  var spreadsheet = (node, store, context, onGoTo) => {
    const wrapper = div("spreadsheet-wrap");
    const table = document.createElement("table");
    table.classList.add("mp-spreadsheet");
    const stateName = node.bindings.read ?? "";
    const cols = node.children.filter((c) => c.tag === "column");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const col of cols) {
      const th = document.createElement("th");
      th.textContent = col.attrs["label"] ?? col.attrs["field"] ?? "";
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    const render = () => {
      tbody.innerHTML = "";
      const items = store.get(stateName, context);
      if (!Array.isArray(items)) return;
      items.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.classList.add("mp-spreadsheet__row");
        for (const col of cols) {
          const td = document.createElement("td");
          const fieldName = col.attrs["field"] ?? "";
          const format = col.attrs["format"] ?? "";
          const raw = item[fieldName];
          if ("editable" in col.attrs) {
            const input = document.createElement("input");
            input.classList.add("mp-spreadsheet__input");
            input.value = String(raw ?? "");
            input.addEventListener("change", () => {
              const list = store.get(stateName, context);
              if (!Array.isArray(list)) return;
              const newVal = format === "currency" || format === "number" ? parseFloat(input.value) || 0 : input.value;
              store.set(stateName, list.map(
                (it, i) => i === idx ? { ...it, [fieldName]: newVal } : it
              ));
            });
            td.appendChild(input);
          } else {
            td.textContent = format === "currency" ? formatCurrency(Number(raw) || 0) : String(raw ?? "");
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
  var metric = (node, store, context, onGoTo) => {
    const el = div("metric");
    const format = node.attrs["format"] ?? "";
    const valueEl = document.createElement("div");
    valueEl.classList.add("mp-metric__value");
    const labelEl = document.createElement("div");
    labelEl.classList.add("mp-metric__label");
    labelEl.textContent = node.text;
    const update = (v) => {
      const num = parseFloat(v) || 0;
      if (format === "currency") valueEl.textContent = formatCurrency(num);
      else if (format === "percent") valueEl.textContent = `${num}%`;
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
  var metricGroup = (node, store, context, onGoTo, rc) => {
    const el = div("metric-group");
    rc(el, node, store, context, onGoTo);
    return el;
  };
  var bar = (node, store, context, onGoTo) => {
    const wrapper = div("bar");
    const label = node.attrs["label"] ?? node.text;
    const headerEl = div("bar__header");
    const labelEl = document.createElement("span");
    labelEl.classList.add("mp-bar__label");
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.classList.add("mp-bar__value");
    headerEl.appendChild(labelEl);
    headerEl.appendChild(valueEl);
    const track = div("bar__track");
    const fill = div("bar__fill");
    track.appendChild(fill);
    if (node.bindings.read) {
      bindRead(wrapper, node.bindings.read, store, context, (v) => {
        const pct = Math.min(100, Math.max(0, parseFloat(v) || 0));
        fill.style.width = `${pct}%`;
        valueEl.textContent = `${pct}%`;
      });
    }
    wrapper.appendChild(headerEl);
    wrapper.appendChild(track);
    return wrapper;
  };
  var kv = (node, store, context, onGoTo) => {
    const el = div("kv");
    const format = node.attrs["format"] ?? "";
    const label = node.attrs["label"] ?? node.bindings.literal ?? node.bindings.positional ?? "";
    const labelEl = document.createElement("span");
    labelEl.classList.add("mp-kv__label");
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.classList.add("mp-kv__value");
    const update = (v) => {
      const num = parseFloat(v) || 0;
      if (format === "currency") valueEl.textContent = formatCurrency(num);
      else if (format === "percent") valueEl.textContent = `${num}%`;
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
    "banner": banner,
    // Full / dashboard layout
    "sidebar": sidebar,
    "sidebar-brand": sidebarBrand,
    "sidebar-section": sidebarSection,
    "data-table": dataTable,
    "column": () => {
      const el = document.createElement("span");
      el.style.display = "none";
      return el;
    },
    "search-bar": searchBar,
    // Spreadsheet + metrics
    "spreadsheet": spreadsheet,
    "metric": metric,
    "metric-group": metricGroup,
    "bar": bar,
    // Key-value row
    "kv": kv
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
  function formatCurrency(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
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
  var classic_light_default = `/* \u2500\u2500 Mere: classic-light theme \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

:root {
  --mp-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --mp-font-mono: 'SF Mono', 'Fira Code', monospace;

  /* Palette */
  --mp-bg: #ffffff;
  --mp-bg-secondary: #f7f7f8;
  --mp-bg-hover: #f0f0f2;
  --mp-bg-active: #e8e8ec;
  --mp-border: #e2e2e6;
  --mp-border-strong: #c8c8ce;

  --mp-text: #1a1a1f;
  --mp-text-secondary: #5a5a6a;
  --mp-text-tertiary: #9090a0;
  --mp-text-inverse: #ffffff;

  --mp-accent: #3b5bdb;
  --mp-accent-hover: #2f4cc0;
  --mp-accent-subtle: #e8ecfd;

  --mp-danger: #c92a2a;
  --mp-success: #2f9e44;

  /* Geometry */
  --mp-radius-sm: 6px;
  --mp-radius: 10px;
  --mp-radius-lg: 16px;

  --mp-space-xs: 4px;
  --mp-space-sm: 8px;
  --mp-space-md: 14px;
  --mp-space-lg: 20px;
  --mp-space-xl: 28px;

  --mp-shadow-sm: 0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04);
  --mp-shadow: 0 2px 8px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05);

  /* Typography */
  --mp-text-xs: 11px;
  --mp-text-sm: 13px;
  --mp-text-base: 15px;
  --mp-text-lg: 17px;
  --mp-text-xl: 20px;
  --mp-text-2xl: 24px;

  --mp-weight-normal: 400;
  --mp-weight-medium: 500;
  --mp-weight-semibold: 600;
  --mp-weight-bold: 700;

  /* Motion */
  --mp-transition: 150ms ease;
}

/* \u2500\u2500 Reset / base \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-workbook,
.mp-workbook * {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}

.mp-workbook {
  font-family: var(--mp-font);
  font-size: var(--mp-text-base);
  color: var(--mp-text);
  background: var(--mp-bg);
  width: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* \u2500\u2500 Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-screen {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--mp-bg);
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mp-space-sm);
  padding: var(--mp-space-md) var(--mp-space-lg);
  background: var(--mp-bg);
  border-bottom: 1px solid var(--mp-border);
  min-height: 56px;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* \u2500\u2500 Heading \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-heading {
  font-size: var(--mp-text-xl);
  font-weight: var(--mp-weight-bold);
  color: var(--mp-text);
  margin: 0;
  line-height: 1.2;
}

.mp-header .mp-heading {
  font-size: var(--mp-text-lg);
  font-weight: var(--mp-weight-semibold);
}

/* \u2500\u2500 Subtitle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-subtitle {
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* \u2500\u2500 Paragraph \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-paragraph {
  font-size: var(--mp-text-base);
  color: var(--mp-text);
  line-height: 1.6;
  margin: var(--mp-space-sm) 0;
}

/* \u2500\u2500 Timestamp \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-timestamp {
  font-size: var(--mp-text-xs);
  color: var(--mp-text-tertiary);
  white-space: nowrap;
}

/* \u2500\u2500 Badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--mp-accent);
  color: var(--mp-text-inverse);
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-bold);
  border-radius: 10px;
  line-height: 1;
}

/* \u2500\u2500 Avatar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--mp-accent-subtle);
  color: var(--mp-accent);
  font-size: var(--mp-text-sm);
  font-weight: var(--mp-weight-semibold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.mp-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* \u2500\u2500 Icon \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 16px;
  color: var(--mp-text-secondary);
}

/* \u2500\u2500 Tab bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-tab-bar {
  display: flex;
  gap: 2px;
  padding: var(--mp-space-xs) var(--mp-space-lg);
  background: var(--mp-bg);
  border-bottom: 1px solid var(--mp-border);
  overflow-x: auto;
  scrollbar-width: none;
}

.mp-tab-bar::-webkit-scrollbar { display: none; }

.mp-tab {
  flex: 1;
  padding: var(--mp-space-sm) var(--mp-space-md);
  background: none;
  border: none;
  border-radius: var(--mp-radius-sm);
  font-family: var(--mp-font);
  font-size: var(--mp-text-sm);
  font-weight: var(--mp-weight-medium);
  color: var(--mp-text-secondary);
  cursor: pointer;
  transition: background var(--mp-transition), color var(--mp-transition);
  white-space: nowrap;
}

.mp-tab:hover {
  background: var(--mp-bg-hover);
  color: var(--mp-text);
}

.mp-tab--active {
  background: var(--mp-accent-subtle);
  color: var(--mp-accent);
  font-weight: var(--mp-weight-semibold);
}

/* \u2500\u2500 Navigation bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-navigation-bar {
  display: flex;
  gap: 0;
  background: var(--mp-bg);
  border-top: 1px solid var(--mp-border);
  padding: var(--mp-space-xs) 0;
  padding-bottom: calc(var(--mp-space-xs) + env(safe-area-inset-bottom, 0px));
  margin-top: auto;
}

.mp-navigation-bar--top {
  border-top: none;
  border-bottom: 1px solid var(--mp-border);
  margin-top: 0;
}

.mp-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--mp-space-xs) var(--mp-space-sm);
  background: none;
  border: none;
  font-family: var(--mp-font);
  font-size: var(--mp-text-xs);
  color: var(--mp-text-tertiary);
  cursor: pointer;
  transition: color var(--mp-transition);
  min-height: 48px;
}

.mp-nav-item:hover { color: var(--mp-accent); }

/* \u2500\u2500 Lists \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-message-list,
.mp-card-list,
.mp-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

/* \u2500\u2500 Message card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-message-card {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px var(--mp-space-md);
  padding: var(--mp-space-md) var(--mp-space-lg);
  border-bottom: 1px solid var(--mp-border);
  background: var(--mp-bg);
  transition: background var(--mp-transition);
  align-items: start;
}

.mp-message-card:hover { background: var(--mp-bg-hover); }
.mp-message-card:active { background: var(--mp-bg-active); }

.mp-message-card .mp-avatar { grid-row: 1 / 3; }
.mp-message-card .mp-heading { font-size: var(--mp-text-base); font-weight: var(--mp-weight-semibold); }
.mp-message-card .mp-subtitle { grid-column: 2; }
.mp-message-card .mp-timestamp { grid-row: 1; }

/* \u2500\u2500 Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-card {
  background: var(--mp-bg);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius);
  padding: var(--mp-space-lg);
  margin: var(--mp-space-md) var(--mp-space-lg);
  box-shadow: var(--mp-shadow-sm);
  transition: box-shadow var(--mp-transition);
}

.mp-card:hover { box-shadow: var(--mp-shadow); }

.mp-card .mp-header {
  border: none;
  padding: 0;
  margin-bottom: var(--mp-space-md);
  position: static;
}

/* \u2500\u2500 Form & inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-form {
  display: flex;
  flex-direction: column;
  gap: var(--mp-space-md);
  padding: var(--mp-space-lg);
}

.mp-field {
  display: flex;
  flex-direction: column;
  gap: var(--mp-space-xs);
}

.mp-field__input {
  font-family: var(--mp-font);
  font-size: var(--mp-text-base);
  color: var(--mp-text);
  background: var(--mp-bg-secondary);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
  padding: var(--mp-space-sm) var(--mp-space-md);
  width: 100%;
  outline: none;
  transition: border-color var(--mp-transition), box-shadow var(--mp-transition);
}

.mp-field__input:focus {
  border-color: var(--mp-accent);
  box-shadow: 0 0 0 3px rgba(59, 91, 219, 0.12);
}

.mp-field__input::placeholder { color: var(--mp-text-tertiary); }

/* \u2500\u2500 Button \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-button {
  font-family: var(--mp-font);
  font-size: var(--mp-text-base);
  font-weight: var(--mp-weight-semibold);
  color: var(--mp-text-inverse);
  background: var(--mp-accent);
  border: none;
  border-radius: var(--mp-radius-sm);
  padding: var(--mp-space-sm) var(--mp-space-lg);
  cursor: pointer;
  transition: background var(--mp-transition);
  width: 100%;
  min-height: 44px;
}

.mp-button:hover { background: var(--mp-accent-hover); }
.mp-button:active { transform: scale(0.98); }

/* \u2500\u2500 Toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-toggle {
  display: flex;
  align-items: center;
  gap: var(--mp-space-md);
  padding: var(--mp-space-md) var(--mp-space-lg);
  cursor: pointer;
}

.mp-toggle__input { position: absolute; opacity: 0; width: 0; height: 0; }

.mp-toggle__track {
  display: inline-block;
  width: 44px;
  height: 26px;
  background: var(--mp-border-strong);
  border-radius: 13px;
  position: relative;
  transition: background var(--mp-transition);
  flex-shrink: 0;
}

.mp-toggle__track::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  box-shadow: var(--mp-shadow-sm);
  transition: transform var(--mp-transition);
}

.mp-toggle__input:checked + .mp-toggle__track {
  background: var(--mp-accent);
}

.mp-toggle__input:checked + .mp-toggle__track::after {
  transform: translateX(18px);
}

.mp-toggle__label {
  font-size: var(--mp-text-base);
  color: var(--mp-text);
}

/* \u2500\u2500 Modal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.mp-modal > * {
  width: 100%;
  max-height: 80dvh;
  background: var(--mp-bg);
  border-radius: var(--mp-radius-lg) var(--mp-radius-lg) 0 0;
  padding: var(--mp-space-xl);
  overflow-y: auto;
}

/* \u2500\u2500 Toast \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-toast {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  background: var(--mp-text);
  color: var(--mp-text-inverse);
  font-size: var(--mp-text-sm);
  padding: var(--mp-space-sm) var(--mp-space-lg);
  border-radius: var(--mp-radius);
  box-shadow: var(--mp-shadow);
  z-index: 200;
  white-space: nowrap;
}

/* \u2500\u2500 Banner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-banner {
  background: var(--mp-accent-subtle);
  border-left: 3px solid var(--mp-accent);
  padding: var(--mp-space-md) var(--mp-space-lg);
  font-size: var(--mp-text-sm);
  color: var(--mp-text);
}

/* \u2500\u2500 Full / dashboard layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-workbook[data-layout="full"] {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.mp-layout-inner {
  display: flex;
  flex: 1;
  min-height: 0;
}

.mp-sidebar-slot { display: contents; }

.mp-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--mp-bg-secondary);
  border-right: 1px solid var(--mp-border);
  padding: 8px 0 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.mp-sidebar-brand {
  font-size: var(--mp-text-base);
  font-weight: var(--mp-weight-bold);
  color: var(--mp-text);
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--mp-border);
  margin-bottom: 8px;
}

.mp-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 4px;
}

.mp-sidebar-label {
  display: block;
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mp-text-tertiary);
  padding: 8px 20px 4px;
}

.mp-sidebar .mp-nav-item {
  flex-direction: row;
  justify-content: flex-start;
  gap: var(--mp-space-sm);
  padding: 8px 12px;
  border-radius: var(--mp-radius-sm);
  margin: 1px 8px;
  min-height: 34px;
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
  width: auto;
}

.mp-sidebar .mp-nav-item:hover {
  background: var(--mp-bg-hover);
  color: var(--mp-text);
}

.mp-sidebar .mp-nav-item--active {
  background: var(--mp-accent-subtle);
  color: var(--mp-accent);
  font-weight: var(--mp-weight-semibold);
}

.mp-main {
  flex: 1;
  overflow-y: auto;
  background: var(--mp-bg);
  min-width: 0;
}

.mp-main .mp-screen {
  max-width: none;
  margin: 0;
  min-height: 100%;
}

/* \u2500\u2500 Data table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-data-table-wrap {
  overflow-x: auto;
  padding: var(--mp-space-md) 0;
}

.mp-data-table {
  width: 100%;
}

.mp-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mp-text-sm);
}

.mp-data-table th {
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mp-text-tertiary);
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--mp-border);
  white-space: nowrap;
}

.mp-data-table td {
  padding: 12px 12px;
  border-bottom: 1px solid var(--mp-border);
  vertical-align: middle;
  color: var(--mp-text);
}

.mp-data-table__row:hover td { background: var(--mp-bg-secondary); }
.mp-data-table__row { cursor: pointer; }

.mp-cell-name {
  font-weight: var(--mp-weight-medium);
  color: var(--mp-text);
}

.mp-cell-url {
  font-size: var(--mp-text-xs);
  color: var(--mp-text-tertiary);
  margin-top: 2px;
}

/* \u2500\u2500 Status badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-status-badge {
  display: inline-block;
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-medium);
  padding: 3px 10px;
  border-radius: 100px;
  background: var(--mp-bg-secondary);
  color: var(--mp-text-secondary);
  text-transform: capitalize;
  white-space: nowrap;
}

.mp-status-badge--active,
.mp-status-badge--approved { background: rgba(34,197,94,.12); color: #16a34a; }

.mp-status-badge--inactive,
.mp-status-badge--cancelled { background: rgba(100,116,139,.12); color: #64748b; }

.mp-status-badge--suspended,
.mp-status-badge--terminated { background: rgba(239,68,68,.12); color: #dc2626; }

.mp-status-badge--pending { background: rgba(245,158,11,.12); color: #d97706; }

/* \u2500\u2500 Search bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--mp-bg);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
  padding: 0 12px;
  height: 36px;
  max-width: 400px;
}

.mp-search-bar__icon { color: var(--mp-text-tertiary); font-size: 16px; flex-shrink: 0; }

.mp-search-bar__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--mp-font);
  font-size: var(--mp-text-sm);
  color: var(--mp-text);
}

.mp-search-bar__input::placeholder { color: var(--mp-text-tertiary); }

/* \u2500\u2500 Toolbar strip (search + actions) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-toolbar {
  display: flex;
  align-items: center;
  gap: var(--mp-space-md);
  padding: var(--mp-space-md) var(--mp-space-lg);
  flex-wrap: wrap;
}

/* Header buttons are auto-width and compact */
.mp-header .mp-button {
  width: auto;
  min-height: 32px;
  padding: 6px 14px;
  font-size: var(--mp-text-sm);
}

/* \u2500\u2500 Spreadsheet \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-spreadsheet-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
}

.mp-spreadsheet {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mp-text-sm);
}

.mp-spreadsheet thead th {
  background: var(--mp-bg-secondary);
  color: var(--mp-text-secondary);
  font-weight: 500;
  font-size: var(--mp-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  border-bottom: 1px solid var(--mp-border);
  text-align: left;
  white-space: nowrap;
}

.mp-spreadsheet__row {
  border-bottom: 1px solid var(--mp-border);
}

.mp-spreadsheet__row:last-child { border-bottom: none; }

.mp-spreadsheet__row td {
  padding: 6px 12px;
  color: var(--mp-text);
  vertical-align: middle;
}

.mp-spreadsheet__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--mp-font);
  font-size: var(--mp-text-sm);
  color: var(--mp-text);
  padding: 2px 0;
  min-width: 80px;
}

.mp-spreadsheet__input:focus {
  background: var(--mp-accent-subtle);
  border-radius: 3px;
  padding: 2px 4px;
}

/* \u2500\u2500 Metric \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-metric-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--mp-space-md);
  padding: var(--mp-space-md) 0;
}

.mp-metric {
  background: var(--mp-bg-secondary);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius);
  padding: var(--mp-space-md) var(--mp-space-lg);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mp-metric__value {
  font-size: var(--mp-text-2xl);
  font-weight: 600;
  color: var(--mp-text);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.mp-metric__label {
  font-size: var(--mp-text-xs);
  color: var(--mp-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}

/* \u2500\u2500 Bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--mp-space-sm) 0;
}

.mp-bar__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.mp-bar__label {
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
}

.mp-bar__value {
  font-size: var(--mp-text-xs);
  font-weight: 600;
  color: var(--mp-text);
  font-family: var(--mp-font-mono, monospace);
}

.mp-bar__track {
  height: 8px;
  background: var(--mp-bg-active);
  border-radius: 100px;
  overflow: hidden;
}

.mp-bar__fill {
  height: 100%;
  background: var(--mp-accent);
  border-radius: 100px;
  transition: width 0.4s ease;
}

/* \u2500\u2500 Key-value row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 7px 0;
  border-bottom: 1px solid var(--mp-border);
}

.mp-kv:last-of-type { border-bottom: none; }

.mp-kv__label {
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
}

.mp-kv__value {
  font-size: var(--mp-text-sm);
  font-weight: 500;
  color: var(--mp-text);
  font-family: var(--mp-font-mono, monospace);
  letter-spacing: -0.01em;
}
`;

  // src/themes/proton-mail.css
  var proton_mail_default = `/* \u2500\u2500 Mere: proton-mail theme \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* Clean, minimal, Swiss-influenced. Generous whitespace. Proton purple accent. */

:root {
  --mp-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Palette */
  --mp-bg: #ffffff;
  --mp-bg-secondary: #f5f4f7;
  --mp-bg-hover: #eeecf4;
  --mp-bg-active: #e4e1ef;
  --mp-border: #e8e6f0;
  --mp-border-strong: #c9c5db;

  --mp-text: #1c1b23;
  --mp-text-secondary: #534f6e;
  --mp-text-tertiary: #9b96b4;
  --mp-text-inverse: #ffffff;

  --mp-accent: #6d4aff;
  --mp-accent-hover: #5a38f0;
  --mp-accent-subtle: #ede9ff;

  --mp-danger: #dc2626;
  --mp-success: #16a34a;

  /* Geometry \u2014 tighter radii, more Swiss */
  --mp-radius-sm: 4px;
  --mp-radius: 8px;
  --mp-radius-lg: 12px;

  --mp-space-xs: 4px;
  --mp-space-sm: 8px;
  --mp-space-md: 16px;
  --mp-space-lg: 24px;
  --mp-space-xl: 32px;

  --mp-shadow-sm: 0 1px 2px rgba(109,74,255,.06), 0 1px 3px rgba(0,0,0,.04);
  --mp-shadow: 0 2px 8px rgba(109,74,255,.08), 0 1px 4px rgba(0,0,0,.04);

  /* Typography \u2014 Inter optical sizing */
  --mp-text-xs: 11px;
  --mp-text-sm: 12px;
  --mp-text-base: 14px;
  --mp-text-lg: 16px;
  --mp-text-xl: 18px;
  --mp-text-2xl: 22px;

  --mp-weight-normal: 400;
  --mp-weight-medium: 500;
  --mp-weight-semibold: 600;
  --mp-weight-bold: 700;

  --mp-transition: 120ms ease;
}

.mp-workbook, .mp-workbook * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }

.mp-workbook {
  font-family: var(--mp-font);
  font-size: var(--mp-text-base);
  color: var(--mp-text);
  background: var(--mp-bg);
  width: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* \u2500\u2500 Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-screen {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--mp-bg-secondary);
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mp-space-sm);
  padding: var(--mp-space-md) var(--mp-space-lg);
  background: var(--mp-bg);
  border-bottom: 1px solid var(--mp-border);
  min-height: 52px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.mp-heading { font-size: var(--mp-text-xl); font-weight: var(--mp-weight-bold); color: var(--mp-text); margin: 0; line-height: 1.2; }
.mp-header .mp-heading { font-size: var(--mp-text-lg); font-weight: var(--mp-weight-semibold); }
.mp-subtitle { font-size: var(--mp-text-sm); color: var(--mp-text-secondary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp-paragraph { font-size: var(--mp-text-base); color: var(--mp-text); line-height: 1.65; margin: var(--mp-space-sm) 0; }
.mp-timestamp { font-size: var(--mp-text-xs); color: var(--mp-text-tertiary); white-space: nowrap; }

/* \u2500\u2500 Badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  background: var(--mp-accent); color: var(--mp-text-inverse);
  font-size: 10px; font-weight: var(--mp-weight-bold);
  border-radius: 9px; line-height: 1;
}

/* \u2500\u2500 Avatar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--mp-accent-subtle); color: var(--mp-accent);
  font-size: var(--mp-text-xs); font-weight: var(--mp-weight-bold);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;
}
.mp-avatar img { width: 100%; height: 100%; object-fit: cover; }

/* \u2500\u2500 Icon \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-icon { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; font-size: 14px; color: var(--mp-text-secondary); }

/* \u2500\u2500 Tab bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-tab-bar {
  display: flex; gap: 0;
  padding: 0 var(--mp-space-lg);
  background: var(--mp-bg);
  border-bottom: 1px solid var(--mp-border);
  overflow-x: auto; scrollbar-width: none;
}
.mp-tab-bar::-webkit-scrollbar { display: none; }

.mp-tab {
  padding: var(--mp-space-md) var(--mp-space-sm);
  background: none; border: none; border-bottom: 2px solid transparent;
  font-family: var(--mp-font); font-size: var(--mp-text-sm);
  font-weight: var(--mp-weight-medium); color: var(--mp-text-secondary);
  cursor: pointer; white-space: nowrap; margin-bottom: -1px;
  transition: color var(--mp-transition), border-color var(--mp-transition);
}
.mp-tab:hover { color: var(--mp-text); }
.mp-tab--active { color: var(--mp-accent); border-bottom-color: var(--mp-accent); font-weight: var(--mp-weight-semibold); }

/* \u2500\u2500 Navigation bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-navigation-bar {
  display: flex; background: var(--mp-bg);
  border-top: 1px solid var(--mp-border);
  padding: var(--mp-space-xs) 0;
  padding-bottom: calc(var(--mp-space-xs) + env(safe-area-inset-bottom, 0px));
  margin-top: auto;
}
.mp-navigation-bar--top { border-top: none; border-bottom: 1px solid var(--mp-border); margin-top: 0; }

.mp-nav-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 2px; padding: var(--mp-space-xs) var(--mp-space-sm);
  background: none; border: none; font-family: var(--mp-font); font-size: 10px;
  color: var(--mp-text-tertiary); cursor: pointer; min-height: 48px;
  transition: color var(--mp-transition);
}
.mp-nav-item:hover { color: var(--mp-accent); }

/* \u2500\u2500 Lists \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-message-list, .mp-card-list, .mp-list {
  display: flex; flex-direction: column; flex: 1; overflow-y: auto;
  padding: var(--mp-space-md);
  gap: var(--mp-space-sm);
}

/* \u2500\u2500 Message card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-message-card {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px var(--mp-space-md);
  padding: var(--mp-space-md);
  border-radius: var(--mp-radius);
  background: var(--mp-bg);
  box-shadow: var(--mp-shadow-sm);
  transition: box-shadow var(--mp-transition);
  align-items: start;
}
.mp-message-card:hover { box-shadow: var(--mp-shadow); }
.mp-message-card:active { transform: scale(0.99); }
.mp-message-card .mp-avatar { grid-row: 1 / 3; }
.mp-message-card .mp-heading { font-size: var(--mp-text-base); font-weight: var(--mp-weight-semibold); }
.mp-message-card .mp-subtitle { grid-column: 2; }
.mp-message-card .mp-timestamp { grid-row: 1; }

/* \u2500\u2500 Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-card {
  background: var(--mp-bg);
  border-radius: var(--mp-radius);
  padding: var(--mp-space-lg);
  margin: var(--mp-space-sm) var(--mp-space-md);
  box-shadow: var(--mp-shadow-sm);
}
.mp-card:hover { box-shadow: var(--mp-shadow); }
.mp-card .mp-header { border: none; padding: 0; margin-bottom: var(--mp-space-md); position: static; }

/* \u2500\u2500 Form & inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-form { display: flex; flex-direction: column; gap: var(--mp-space-md); padding: var(--mp-space-lg); }
.mp-field { display: flex; flex-direction: column; gap: var(--mp-space-xs); }

.mp-field__input {
  font-family: var(--mp-font); font-size: var(--mp-text-base); color: var(--mp-text);
  background: var(--mp-bg); border: 1px solid var(--mp-border); border-radius: var(--mp-radius-sm);
  padding: 10px var(--mp-space-md); width: 100%; outline: none;
  transition: border-color var(--mp-transition), box-shadow var(--mp-transition);
}
.mp-field__input:focus { border-color: var(--mp-accent); box-shadow: 0 0 0 3px rgba(109,74,255,.15); }
.mp-field__input::placeholder { color: var(--mp-text-tertiary); }

.mp-button {
  font-family: var(--mp-font); font-size: var(--mp-text-base); font-weight: var(--mp-weight-semibold);
  color: var(--mp-text-inverse); background: var(--mp-accent); border: none;
  border-radius: var(--mp-radius-sm); padding: 10px var(--mp-space-lg);
  cursor: pointer; width: 100%; min-height: 42px;
  transition: background var(--mp-transition);
}
.mp-button:hover { background: var(--mp-accent-hover); }
.mp-button:active { transform: scale(0.98); }

/* \u2500\u2500 Toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-toggle { display: flex; align-items: center; gap: var(--mp-space-md); padding: var(--mp-space-md) var(--mp-space-lg); cursor: pointer; }
.mp-toggle__input { position: absolute; opacity: 0; width: 0; height: 0; }
.mp-toggle__track { display: inline-block; width: 40px; height: 22px; background: var(--mp-border-strong); border-radius: 11px; position: relative; transition: background var(--mp-transition); flex-shrink: 0; }
.mp-toggle__track::after { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform var(--mp-transition); }
.mp-toggle__input:checked + .mp-toggle__track { background: var(--mp-accent); }
.mp-toggle__input:checked + .mp-toggle__track::after { transform: translateX(18px); }
.mp-toggle__label { font-size: var(--mp-text-base); color: var(--mp-text); }

.mp-modal { position: fixed; inset: 0; background: rgba(28,27,35,.5); display: flex; align-items: flex-end; z-index: 100; }
.mp-modal > * { width: 100%; max-height: 80dvh; background: var(--mp-bg); border-radius: var(--mp-radius-lg) var(--mp-radius-lg) 0 0; padding: var(--mp-space-xl); overflow-y: auto; }
.mp-toast { position: fixed; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); background: var(--mp-text); color: var(--mp-text-inverse); font-size: var(--mp-text-sm); padding: var(--mp-space-sm) var(--mp-space-lg); border-radius: var(--mp-radius); box-shadow: var(--mp-shadow); z-index: 200; white-space: nowrap; }
.mp-banner { background: var(--mp-accent-subtle); border-left: 3px solid var(--mp-accent); padding: var(--mp-space-md) var(--mp-space-lg); font-size: var(--mp-text-sm); color: var(--mp-text); }
/* \u2500\u2500 Full / dashboard layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-workbook[data-layout="full"] {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.mp-layout-inner {
  display: flex;
  flex: 1;
  min-height: 0;
}

.mp-sidebar-slot { display: contents; }

.mp-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--mp-bg-secondary);
  border-right: 1px solid var(--mp-border);
  padding: 8px 0 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.mp-sidebar-brand {
  font-size: var(--mp-text-base);
  font-weight: var(--mp-weight-bold);
  color: var(--mp-text);
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--mp-border);
  margin-bottom: 8px;
}

.mp-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 4px;
}

.mp-sidebar-label {
  display: block;
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mp-text-tertiary);
  padding: 8px 20px 4px;
}

.mp-sidebar .mp-nav-item {
  flex-direction: row;
  justify-content: flex-start;
  gap: var(--mp-space-sm);
  padding: 8px 12px;
  border-radius: var(--mp-radius-sm);
  margin: 1px 8px;
  min-height: 34px;
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
  width: auto;
}

.mp-sidebar .mp-nav-item:hover {
  background: var(--mp-bg-hover);
  color: var(--mp-text);
}

.mp-sidebar .mp-nav-item--active {
  background: var(--mp-accent-subtle);
  color: var(--mp-accent);
  font-weight: var(--mp-weight-semibold);
}

.mp-main {
  flex: 1;
  overflow-y: auto;
  background: var(--mp-bg);
  min-width: 0;
}

.mp-main .mp-screen {
  max-width: none;
  margin: 0;
  min-height: 100%;
}

/* \u2500\u2500 Data table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-data-table-wrap {
  overflow-x: auto;
  padding: var(--mp-space-md) 0;
}

.mp-data-table {
  width: 100%;
}

.mp-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mp-text-sm);
}

.mp-data-table th {
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mp-text-tertiary);
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--mp-border);
  white-space: nowrap;
}

.mp-data-table td {
  padding: 12px 12px;
  border-bottom: 1px solid var(--mp-border);
  vertical-align: middle;
  color: var(--mp-text);
}

.mp-data-table__row:hover td { background: var(--mp-bg-secondary); }
.mp-data-table__row { cursor: pointer; }

.mp-cell-name {
  font-weight: var(--mp-weight-medium);
  color: var(--mp-text);
}

.mp-cell-url {
  font-size: var(--mp-text-xs);
  color: var(--mp-text-tertiary);
  margin-top: 2px;
}

/* \u2500\u2500 Status badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-status-badge {
  display: inline-block;
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-medium);
  padding: 3px 10px;
  border-radius: 100px;
  background: var(--mp-bg-secondary);
  color: var(--mp-text-secondary);
  text-transform: capitalize;
  white-space: nowrap;
}

.mp-status-badge--active,
.mp-status-badge--approved { background: rgba(34,197,94,.12); color: #16a34a; }

.mp-status-badge--inactive,
.mp-status-badge--cancelled { background: rgba(100,116,139,.12); color: #64748b; }

.mp-status-badge--suspended,
.mp-status-badge--terminated { background: rgba(239,68,68,.12); color: #dc2626; }

.mp-status-badge--pending { background: rgba(245,158,11,.12); color: #d97706; }

/* \u2500\u2500 Search bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--mp-bg);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
  padding: 0 12px;
  height: 36px;
  max-width: 400px;
}

.mp-search-bar__icon { color: var(--mp-text-tertiary); font-size: 16px; flex-shrink: 0; }

.mp-search-bar__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--mp-font);
  font-size: var(--mp-text-sm);
  color: var(--mp-text);
}

.mp-search-bar__input::placeholder { color: var(--mp-text-tertiary); }

/* \u2500\u2500 Toolbar strip (search + actions) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-toolbar {
  display: flex;
  align-items: center;
  gap: var(--mp-space-md);
  padding: var(--mp-space-md) var(--mp-space-lg);
  flex-wrap: wrap;
}

/* Header buttons are auto-width and compact */
.mp-header .mp-button {
  width: auto;
  min-height: 32px;
  padding: 6px 14px;
  font-size: var(--mp-text-sm);
}

/* \u2500\u2500 Spreadsheet \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-spreadsheet-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
}

.mp-spreadsheet {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mp-text-sm);
}

.mp-spreadsheet thead th {
  background: var(--mp-bg-secondary);
  color: var(--mp-text-secondary);
  font-weight: 500;
  font-size: var(--mp-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  border-bottom: 1px solid var(--mp-border);
  text-align: left;
  white-space: nowrap;
}

.mp-spreadsheet__row {
  border-bottom: 1px solid var(--mp-border);
}

.mp-spreadsheet__row:last-child { border-bottom: none; }

.mp-spreadsheet__row td {
  padding: 6px 12px;
  color: var(--mp-text);
  vertical-align: middle;
}

.mp-spreadsheet__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--mp-font);
  font-size: var(--mp-text-sm);
  color: var(--mp-text);
  padding: 2px 0;
  min-width: 80px;
}

.mp-spreadsheet__input:focus {
  background: var(--mp-accent-subtle);
  border-radius: 3px;
  padding: 2px 4px;
}

/* \u2500\u2500 Metric \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-metric-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--mp-space-md);
  padding: var(--mp-space-md) 0;
}

.mp-metric {
  background: var(--mp-bg-secondary);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius);
  padding: var(--mp-space-md) var(--mp-space-lg);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mp-metric__value {
  font-size: var(--mp-text-2xl);
  font-weight: 600;
  color: var(--mp-text);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.mp-metric__label {
  font-size: var(--mp-text-xs);
  color: var(--mp-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}

/* \u2500\u2500 Bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--mp-space-sm) 0;
}

.mp-bar__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.mp-bar__label {
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
}

.mp-bar__value {
  font-size: var(--mp-text-xs);
  font-weight: 600;
  color: var(--mp-text);
  font-family: var(--mp-font-mono, monospace);
}

.mp-bar__track {
  height: 8px;
  background: var(--mp-bg-active);
  border-radius: 100px;
  overflow: hidden;
}

.mp-bar__fill {
  height: 100%;
  background: var(--mp-accent);
  border-radius: 100px;
  transition: width 0.4s ease;
}

/* \u2500\u2500 Key-value row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 7px 0;
  border-bottom: 1px solid var(--mp-border);
}

.mp-kv:last-of-type { border-bottom: none; }

.mp-kv__label {
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
}

.mp-kv__value {
  font-size: var(--mp-text-sm);
  font-weight: 500;
  color: var(--mp-text);
  font-family: var(--mp-font-mono, monospace);
  letter-spacing: -0.01em;
}
`;

  // src/themes/brutalist.css
  var brutalist_default = `/* \u2500\u2500 Mere: brutalist theme \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* Hard edges. Heavy type. No shadows. No radius. Aggressive contrast.         */
/* Inspired by: brutalist.website, early web, raw industrial design.            */

:root {
  --mp-font: 'Arial Black', 'Arial Bold', Gadget, sans-serif;

  /* Palette \u2014 stark black and white with one hot accent */
  --mp-bg: #ffffff;
  --mp-bg-secondary: #f0f0f0;
  --mp-bg-hover: #e0e0e0;
  --mp-bg-active: #000000;
  --mp-border: #000000;
  --mp-border-strong: #000000;

  --mp-text: #000000;
  --mp-text-secondary: #333333;
  --mp-text-tertiary: #666666;
  --mp-text-inverse: #ffffff;

  --mp-accent: #ff0000;
  --mp-accent-hover: #cc0000;
  --mp-accent-subtle: #fff0f0;

  --mp-danger: #ff0000;
  --mp-success: #006600;

  /* Geometry \u2014 zero radius, hard edges */
  --mp-radius-sm: 0px;
  --mp-radius: 0px;
  --mp-radius-lg: 0px;

  --mp-space-xs: 4px;
  --mp-space-sm: 8px;
  --mp-space-md: 14px;
  --mp-space-lg: 20px;
  --mp-space-xl: 28px;

  --mp-shadow-sm: none;
  --mp-shadow: none;

  /* Typography \u2014 heavy */
  --mp-text-xs: 11px;
  --mp-text-sm: 13px;
  --mp-text-base: 15px;
  --mp-text-lg: 18px;
  --mp-text-xl: 22px;
  --mp-text-2xl: 28px;

  --mp-weight-normal: 700;
  --mp-weight-medium: 700;
  --mp-weight-semibold: 900;
  --mp-weight-bold: 900;

  --mp-transition: 0ms;
}

.mp-workbook, .mp-workbook * { box-sizing: border-box; }

.mp-workbook {
  font-family: var(--mp-font);
  font-size: var(--mp-text-base);
  font-weight: 700;
  color: var(--mp-text);
  background: var(--mp-bg);
  width: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* \u2500\u2500 Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-screen {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--mp-bg);
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
  border-left: 3px solid #000;
  border-right: 3px solid #000;
}

/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mp-space-sm);
  padding: var(--mp-space-md) var(--mp-space-lg);
  background: #000000;
  color: #ffffff;
  border-bottom: 3px solid #000;
  min-height: 54px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.mp-heading {
  font-size: var(--mp-text-xl);
  font-weight: 900;
  color: var(--mp-text);
  margin: 0;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}
.mp-header .mp-heading {
  font-size: var(--mp-text-lg);
  color: #ffffff;
  text-transform: uppercase;
}

.mp-subtitle { font-size: var(--mp-text-sm); font-weight: 700; color: var(--mp-text-secondary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp-paragraph { font-size: var(--mp-text-base); font-weight: 700; color: var(--mp-text); line-height: 1.5; margin: var(--mp-space-sm) 0; }
.mp-timestamp { font-size: var(--mp-text-xs); font-weight: 700; color: var(--mp-text-tertiary); white-space: nowrap; font-family: monospace; }

/* \u2500\u2500 Badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 22px; padding: 0 6px;
  background: var(--mp-accent); color: #ffffff;
  font-size: 11px; font-weight: 900; font-family: monospace;
  border: 2px solid #000; line-height: 1;
}

/* \u2500\u2500 Avatar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-avatar {
  width: 40px; height: 40px; border: 3px solid #000;
  background: #000; color: #fff;
  font-size: var(--mp-text-sm); font-weight: 900;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;
  font-family: monospace;
}
.mp-avatar img { width: 100%; height: 100%; object-fit: cover; }

.mp-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; font-size: 16px; color: #ffffff; }

/* \u2500\u2500 Tab bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-tab-bar {
  display: flex; gap: 0;
  padding: 0;
  background: var(--mp-bg-secondary);
  border-bottom: 3px solid #000;
  overflow-x: auto; scrollbar-width: none;
}
.mp-tab-bar::-webkit-scrollbar { display: none; }

.mp-tab {
  flex: 1; padding: var(--mp-space-md) var(--mp-space-sm);
  background: none; border: none; border-right: 2px solid #000;
  font-family: var(--mp-font); font-size: var(--mp-text-sm);
  font-weight: 900; color: #000; cursor: pointer;
  white-space: nowrap; text-transform: uppercase; letter-spacing: 0.04em;
}
.mp-tab:last-child { border-right: none; }
.mp-tab:hover { background: var(--mp-bg-hover); }
.mp-tab--active { background: #000; color: #fff; }

/* \u2500\u2500 Navigation bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-navigation-bar {
  display: flex; background: #000;
  border-top: 3px solid #000;
  padding: 0;
  margin-top: auto;
}
.mp-navigation-bar--top { border-top: none; border-bottom: 3px solid #000; margin-top: 0; }

.mp-nav-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 0; padding: var(--mp-space-md) var(--mp-space-sm);
  background: none; border: none; border-right: 2px solid #333;
  font-family: var(--mp-font); font-size: 10px; font-weight: 900;
  color: #ffffff; cursor: pointer; min-height: 48px; text-transform: uppercase;
}
.mp-nav-item:last-child { border-right: none; }
.mp-nav-item:hover { background: #222; color: var(--mp-accent); }

/* \u2500\u2500 Lists \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-message-list, .mp-card-list, .mp-list {
  display: flex; flex-direction: column; flex: 1; overflow-y: auto;
}

/* \u2500\u2500 Message card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-message-card {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px var(--mp-space-md);
  padding: var(--mp-space-md) var(--mp-space-lg);
  border-bottom: 2px solid #000;
  background: var(--mp-bg);
  align-items: start;
}
.mp-message-card:hover { background: var(--mp-bg-secondary); }
.mp-message-card:active { background: #000; color: #fff; }
.mp-message-card .mp-avatar { grid-row: 1 / 3; }
.mp-message-card .mp-heading { font-size: var(--mp-text-base); font-weight: 900; }
.mp-message-card .mp-subtitle { grid-column: 2; font-weight: 700; }
.mp-message-card .mp-timestamp { grid-row: 1; }

/* \u2500\u2500 Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-card {
  background: var(--mp-bg);
  border: 3px solid #000;
  padding: var(--mp-space-lg);
  margin: var(--mp-space-md);
}
.mp-card .mp-header { border: none; background: none; padding: 0; margin-bottom: var(--mp-space-md); position: static; color: #000; }
.mp-card .mp-header .mp-heading { color: #000; }

/* \u2500\u2500 Form & inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-form { display: flex; flex-direction: column; gap: var(--mp-space-md); padding: var(--mp-space-lg); }
.mp-field { display: flex; flex-direction: column; gap: var(--mp-space-xs); }

.mp-field__input {
  font-family: monospace; font-size: var(--mp-text-base); font-weight: 700; color: #000;
  background: #fff; border: 3px solid #000;
  padding: var(--mp-space-sm) var(--mp-space-md); width: 100%; outline: none;
}
.mp-field__input:focus { background: #fffbe6; }
.mp-field__input::placeholder { color: #999; font-weight: 400; }

.mp-button {
  font-family: var(--mp-font); font-size: var(--mp-text-base); font-weight: 900;
  color: #fff; background: #000; border: 3px solid #000;
  padding: var(--mp-space-sm) var(--mp-space-lg);
  cursor: pointer; width: 100%; min-height: 44px; text-transform: uppercase;
  letter-spacing: 0.06em;
}
.mp-button:hover { background: var(--mp-accent); border-color: var(--mp-accent); }
.mp-button:active { transform: translate(2px, 2px); }

/* \u2500\u2500 Toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-toggle { display: flex; align-items: center; gap: var(--mp-space-md); padding: var(--mp-space-md) var(--mp-space-lg); cursor: pointer; border-bottom: 2px solid #000; }
.mp-toggle__input { position: absolute; opacity: 0; width: 0; height: 0; }
.mp-toggle__track { display: inline-block; width: 44px; height: 24px; background: #fff; border: 3px solid #000; position: relative; flex-shrink: 0; }
.mp-toggle__track::after { content: ''; position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; background: #000; }
.mp-toggle__input:checked + .mp-toggle__track { background: #000; }
.mp-toggle__input:checked + .mp-toggle__track::after { transform: translateX(18px); background: #fff; }
.mp-toggle__label { font-size: var(--mp-text-base); font-weight: 900; color: #000; text-transform: uppercase; }

.mp-modal { position: fixed; inset: 0; background: rgba(0,0,0,.8); display: flex; align-items: flex-end; z-index: 100; }
.mp-modal > * { width: 100%; max-height: 80dvh; background: #fff; border-top: 4px solid #000; padding: var(--mp-space-xl); overflow-y: auto; }
.mp-toast { position: fixed; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); background: #000; color: #fff; font-size: var(--mp-text-sm); font-weight: 900; padding: var(--mp-space-sm) var(--mp-space-lg); border: 3px solid #ff0000; z-index: 200; white-space: nowrap; font-family: monospace; text-transform: uppercase; }
.mp-banner { background: var(--mp-accent); color: #fff; font-weight: 900; padding: var(--mp-space-md) var(--mp-space-lg); text-transform: uppercase; }
/* \u2500\u2500 Full / dashboard layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-workbook[data-layout="full"] {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.mp-layout-inner {
  display: flex;
  flex: 1;
  min-height: 0;
}

.mp-sidebar-slot { display: contents; }

.mp-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--mp-bg-secondary);
  border-right: 1px solid var(--mp-border);
  padding: 8px 0 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.mp-sidebar-brand {
  font-size: var(--mp-text-base);
  font-weight: var(--mp-weight-bold);
  color: var(--mp-text);
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--mp-border);
  margin-bottom: 8px;
}

.mp-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 4px;
}

.mp-sidebar-label {
  display: block;
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mp-text-tertiary);
  padding: 8px 20px 4px;
}

.mp-sidebar .mp-nav-item {
  flex-direction: row;
  justify-content: flex-start;
  gap: var(--mp-space-sm);
  padding: 8px 12px;
  border-radius: var(--mp-radius-sm);
  margin: 1px 8px;
  min-height: 34px;
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
  width: auto;
}

.mp-sidebar .mp-nav-item:hover {
  background: var(--mp-bg-hover);
  color: var(--mp-text);
}

.mp-sidebar .mp-nav-item--active {
  background: var(--mp-accent-subtle);
  color: var(--mp-accent);
  font-weight: var(--mp-weight-semibold);
}

.mp-main {
  flex: 1;
  overflow-y: auto;
  background: var(--mp-bg);
  min-width: 0;
}

.mp-main .mp-screen {
  max-width: none;
  margin: 0;
  min-height: 100%;
}

/* \u2500\u2500 Data table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-data-table-wrap {
  overflow-x: auto;
  padding: var(--mp-space-md) 0;
}

.mp-data-table {
  width: 100%;
}

.mp-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mp-text-sm);
}

.mp-data-table th {
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mp-text-tertiary);
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--mp-border);
  white-space: nowrap;
}

.mp-data-table td {
  padding: 12px 12px;
  border-bottom: 1px solid var(--mp-border);
  vertical-align: middle;
  color: var(--mp-text);
}

.mp-data-table__row:hover td { background: var(--mp-bg-secondary); }
.mp-data-table__row { cursor: pointer; }

.mp-cell-name {
  font-weight: var(--mp-weight-medium);
  color: var(--mp-text);
}

.mp-cell-url {
  font-size: var(--mp-text-xs);
  color: var(--mp-text-tertiary);
  margin-top: 2px;
}

/* \u2500\u2500 Status badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-status-badge {
  display: inline-block;
  font-size: var(--mp-text-xs);
  font-weight: var(--mp-weight-medium);
  padding: 3px 10px;
  border-radius: 100px;
  background: var(--mp-bg-secondary);
  color: var(--mp-text-secondary);
  text-transform: capitalize;
  white-space: nowrap;
}

.mp-status-badge--active,
.mp-status-badge--approved { background: rgba(34,197,94,.12); color: #16a34a; }

.mp-status-badge--inactive,
.mp-status-badge--cancelled { background: rgba(100,116,139,.12); color: #64748b; }

.mp-status-badge--suspended,
.mp-status-badge--terminated { background: rgba(239,68,68,.12); color: #dc2626; }

.mp-status-badge--pending { background: rgba(245,158,11,.12); color: #d97706; }

/* \u2500\u2500 Search bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--mp-bg);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
  padding: 0 12px;
  height: 36px;
  max-width: 400px;
}

.mp-search-bar__icon { color: var(--mp-text-tertiary); font-size: 16px; flex-shrink: 0; }

.mp-search-bar__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--mp-font);
  font-size: var(--mp-text-sm);
  color: var(--mp-text);
}

.mp-search-bar__input::placeholder { color: var(--mp-text-tertiary); }

/* \u2500\u2500 Toolbar strip (search + actions) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-toolbar {
  display: flex;
  align-items: center;
  gap: var(--mp-space-md);
  padding: var(--mp-space-md) var(--mp-space-lg);
  flex-wrap: wrap;
}

/* Header buttons are auto-width and compact */
.mp-header .mp-button {
  width: auto;
  min-height: 32px;
  padding: 6px 14px;
  font-size: var(--mp-text-sm);
}

/* \u2500\u2500 Spreadsheet \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-spreadsheet-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
}

.mp-spreadsheet {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mp-text-sm);
}

.mp-spreadsheet thead th {
  background: var(--mp-bg-secondary);
  color: var(--mp-text-secondary);
  font-weight: 500;
  font-size: var(--mp-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  border-bottom: 1px solid var(--mp-border);
  text-align: left;
  white-space: nowrap;
}

.mp-spreadsheet__row {
  border-bottom: 1px solid var(--mp-border);
}

.mp-spreadsheet__row:last-child { border-bottom: none; }

.mp-spreadsheet__row td {
  padding: 6px 12px;
  color: var(--mp-text);
  vertical-align: middle;
}

.mp-spreadsheet__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--mp-font);
  font-size: var(--mp-text-sm);
  color: var(--mp-text);
  padding: 2px 0;
  min-width: 80px;
}

.mp-spreadsheet__input:focus {
  background: var(--mp-accent-subtle);
  border-radius: 3px;
  padding: 2px 4px;
}

/* \u2500\u2500 Metric \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-metric-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--mp-space-md);
  padding: var(--mp-space-md) 0;
}

.mp-metric {
  background: var(--mp-bg-secondary);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius);
  padding: var(--mp-space-md) var(--mp-space-lg);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mp-metric__value {
  font-size: var(--mp-text-2xl);
  font-weight: 600;
  color: var(--mp-text);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.mp-metric__label {
  font-size: var(--mp-text-xs);
  color: var(--mp-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}

/* \u2500\u2500 Bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--mp-space-sm) 0;
}

.mp-bar__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.mp-bar__label {
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
}

.mp-bar__value {
  font-size: var(--mp-text-xs);
  font-weight: 600;
  color: var(--mp-text);
  font-family: var(--mp-font-mono, monospace);
}

.mp-bar__track {
  height: 8px;
  background: var(--mp-bg-active);
  border-radius: 100px;
  overflow: hidden;
}

.mp-bar__fill {
  height: 100%;
  background: var(--mp-accent);
  border-radius: 100px;
  transition: width 0.4s ease;
}

/* \u2500\u2500 Key-value row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mp-kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 7px 0;
  border-bottom: 1px solid var(--mp-border);
}

.mp-kv:last-of-type { border-bottom: none; }

.mp-kv__label {
  font-size: var(--mp-text-sm);
  color: var(--mp-text-secondary);
}

.mp-kv__value {
  font-size: var(--mp-text-sm);
  font-weight: 500;
  color: var(--mp-text);
  font-family: var(--mp-font-mono, monospace);
  letter-spacing: -0.01em;
}
`;

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
    if (decl.layout === "full") host.dataset["layout"] = "full";
    workbookEl.replaceWith(host);
    let renderTarget = host;
    let sidebarSlot = null;
    if (decl.layout === "full") {
      const inner = document.createElement("div");
      inner.classList.add("mp-layout-inner");
      host.appendChild(inner);
      sidebarSlot = document.createElement("div");
      sidebarSlot.classList.add("mp-sidebar-slot");
      inner.appendChild(sidebarSlot);
      const main = document.createElement("div");
      main.classList.add("mp-main");
      inner.appendChild(main);
      renderTarget = main;
    }
    function goTo(screenName) {
      const screen = screenMap.get(screenName);
      if (!screen) {
        console.warn(`[mere] Unknown screen: ${screenName}`);
        return;
      }
      if (currentScreenEl) currentScreenEl.remove();
      const el = renderNode(screen.root, store, {}, goTo);
      renderTarget.appendChild(el);
      currentScreenEl = el;
      host.querySelectorAll(".mp-nav-item[data-target]").forEach((btn) => {
        btn.classList.toggle("mp-nav-item--active", btn.dataset["target"] === screenName);
      });
    }
    if (decl.layout === "full" && decl.sidebar && sidebarSlot) {
      const sidebarEl = renderNode(decl.sidebar, store, {}, goTo);
      sidebarSlot.appendChild(sidebarEl);
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
