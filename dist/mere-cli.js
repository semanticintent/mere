#!/usr/bin/env node

// src/cli/check.ts
import { readFileSync } from "fs";
import { parse } from "node-html-parser";

// src/registry.ts
var REGISTRY = [
  // ── Structural ─────────────────────────────────────────────────────────────
  {
    tag: "screen",
    description: "A full screen. Entry point for navigation.",
    sigils: ["?"],
    attrs: ["name"],
    container: true
  },
  {
    tag: "header",
    description: "Top zone of a screen or card.",
    sigils: ["?"],
    attrs: [],
    container: true
  },
  {
    tag: "footer",
    description: "Bottom zone of a screen.",
    sigils: ["?"],
    attrs: [],
    container: true
  },
  {
    tag: "form",
    description: "Structural grouping for inputs. No implicit submit.",
    sigils: ["?"],
    attrs: [],
    container: true
  },
  // ── Text ───────────────────────────────────────────────────────────────────
  {
    tag: "heading",
    description: "Primary text \u2014 title or name.",
    sigils: ["@", "?"],
    attrs: [],
    container: false
  },
  {
    tag: "subtitle",
    description: "Secondary text \u2014 description or metadata.",
    sigils: ["@", "?"],
    attrs: [],
    container: false
  },
  {
    tag: "paragraph",
    description: "Body text. Supports multiline content.",
    sigils: ["@", "?"],
    attrs: [],
    container: false
  },
  {
    tag: "timestamp",
    description: "Date/time display. Formatted relative to now.",
    sigils: ["@", "?"],
    attrs: [],
    container: false
  },
  // ── Visual ─────────────────────────────────────────────────────────────────
  {
    tag: "badge",
    description: "Numeric or short text indicator. Hidden when value is 0 or empty.",
    sigils: ["@", "?"],
    attrs: [],
    container: false
  },
  {
    tag: "avatar",
    description: "Circular image or initials. Renders image if value is a URL.",
    sigils: ["@", "?"],
    attrs: [],
    container: false
  },
  {
    tag: "icon",
    description: "Named icon glyph.",
    sigils: ["?"],
    attrs: [],
    container: false
  },
  // ── Navigation ─────────────────────────────────────────────────────────────
  {
    tag: "tab-bar",
    description: "Horizontal tab switcher. Binds to a text state value via ~.",
    sigils: ["~", "?"],
    attrs: [],
    container: true
  },
  {
    tag: "tab",
    description: "A single tab inside a tab-bar. First positional attr is its value.",
    sigils: ["?"],
    attrs: [],
    container: false
  },
  {
    tag: "navigation-bar",
    description: "Bottom or top navigation bar. First positional attr is position.",
    sigils: ["?"],
    attrs: [],
    container: true
  },
  {
    tag: "nav-item",
    description: "Navigation action. First positional attr is the target screen name.",
    sigils: ["!", "?"],
    attrs: [],
    container: false
  },
  // ── Collections ────────────────────────────────────────────────────────────
  {
    tag: "message-list",
    description: "Renders a list of messages from a list state value via @.",
    sigils: ["@", "?"],
    attrs: [],
    container: true
  },
  {
    tag: "card-list",
    description: "Renders a list of cards from a list state value via @.",
    sigils: ["@", "?"],
    attrs: [],
    container: true
  },
  {
    tag: "list",
    description: "Generic list. Renders items from a list state value via @.",
    sigils: ["@", "?"],
    attrs: [],
    container: true
  },
  // ── Content containers ─────────────────────────────────────────────────────
  {
    tag: "message-card",
    description: "Tappable message row. Use inside message-list.",
    sigils: ["!", "?"],
    attrs: [],
    container: true,
    listItem: true
  },
  {
    tag: "card",
    description: "Content container with border and padding.",
    sigils: ["!", "?"],
    attrs: [],
    container: true,
    listItem: true
  },
  // ── Inputs ─────────────────────────────────────────────────────────────────
  {
    tag: "field",
    description: "Text input. Binds two-way to state via ~.",
    sigils: ["~", "?"],
    attrs: ["placeholder", "type", "required", "min", "max", "pattern", "autocomplete", "name"],
    container: false
  },
  {
    tag: "button",
    description: "Action trigger. Invokes an action via !.",
    sigils: ["!", "?"],
    attrs: ["type"],
    container: false
  },
  {
    tag: "toggle",
    description: "Boolean switch. Binds two-way to a boolean state via ~.",
    sigils: ["~", "?"],
    attrs: [],
    container: false
  },
  // ── Surfaces ───────────────────────────────────────────────────────────────
  {
    tag: "modal",
    description: "Full-screen overlay dialog.",
    sigils: ["?"],
    attrs: [],
    container: true
  },
  {
    tag: "toast",
    description: "Transient notification. Text content only.",
    sigils: ["?"],
    attrs: [],
    container: false
  },
  {
    tag: "banner",
    description: "Persistent inline notification strip.",
    sigils: ["?"],
    attrs: [],
    container: true
  }
];
var REGISTRY_MAP = new Map(REGISTRY.map((e) => [e.tag, e]));
var KNOWN_THEMES = [
  "classic-light",
  "proton-mail",
  "corporate-light",
  "ecommerce-hero",
  "notion-paper",
  "brutalist"
];

