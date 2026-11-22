#!/usr/bin/env node
/**
 * Keeps `.agents/skills/repo-orientation/SKILL.md` in sync with the repo.
 *
 * Regenerates the `<!-- AUTO:* -->` sections from the current repo state.
 * Hand-written content (everything outside the markers) is never touched.
 *
 *   node scripts/update-orientation.mjs
 *     Manual: always regenerates the AUTO sections.
 *
 * The git-hooks/post-commit hook runs this with ORIENTATION_HOOK=1 after every
 * commit; that mode skips work unless the last commit touched a trigger file,
 * then the hook auto-commits the refresh if anything changed.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

// ---------------------------------------------------------------------------
// Config — the only part that differs between repos
// ---------------------------------------------------------------------------
const SKILL = '.agents/skills/repo-orientation/SKILL.md'
const TRIGGERS = ['package.json', 'src/', 'prisma/', 'docs/']
const BLOCKS = [
  { id: 'COMMANDS', build: buildCommands },
  { id: 'SRC', build: () => buildTree('src') },
  { id: 'PRISMA', build: buildPrisma },
  { id: 'DOCS', build: () => buildDocs('docs') },
]

// ---------------------------------------------------------------------------
// Block builders
// ---------------------------------------------------------------------------
function buildCommands() {
  let pkg
  try {
    pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  } catch {
    return '(no package.json found)'
  }
  const entries = Object.entries(pkg.scripts ?? {})
  if (entries.length === 0) return '(no scripts in package.json)'
  return entries.map(([name, value]) => `- \`pnpm ${name}\` → \`${value}\``).join('\n')
}

function byKindThenName(a, b) {
  if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
  return a.name.localeCompare(b.name)
}

function buildTree(rootDir) {
  if (!existsSync(rootDir)) return `(${rootDir}/ does not exist yet)`
  const visible = (dir) =>
    readdirSync(dir, { withFileTypes: true }).filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
  return visible(rootDir)
    .sort(byKindThenName)
    .map((e) => {
      const rel = `${rootDir}/${e.name}`
      if (!e.isDirectory()) return `- \`${rel}\``
      const children = visible(rel)
        .map((c) => c.name + (c.isDirectory() ? '/' : ''))
        .sort()
      return `- \`${rel}/\` — ${children.join(', ') || '—'}`
    })
    .join('\n')
}

function buildPrisma() {
  let schema
  try {
    schema = readFileSync('prisma/schema.prisma', 'utf8')
  } catch {
    return '(no prisma/schema.prisma found)'
  }
  const models = [...schema.matchAll(/^model\s+(\w+)/gm)].map((m) => m[1])
  const enums = [...schema.matchAll(/^enum\s+(\w+)/gm)].map((m) => m[1])
  const lines = []
  if (models.length) lines.push(`- models: ${models.join(', ')}`)
  if (enums.length) lines.push(`- enums: ${enums.join(', ')}`)
  return lines.join('\n') || '(no models or enums in schema)'
}

function buildClinerules() {
  let text
  try {
    text = readFileSync('.clinerules', 'utf8')
  } catch {
    return '(no .clinerules file)'
  }
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `- ${l}`)
  return lines.length ? lines.join('\n') : '(.clinerules is empty)'
}

function buildDocs(rootDir = 'docs') {
  const out = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir, { withFileTypes: true })
      .filter((x) => !x.name.startsWith('.') && x.name !== 'node_modules')
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = `${dir}/${e.name}`
      if (e.isDirectory()) walk(rel)
      else out.push(`- \`${rel}\``)
    }
  }
  walk(rootDir)
  return out.length ? out.join('\n') : `(${rootDir}/ is empty)`
}

function buildRootFiles() {
  const lines = readdirSync('.', { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => `- \`${e.name}\``)
  if (existsSync('assets')) {
    const children = readdirSync('assets').sort()
    lines.push(`- \`assets/\` — ${children.join(', ') || '—'}`)
  }
  return lines.join('\n') || '(no files at repo root)'
}

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------
function lastCommitFiles() {
  try {
    const count = Number.parseInt(
      execFileSync('git', ['rev-list', '--count', 'HEAD'], { encoding: 'utf8' }).trim(),
      10,
    )
    if (!count || count < 2) return []
    return execFileSync('git', ['diff', '--name-only', 'HEAD~1', 'HEAD'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

function isTrigger(file) {
  return TRIGGERS.some((p) => {
    if (p.endsWith('/')) return file.startsWith(p)
    if (p.startsWith('*.')) return !file.includes('/') && file.endsWith(p.slice(1))
    return file === p
  })
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyBlock(content, id, body) {
  const begin = `<!-- AUTO:${id}:BEGIN -->`
  const end = `<!-- AUTO:${id}:END -->`
  if (!content.includes(begin) || !content.includes(end)) {
    console.warn(`repo-orientation: AUTO:${id} markers missing in ${SKILL}; block skipped`)
    return content
  }
  const re = new RegExp(escapeRegExp(begin) + '\n' + '[\\s\\S]*?' + escapeRegExp(end))
  return content.replace(re, `${begin}\n${body}\n${end}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
if (process.env.ORIENTATION_HOOK === '1') {
  const changed = lastCommitFiles()
  if (!changed.some(isTrigger)) {
    console.log('repo-orientation: last commit touched no trigger file; nothing to do')
    process.exit(0)
  }
}

if (!existsSync(SKILL)) {
  console.warn(`repo-orientation: ${SKILL} not found; nothing to do`)
  process.exit(0)
}

const original = readFileSync(SKILL, 'utf8')
let content = original
for (const block of BLOCKS) {
  content = applyBlock(content, block.id, block.build())
}

if (content === original) {
  console.log(`repo-orientation: ${SKILL} already up to date`)
} else {
  writeFileSync(SKILL, content)
  console.log(`repo-orientation: regenerated ${SKILL}`)
}
