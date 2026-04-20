import { readFileSync } from 'fs';
import { parse } from 'node-html-parser';
import { REGISTRY_MAP } from '../registry.js';

export interface WorkbookReport {
  file:            string
  valid:           boolean   // false = no <workbook> root
  name:            string | null
  theme:           string | null
  layout:          'mobile' | 'full'
  screens:         number
  screenNames:     string[]
  stateVars:       number
  computed:        number
  actions:         number
  elements:        string[]  // unique registered elements used
  hasPersist:      boolean
  hasExternalFetch: boolean
}

export function inspectFile(filePath: string): WorkbookReport {
  const base: WorkbookReport = {
    file: filePath, valid: false, name: null, theme: null,
    layout: 'mobile', screens: 0, screenNames: [],
    stateVars: 0, computed: 0, actions: 0, elements: [],
    hasPersist: false, hasExternalFetch: false,
  }

  let source: string
  try {
    source = readFileSync(filePath, 'utf8')
  } catch {
    return base
  }

  const root = parse(source, { comment: false })
  const workbook = root.querySelector('workbook')
  if (!workbook) return base

  base.valid  = true
  base.name   = workbook.getAttribute('name') ?? null
  base.theme  = workbook.getAttribute('theme') ?? null
  base.layout = (workbook.getAttribute('layout') === 'full') ? 'full' : 'mobile'

  // Screens
  const screens = workbook.querySelectorAll('screen')
  base.screens     = screens.length
  base.screenNames = screens.map(s => s.getAttribute('name') ?? '').filter(Boolean)

  // State
  base.stateVars = workbook.querySelectorAll('state > value').length
  base.hasPersist = workbook.querySelectorAll('state > value[persist]').length > 0

  // Computed
  base.computed = workbook.querySelectorAll('computed > value').length

  // Actions
  base.actions = workbook.querySelectorAll('actions > action').length

  // Unique registered elements (excludes structural: workbook, screen, state, computed, actions, action, value)
  const structural = new Set(['workbook','screen','state','computed','actions','action','value'])
  const seen = new Set<string>()
  workbook.querySelectorAll('*').forEach(el => {
    const tag = el.tagName?.toLowerCase()
    if (tag && !structural.has(tag) && REGISTRY_MAP.has(tag)) seen.add(tag)
  })
  base.elements = [...seen].sort()

  // External fetch — any <script> that references fetch/XMLHttpRequest outside the runtime tag
  const scripts = root.querySelectorAll('script')
  base.hasExternalFetch = scripts.some(s => {
    const src = s.getAttribute('src') ?? ''
    if (src.includes('mere-runtime')) return false
    const text = s.text ?? ''
    return /fetch\s*\(|XMLHttpRequest|axios/.test(text)
  })

  return base
}

export function runInspectCommand(args: string[]): void {
  const asJson = args.includes('--json')
  const files  = args.filter(a => !a.startsWith('--'))

  if (files.length === 0) {
    console.error('Usage: mere inspect <file.mp> [--json]')
    process.exit(1)
  }

  const reports = files.map(inspectFile)

  if (asJson) {
    console.log(JSON.stringify(files.length === 1 ? reports[0] : reports, null, 2))
    return
  }

  for (const r of reports) {
    const col = (s: string) => `\x1b[2m${s}\x1b[0m`
    console.log(`\n\x1b[1m${r.file}\x1b[0m`)
    if (!r.valid) { console.log('  ✗ No <workbook> root — cannot inspect'); continue }
    console.log(`  name      ${r.name ?? col('(none)')}`)
    console.log(`  theme     ${r.theme ?? col('(none)')}`)
    console.log(`  layout    ${r.layout}`)
    console.log(`  screens   ${r.screens}${r.screenNames.length ? '  ' + col(r.screenNames.join(', ')) : ''}`)
    console.log(`  state     ${r.stateVars}${r.hasPersist ? '  ' + col('(persisted)') : ''}`)
    console.log(`  computed  ${r.computed}`)
    console.log(`  actions   ${r.actions}`)
    console.log(`  elements  ${r.elements.length ? r.elements.join(', ') : col('(none)')}`)
    if (r.hasExternalFetch) console.log(`  \x1b[33m⚠ external fetch detected\x1b[0m`)
    console.log('')
  }
}