// src/cli/diagnostics.ts
var CODES = {
  MPD_001: { code: "MPD-001", category: "structural", severity: "error" },
  MPD_002: { code: "MPD-002", category: "unknown-element", severity: "error" },
  MPD_003: { code: "MPD-003", category: "unknown-identifier", severity: "error" },
  MPD_004: { code: "MPD-004", category: "syntax", severity: "error" },
  MPD_005: { code: "MPD-005", category: "type-mismatch", severity: "error" },
  MPD_006: { code: "MPD-006", category: "structural", severity: "error" },
  MPD_007: { code: "MPD-007", category: "structural", severity: "error" },
  MPD_008: { code: "MPD-008", category: "structural", severity: "error" },
  MPD_009: { code: "MPD-009", category: "type-mismatch", severity: "error" }
};
function offsetToLocation(source, offset) {
  const before = source.slice(0, Math.max(0, offset));
  const lines = before.split("\n");
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  const sourceLine = source.split("\n")[line - 1] ?? "";
  return { line, column, sourceLine };
}
function makeCaret(sourceLine, column, length) {
  const pad = " ".repeat(Math.max(0, column - 1));
  const hat = "^".repeat(Math.max(1, length));
  return pad + hat;
}
function makeDiagnostic(base, message, file, loc, tokenLength = 1) {
  return {
    ...base,
    message,
    file,
    line: loc.line,
    column: loc.column,
    sourceLine: loc.sourceLine,
    caret: makeCaret(loc.sourceLine, loc.column, tokenLength)
  };
}
var RESET = "\x1B[0m";
var RED = "\x1B[31m";
var YELLOW = "\x1B[33m";
var CYAN = "\x1B[36m";
var BOLD = "\x1B[1m";
var DIM = "\x1B[2m";
function formatDiagnostic(d, useColor = true) {
  const c = (s, code2) => useColor ? code2 + s + RESET : s;
  const loc = `${d.file}:${d.line}:${d.column}`;
  const sev = d.severity === "error" ? c("error", RED + BOLD) : c("warning", YELLOW + BOLD);
  const code = c(d.code, CYAN);
  const cat = c(`[${d.category}]`, DIM);
  const lineNum = String(d.line).padStart(4);
  const sep = c(" | ", DIM);
  return [
    `${c(loc, BOLD)} ${sev} ${code} ${cat}`,
    `${c(lineNum, DIM)}${sep}${d.sourceLine}`,
    `     ${sep}${c(d.caret, d.severity === "error" ? RED : YELLOW)}`,
    `  ${d.message}`
  ].join("\n");
}
function formatSummary(errors, warnings, useColor = true) {
  const c = (s, code) => useColor ? code + s + RESET : s;
  if (errors === 0 && warnings === 0) return c("\u2713 No errors", "\x1B[32m\x1B[1m");
  const parts = [];
  if (errors > 0) parts.push(c(`${errors} error${errors > 1 ? "s" : ""}`, RED + BOLD));
  if (warnings > 0) parts.push(c(`${warnings} warning${warnings > 1 ? "s" : ""}`, YELLOW + BOLD));
  return parts.join(", ");
}

