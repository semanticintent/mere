import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { checkFile } from './check.js'

const RUNTIME_SCRIPT_RE = /<script\s[^>]*src=["'][^"']*mere-runtime[^"']*["'][^>]*><\/script>/i

// ─── Runtime loader ───────────────────────────────────────────────────────────

function loadRuntime(runtimePath?: string): string {
  // Explicit path override
  if (runtimePath) {
    if (!existsSync(runtimePath)) throw new Error(`Runtime not found: ${runtimePath}`)
    return readFileSync(runtimePath, 'utf8')
  }

  // Prefer minified runtime for pack; fall back to unminified
  const thisDir = dirname(fileURLToPath(import.meta.url))
  const minified = resolve(thisDir, 'mere-runtime.min.js')
  if (existsSync(minified)) return readFileSync(minified, 'utf8')
  const candidate = resolve(thisDir, 'mere-runtime.js')
  if (existsSync(candidate)) return readFileSync(candidate, 'utf8')

  throw new Error(
    'Could not locate mere-runtime.js. Run "npm run build" in the mere project first, ' +
    'or pass --runtime <path> to specify it explicitly.'
  )
}

// ─── Output path ──────────────────────────────────────────────────────────────

function defaultOutputPath(inputPath: string): string {
  const dir  = dirname(inputPath)
  const base = basename(inputPath)

  // invoice.mp.html → invoice.packed.mp.html
  if (base.endsWith('.mp.html')) {
    return resolve(dir, base.replace(/\.mp\.html$/, '.packed.mp.html'))
  }
  // invoice.mp → invoice.packed.mp.html
  if (base.endsWith('.mp')) {
    return resolve(dir, base.replace(/\.mp$/, '.packed.mp.html'))
  }
  // fallback: append .packed.html
  const ext = extname(base)
  return resolve(dir, base.slice(0, -ext.length) + '.packed' + ext)
}

// ─── Pack ─────────────────────────────────────────────────────────────────────

export function packFile(
  inputPath: string,
  opts: { out?: string; runtimePath?: string; skipCheck?: boolean } = {},
): { outputPath: string; runtimeBytes: number; totalBytes: number } {
  const useColor = process.stdout.isTTY

  // 1. Validate
  if (!opts.skipCheck) {
    const diags = checkFile(inputPath)
    const errors = diags.filter(d => d.severity === 'error')
    if (errors.length > 0) {
      const cross = useColor ? '\x1b[31m✘\x1b[0m' : '✘'
      console.error(`${cross} ${inputPath} — failed mere check (${errors.length} error${errors.length > 1 ? 's' : ''}). Fix errors before packing.`)
      process.exit(1)
    }
  }

  // 2. Read source
  const source = readFileSync(inputPath, 'utf8')

  // 3. Load runtime
  const runtime = loadRuntime(opts.runtimePath)
  const version = extractVersion(runtime)
  const stamp   = new Date().toISOString().slice(0, 10)
  const banner  = `/* mere-runtime ${version} — packed ${stamp} */\n`

  // 4. Inline runtime
  const inlineTag = `<script>\n${banner}${runtime}\n</script>`

  let packed: string
  if (RUNTIME_SCRIPT_RE.test(source)) {
    packed = source.replace(RUNTIME_SCRIPT_RE, inlineTag)
  } else {
    // No runtime script found — inject before </head>
    if (source.includes('</head>')) {
      packed = source.replace('</head>', `${inlineTag}\n</head>`)
    } else {
      packed = inlineTag + '\n' + source
    }
  }

  // 5. Write output
  const outputPath = opts.out ?? defaultOutputPath(inputPath)
  writeFileSync(outputPath, packed, 'utf8')

  return {
    outputPath,
    runtimeBytes: Buffer.byteLength(runtime, 'utf8'),
    totalBytes:   Buffer.byteLength(packed, 'utf8'),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractVersion(runtime: string): string {
  // Look for a version comment or const at the top of the bundle
  const m = runtime.match(/version[:\s=]+["']?(\d+\.\d+\.\d+)["']?/i)
  return m?.[1] ?? 'unknown'
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// ─── CLI runner ───────────────────────────────────────────────────────────────

export function runPackCommand(args: string[]): void {
  const useColor = process.stdout.isTTY

  const files: string[] = []
  let outPath: string | undefined
  let runtimePath: string | undefined
  let skipCheck = false

  let i = 0
  while (i < args.length) {
    const arg = args[i]!
    if (arg === '--out' || arg === '-o') {
      outPath = args[++i]
    } else if (arg === '--runtime') {
      runtimePath = args[++i]
    } else if (arg === '--skip-check') {
      skipCheck = true
    } else if (!arg.startsWith('--')) {
      files.push(arg)
    }
    i++
  }

  if (files.length === 0) {
    console.error('Usage: mere pack <file.mp.html> [--out <path>] [--runtime <path>]')
    process.exit(1)
  }

  for (const file of files) {
    const resolved = resolve(file)
    if (!existsSync(resolved)) {
      console.error(`File not found: ${file}`)
      process.exit(1)
    }

    try {
      const tick  = useColor ? '\x1b[32m✓\x1b[0m' : '✓'
      const arrow = useColor ? '\x1b[2m→\x1b[0m'  : '→'
      const dim   = (s: string) => useColor ? `\x1b[2m${s}\x1b[0m` : s

      const result = packFile(resolved, {
        out: outPath && files.length === 1 ? resolve(outPath) : undefined,
        runtimePath,
        skipCheck,
      })

      console.log(
        `${tick} ${file} ${arrow} ${result.outputPath}\n` +
        `   ${dim(`runtime: ${formatBytes(result.runtimeBytes)}  ·  total: ${formatBytes(result.totalBytes)}  ·  self-contained`)}`
      )
    } catch (err) {
      const cross = useColor ? '\x1b[31m✘\x1b[0m' : '✘'
      console.error(`${cross} ${file} — ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  }
}