// src/cli/check.ts
function checkFile(filePath) {
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    return [{
      ...CODES.MPD_001,
      message: `Cannot read file: ${filePath}`,
      file: filePath,
      line: 1,
      column: 1,
      sourceLine: "",
      caret: "^"
    }];
  }
  const root = parse(source, { comment: false });
  const diagnostics = [];
  const workbook = root.querySelector("workbook");
  if (!workbook) {
    diagnostics.push(makeDiagnostic(
      CODES.MPD_001,
      "No <workbook> root element found. Every .mp file must have a <workbook> element as its root content.",
      filePath,
      { line: 1, column: 1, sourceLine: source.split("\n")[0] ?? "" }
    ));
    return diagnostics;
  }
  const stateNames = /* @__PURE__ */ new Set();
  const computedNames = /* @__PURE__ */ new Set();
  const actionNames = /* @__PURE__ */ new Set();
  const screenNames = /* @__PURE__ */ new Set();
  const recordSchemas = /* @__PURE__ */ new Map();
  workbook.querySelectorAll("state > value").forEach((v) => {
    const name = v.getAttribute("name");
    if (!name) return;
    stateNames.add(name);
    if (v.getAttribute("type") === "record-list") {
      const fieldNames = /* @__PURE__ */ new Set();
      v.querySelectorAll("field").forEach((f) => {
        const fn = f.getAttribute("name");
        if (fn) fieldNames.add(fn);
      });
      if (fieldNames.size > 0) recordSchemas.set(name, fieldNames);
    }
  });
  workbook.querySelectorAll("computed > value").forEach((v) => {
    const name = v.getAttribute("name");
    if (name) computedNames.add(name);
  });
  workbook.querySelectorAll("actions > action").forEach((a) => {
    const name = a.getAttribute("name");
    if (name) actionNames.add(name);
  });
  workbook.querySelectorAll("screen").forEach((s) => {
    const name = s.getAttribute("name");
    if (name) screenNames.add(name);
  });
  const allStateIds = /* @__PURE__ */ new Set([...stateNames, ...computedNames]);
  const computedDeps = /* @__PURE__ */ new Map();
  workbook.querySelectorAll("computed > value").forEach((v) => {
    const name = v.getAttribute("name");
    const from = v.getAttribute("from");
    if (name && from) computedDeps.set(name, from);
  });
  for (const [name, from] of computedDeps) {
    if (computedDeps.has(from) && computedDeps.get(from) === name) {
      const loc = nodeLocation(source, workbook.querySelector(`computed > value[name="${name}"]`));
      diagnostics.push(makeDiagnostic(
        CODES.MPD_008,
        `Circular computed dependency: "${name}" \u2190 "${from}" \u2190 "${name}".`,
        filePath,
        loc,
        name.length
      ));
    }
  }
  if (recordSchemas.size > 0) {
    workbook.querySelectorAll("actions > action").forEach((action) => {
      const body = action.textContent ?? "";
      for (const rawLine of body.split("\n")) {
        const line = rawLine.trim();
        const m = line.match(/^add-to\s+(\S+)\s+(.+)$/);
        if (!m) continue;
        const listName = m[1];
        const schema = recordSchemas.get(listName);
        if (!schema) continue;
        const tokens = [];
        const tokenRe = /"[^"]*"|\S+/g;
        let tm;
        while ((tm = tokenRe.exec(m[2])) !== null) tokens.push(tm[0]);
        for (let i = 0; i < tokens.length; i += 2) {
          const key = tokens[i];
          if (!key.startsWith('"') && !schema.has(key)) {
            const actionEl = action;
            const loc = nodeLocation(source, actionEl);
            diagnostics.push(makeDiagnostic(
              CODES.MPD_009,
              `Field "${key}" is not declared in the record-list schema for "${listName}". Declared fields: ${[...schema].join(", ")}.`,
              filePath,
              loc,
              key.length
            ));
          }
        }
      }
    });
  }
  workbook.querySelectorAll("screen").forEach((screen) => {
    walkElement(screen, source, filePath, allStateIds, computedNames, actionNames, diagnostics);
  });
  return diagnostics;
}
function walkElement(el, source, file, stateIds, computedNames, actionNames, diags) {
  const tag = el.tagName?.toLowerCase() ?? "";
  if (!tag || tag === "screen") {
    el.childNodes.forEach((child) => {
      if (child.nodeType === 1) walkElement(child, source, file, stateIds, computedNames, actionNames, diags);
    });
    return;
  }
  if (!REGISTRY_MAP.has(tag)) {
    const loc = nodeLocation(source, el);
    diags.push(makeDiagnostic(
      CODES.MPD_002,
      `Unknown element <${tag}>. Not in the Mere element registry.
  Known elements: ${[...REGISTRY_MAP.keys()].join(", ")}`,
      file,
      loc,
      tag.length + 1
    ));
  }
  const attrs = el.attributes;
  const attrEntries = Object.entries(attrs);
  let i = 0;
  while (i < attrEntries.length) {
    const [attrName] = attrEntries[i];
    i++;
    if (attrName === "@" || attrName === "~" || attrName === "!") {
      const loc = nodeLocation(source, el);
      diags.push(makeDiagnostic(
        CODES.MPD_004,
        `Malformed sigil "${attrName}" \u2014 sigil must be followed immediately by an identifier, e.g. @state-name.`,
        file,
        loc,
        attrName.length
      ));
      continue;
    }
    if (attrName.startsWith("@")) {
      const statePath = attrName.slice(1).split(".")[0] ?? "";
      if (statePath && statePath !== "item" && !stateIds.has(statePath)) {
        const loc = nodeLocation(source, el);
        diags.push(makeDiagnostic(
          CODES.MPD_003,
          `"${statePath}" is not declared in <state> or <computed>.`,
          file,
          loc,
          attrName.length
        ));
      }
    } else if (attrName.startsWith("~")) {
      const stateName = attrName.slice(1);
      if (stateName && !stateIds.has(stateName)) {
        const loc = nodeLocation(source, el);
        diags.push(makeDiagnostic(
          CODES.MPD_003,
          `"${stateName}" is not declared in <state> or <computed>.`,
          file,
          loc,
          attrName.length
        ));
      }
      if (stateName && computedNames.has(stateName)) {
        const loc = nodeLocation(source, el);
        diags.push(makeDiagnostic(
          CODES.MPD_007,
          `"${stateName}" is a computed value and is read-only. Use @ for read bindings, or bind to a <state> value instead.`,
          file,
          loc,
          attrName.length
        ));
      }
    } else if (attrName.startsWith("!")) {
      const actionName = attrName.slice(1);
      if (actionName && !actionNames.has(actionName)) {
        const loc = nodeLocation(source, el);
        diags.push(makeDiagnostic(
          CODES.MPD_003,
          `"${actionName}" is not declared in <actions>.`,
          file,
          loc,
          attrName.length
        ));
      }
    }
  }
  el.childNodes.forEach((child) => {
    if (child.nodeType === 1) walkElement(child, source, file, stateIds, computedNames, actionNames, diags);
  });
}
function nodeLocation(source, el) {
  if (!el) return { line: 1, column: 1, sourceLine: source.split("\n")[0] ?? "" };
  const range = el.range;
  const offset = range?.[0] ?? 0;
  return offsetToLocation(source, offset);
}

// src/cli/schema.ts
function printSchema(asJson) {
  if (asJson) {
    console.log(JSON.stringify(REGISTRY, null, 2));
    return;
  }
  const COL = {
    tag: 18,
    sigils: 10,
    attrs: 36
  };
  const line = (s) => console.log(s);
  const pad = (s, n) => s.padEnd(n);
  const hr = "\u2500".repeat(COL.tag + COL.sigils + COL.attrs + 14);
  line("");
  line("\x1B[1mMere element registry\x1B[0m  \u2014 v0.1");
  line(hr);
  line(
    "\x1B[2m" + pad("tag", COL.tag) + pad("sigils", COL.sigils) + pad("passthrough attrs", COL.attrs) + "description\x1B[0m"
  );
  line(hr);
  for (const el of REGISTRY) {
    const sigils = el.sigils.join(" ") || "\u2014";
    const attrs = el.attrs.length ? el.attrs.join(", ") : "\u2014";
    line(
      "\x1B[36m" + pad(el.tag, COL.tag) + "\x1B[0m" + pad(sigils, COL.sigils) + pad(attrs, COL.attrs) + "\x1B[2m" + el.description + "\x1B[0m"
    );
  }
  line(hr);
  line(`\x1B[2m${REGISTRY.length} elements\x1B[0m`);
  line("");
  line("\x1B[1mThemes\x1B[0m");
  line(KNOWN_THEMES.join("  "));
  line("");
  line("\x1B[2mRun \x1B[0mmere schema --json\x1B[2m for machine-readable output.\x1B[0m");
  line("");
}

// src/cli/pack.ts
import { readFileSync as readFileSync2, writeFileSync, existsSync } from "fs";
import { resolve, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";
var RUNTIME_SCRIPT_RE = /<script\s[^>]*src=["'][^"']*mere-runtime[^"']*["'][^>]*><\/script>/i;
function loadRuntime(runtimePath) {
  if (runtimePath) {
    if (!existsSync(runtimePath)) throw new Error(`Runtime not found: ${runtimePath}`);
    return readFileSync2(runtimePath, "utf8");
  }
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const minified = resolve(thisDir, "mere-runtime.min.js");
  if (existsSync(minified)) return readFileSync2(minified, "utf8");
  const candidate = resolve(thisDir, "mere-runtime.js");
  if (existsSync(candidate)) return readFileSync2(candidate, "utf8");
  throw new Error(
    'Could not locate mere-runtime.js. Run "npm run build" in the mere project first, or pass --runtime <path> to specify it explicitly.'
  );
}
function defaultOutputPath(inputPath) {
  const dir = dirname(inputPath);
  const base = basename(inputPath);
  if (base.endsWith(".mp.html")) {
    return resolve(dir, base.replace(/\.mp\.html$/, ".packed.mp.html"));
  }
  if (base.endsWith(".mp")) {
    return resolve(dir, base.replace(/\.mp$/, ".packed.mp.html"));
  }
  const ext = extname(base);
  return resolve(dir, base.slice(0, -ext.length) + ".packed" + ext);
}
function packFile(inputPath, opts = {}) {
  const useColor = process.stdout.isTTY;
  if (!opts.skipCheck) {
    const diags = checkFile(inputPath);
    const errors = diags.filter((d) => d.severity === "error");
    if (errors.length > 0) {
      const cross = useColor ? "\x1B[31m\u2718\x1B[0m" : "\u2718";
      console.error(`${cross} ${inputPath} \u2014 failed mere check (${errors.length} error${errors.length > 1 ? "s" : ""}). Fix errors before packing.`);
      process.exit(1);
    }
  }
  const source = readFileSync2(inputPath, "utf8");
  const runtime = loadRuntime(opts.runtimePath);
  const version = extractVersion(runtime);
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const banner = `/* mere-runtime ${version} \u2014 packed ${stamp} */
`;
  const inlineTag = `<script>
${banner}${runtime}
</script>`;
  let packed;
  if (RUNTIME_SCRIPT_RE.test(source)) {
    packed = source.replace(RUNTIME_SCRIPT_RE, inlineTag);
  } else {
    if (source.includes("</head>")) {
      packed = source.replace("</head>", `${inlineTag}
</head>`);
    } else {
      packed = inlineTag + "\n" + source;
    }
  }
  const outputPath = opts.out ?? defaultOutputPath(inputPath);
  writeFileSync(outputPath, packed, "utf8");
  return {
    outputPath,
    runtimeBytes: Buffer.byteLength(runtime, "utf8"),
    totalBytes: Buffer.byteLength(packed, "utf8")
  };
}
function extractVersion(runtime) {
  const m = runtime.match(/version[:\s=]+["']?(\d+\.\d+\.\d+)["']?/i);
  return m?.[1] ?? "unknown";
}
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function runPackCommand(args2) {
  const useColor = process.stdout.isTTY;
  const files = [];
  let outPath;
  let runtimePath;
  let skipCheck = false;
  let i = 0;
  while (i < args2.length) {
    const arg = args2[i];
    if (arg === "--out" || arg === "-o") {
      outPath = args2[++i];
    } else if (arg === "--runtime") {
      runtimePath = args2[++i];
    } else if (arg === "--skip-check") {
      skipCheck = true;
    } else if (!arg.startsWith("--")) {
      files.push(arg);
    }
    i++;
  }
  if (files.length === 0) {
    console.error("Usage: mere pack <file.mp.html> [--out <path>] [--runtime <path>]");
    process.exit(1);
  }
  for (const file of files) {
    const resolved = resolve(file);
    if (!existsSync(resolved)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }
    try {
      const tick = useColor ? "\x1B[32m\u2713\x1B[0m" : "\u2713";
      const arrow = useColor ? "\x1B[2m\u2192\x1B[0m" : "\u2192";
      const dim = (s) => useColor ? `\x1B[2m${s}\x1B[0m` : s;
      const result = packFile(resolved, {
        out: outPath && files.length === 1 ? resolve(outPath) : void 0,
        runtimePath,
        skipCheck
      });
      console.log(
        `${tick} ${file} ${arrow} ${result.outputPath}
   ${dim(`runtime: ${formatBytes(result.runtimeBytes)}  \xB7  total: ${formatBytes(result.totalBytes)}  \xB7  self-contained`)}`
      );
    } catch (err) {
      const cross = useColor ? "\x1B[31m\u2718\x1B[0m" : "\u2718";
      console.error(`${cross} ${file} \u2014 ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }
}

// src/cli/inspect.ts
import { readFileSync as readFileSync3 } from "fs";
import { parse as parse2 } from "node-html-parser";
function inspectFile(filePath) {
  const base = {
    file: filePath,
    valid: false,
    name: null,
    theme: null,
    layout: "mobile",
    screens: 0,
    screenNames: [],
    stateVars: 0,
    computed: 0,
    actions: 0,
    elements: [],
    hasPersist: false,
    hasExternalFetch: false
  };
  let source;
  try {
    source = readFileSync3(filePath, "utf8");
  } catch {
    return base;
  }
  const root = parse2(source, { comment: false });
  const workbook = root.querySelector("workbook");
  if (!workbook) return base;
  base.valid = true;
  base.name = workbook.getAttribute("name") ?? null;
  base.theme = workbook.getAttribute("theme") ?? null;
  base.layout = workbook.getAttribute("layout") === "full" ? "full" : "mobile";
  const screens = workbook.querySelectorAll("screen");
  base.screens = screens.length;
  base.screenNames = screens.map((s) => s.getAttribute("name") ?? "").filter(Boolean);
  base.stateVars = workbook.querySelectorAll("state > value").length;
  base.hasPersist = workbook.querySelectorAll("state > value[persist]").length > 0;
  base.computed = workbook.querySelectorAll("computed > value").length;
  base.actions = workbook.querySelectorAll("actions > action").length;
  const structural = /* @__PURE__ */ new Set(["workbook", "screen", "state", "computed", "actions", "action", "value"]);
  const seen = /* @__PURE__ */ new Set();
  workbook.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName?.toLowerCase();
    if (tag && !structural.has(tag) && REGISTRY_MAP.has(tag)) seen.add(tag);
  });
  base.elements = [...seen].sort();
  const scripts = root.querySelectorAll("script");
  base.hasExternalFetch = scripts.some((s) => {
    const src = s.getAttribute("src") ?? "";
    if (src.includes("mere-runtime")) return false;
    const text = s.text ?? "";
    return /fetch\s*\(|XMLHttpRequest|axios/.test(text);
  });
  return base;
}
function runInspectCommand(args2) {
  const asJson = args2.includes("--json");
  const files = args2.filter((a) => !a.startsWith("--"));
  if (files.length === 0) {
    console.error("Usage: mere inspect <file.mp> [--json]");
    process.exit(1);
  }
  const reports = files.map(inspectFile);
  if (asJson) {
    console.log(JSON.stringify(files.length === 1 ? reports[0] : reports, null, 2));
    return;
  }
  for (const r of reports) {
    const col = (s) => `\x1B[2m${s}\x1B[0m`;
    console.log(`
\x1B[1m${r.file}\x1B[0m`);
    if (!r.valid) {
      console.log("  \u2717 No <workbook> root \u2014 cannot inspect");
      continue;
    }
    console.log(`  name      ${r.name ?? col("(none)")}`);
    console.log(`  theme     ${r.theme ?? col("(none)")}`);
    console.log(`  layout    ${r.layout}`);
    console.log(`  screens   ${r.screens}${r.screenNames.length ? "  " + col(r.screenNames.join(", ")) : ""}`);
    console.log(`  state     ${r.stateVars}${r.hasPersist ? "  " + col("(persisted)") : ""}`);
    console.log(`  computed  ${r.computed}`);
    console.log(`  actions   ${r.actions}`);
    console.log(`  elements  ${r.elements.length ? r.elements.join(", ") : col("(none)")}`);
    if (r.hasExternalFetch) console.log(`  \x1B[33m\u26A0 external fetch detected\x1B[0m`);
    console.log("");
  }
}

// src/cli/index.ts
var args = process.argv.slice(2);
var command = args[0];
var HELP = `
\x1B[1mMere\x1B[0m \u2014 a workbook format for apps
\x1B[2mVersion 0.1.0\x1B[0m

\x1B[1mUsage:\x1B[0m
  mere check <file.mp>    Validate a workbook. Exit 0 = clean, 1 = errors, 2 = warnings only.
  mere inspect <file.mp>  Report screens, state, elements, theme, layout \u2014 the quality profile.
  mere pack <file.mp>     Inline the runtime. Produces a fully self-contained .packed.mp.html file.
  mere schema             Print the element registry as a table.
  mere schema --json      Print the element registry as JSON.
  mere help               Show this help.

\x1B[1mmere pack options:\x1B[0m
  --out <path>            Output path (default: <name>.packed.mp.html)
  --runtime <path>        Path to mere-runtime.js (default: auto-detected)
  --skip-check            Skip mere check before packing

\x1B[1mDiagnostic codes:\x1B[0m
  MPD-001  structural        Workbook root element missing or invalid
  MPD-002  unknown-element   Tag not in the element registry
  MPD-003  unknown-id        Sigil references undeclared state or action
  MPD-004  syntax            Malformed sigil attribute
  MPD-005  type-mismatch     Binding to incompatible state type
  MPD-006  structural        Action invoked with wrong number of arguments
  MPD-007  structural        Two-way binding target is read-only (computed value)
  MPD-008  structural        Circular computed value dependency

\x1B[2mFile extension: .mp (Mere Package)\x1B[0m
`;
switch (command) {
  case "check": {
    const files = args.slice(1).filter((a) => !a.startsWith("--"));
    if (files.length === 0) {
      console.error("Usage: mere check <file.mp> [file.mp ...]");
      process.exit(1);
    }
    let totalErrors = 0;
    let totalWarnings = 0;
    const useColor = process.stdout.isTTY;
    for (const file of files) {
      const diags = checkFile(file);
      const errors = diags.filter((d) => d.severity === "error").length;
      const warnings = diags.filter((d) => d.severity === "warning").length;
      totalErrors += errors;
      totalWarnings += warnings;
      if (diags.length === 0) {
        const tick = useColor ? "\x1B[32m\u2713\x1B[0m" : "\u2713";
        console.log(`${tick} ${file} \u2014 no errors`);
      } else {
        console.log("");
        for (const d of diags) {
          console.log(formatDiagnostic(d, useColor));
          console.log("");
        }
        console.log(`${file}: ${formatSummary(errors, warnings, useColor)}`);
        console.log("");
      }
    }
    if (files.length > 1) {
      console.log(formatSummary(totalErrors, totalWarnings, useColor));
    }
    if (totalErrors > 0) process.exit(1);
    if (totalWarnings > 0) process.exit(2);
    process.exit(0);
  }
  case "inspect": {
    runInspectCommand(args.slice(1));
    process.exit(0);
  }
  case "pack": {
    runPackCommand(args.slice(1));
    process.exit(0);
  }
  case "schema": {
    const asJson = args.includes("--json");
    printSchema(asJson);
    process.exit(0);
  }
  case "help":
  case "--help":
  case "-h":
  case void 0: {
    console.log(HELP);
    process.exit(0);
  }
  default: {
    console.error(`Unknown command: ${command}`);
    console.error('Run "mere help" for usage.');
    process.exit(1);
  }
}
