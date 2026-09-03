#!/usr/bin/env node
/**
 * Seeds the page singletons with the copy the design currently shows.
 *
 * The companion to migrate-photos.js, and the same rules: one-shot, safe to
 * re-run, and it will not overwrite something Ricky has already edited unless
 * you pass --force.
 *
 *   node studio/scripts/migrate-text.js --dry-run
 *   node studio/scripts/migrate-text.js
 *
 * The extraction itself is not in this file. It is tools/extract-page-text.js,
 * shared with tools/verify-text-roundtrip.js, which renders the result straight
 * back into the design and requires byte-identical markup. That is what makes
 * this safe to run against copy that exists nowhere else: the words written to
 * Sanity are provably the words the site already shows.
 *
 * Run the verifier before this. If it fails, this will happily write whatever
 * the bindings picked up.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const dc = require(path.join(ROOT, 'tools', 'dc-paths.js'))
const { TEXT } = require(path.join(ROOT, 'tools', 'page-text.js'))
const { PAGE_TYPES } = require(path.join(ROOT, 'tools', 'page-photos.js'))
const { extractPageText } = require(path.join(ROOT, 'tools', 'extract-page-text.js'))

const PROJECT_ID = '0m77etlx'
const DATASET = 'production'
const API = `https://${PROJECT_ID}.api.sanity.io`

const DRY = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

function readToken() {
  const cfg = path.join(os.homedir(), '.config', 'sanity', 'config.json')
  const token = JSON.parse(fs.readFileSync(cfg, 'utf8')).authToken
  if (!token) throw new Error(`no authToken in ${cfg} — run \`sanity login\``)
  return token
}
const TOKEN = DRY ? null : readToken()

// --- the design -------------------------------------------------------------

const src = fs.readFileSync(path.join(ROOT, 'tools', 'RickyHunley.com.dc.html'), 'utf8')
const body = src.slice(src.indexOf('<div style="--accent:'), src.indexOf('</x-dc>'))

function block(flag) {
  const open = `<sc-if value="{{ ${flag} }}"`
  const start = body.indexOf(open)
  if (start === -1) throw new Error(`no sc-if block for ${flag}`)
  const afterTag = body.indexOf('>', start) + 1
  let depth = 1
  let i = afterTag
  while (depth > 0) {
    const nextOpen = body.indexOf('<sc-if', i)
    const nextClose = body.indexOf('</sc-if>', i)
    if (nextClose === -1) throw new Error(`unterminated sc-if for ${flag}`)
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 6
    } else {
      depth--
      i = nextClose + 8
      if (depth === 0) return body.slice(afterTag, nextClose)
    }
  }
  throw new Error(`unreachable for ${flag}`)
}

// --- Sanity's shape ---------------------------------------------------------

/**
 * Which `_type` each array field's members carry.
 *
 * Sanity needs it on every object inside an array, and needs a `_key` too or
 * the Studio cannot tell members apart — it re-orders them on edit and drag to
 * reorder silently corrupts the list. Arrays of plain strings need neither.
 */
const MEMBER_TYPES = {
  'homePage.stats': 'stat',
  'homePage.heroButtons': 'linkCta',
  'homePage.communitySections': 'contentSection',
  'aboutPage.sections': 'contentSection',
  'aboutPage.honours': 'honour',
  'speakingPage.audiences': null, // array of strings
  'huddlePage.strands': 'strand',
  'communityPage.sections': 'contentSection',
  'contactPage.sections': 'contentSection',
}

/** Objects that are a named type wherever they appear, not just in arrays. */
const FIELD_TYPES = {
  hero: 'pageHero',
  heroButton: 'linkCta',
  closingButton: 'linkCta',
  f101Button: 'linkCta',
}

function stamp(doc, type) {
  const out = {}
  for (const [key, value] of Object.entries(doc)) {
    if (Array.isArray(value)) {
      const memberType = MEMBER_TYPES[`${type}.${key}`]
      out[key] = value.map((member, i) =>
        memberType && member && typeof member === 'object'
          ? { _type: memberType, _key: `${key}${i}`, ...member }
          : member
      )
      continue
    }
    if (value && typeof value === 'object') {
      const objType = FIELD_TYPES[key]
      out[key] = objType ? { _type: objType, ...value } : value
      continue
    }
    out[key] = value
  }
  return out
}

// --- run --------------------------------------------------------------------

async function existing(ids) {
  const q = encodeURIComponent('*[_id in $ids]{_id}')
  const p = encodeURIComponent(JSON.stringify(ids))
  const res = await fetch(`${API}/v2021-06-07/data/query/${DATASET}?query=${q}&$ids=${p}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const { result } = await res.json()
  return new Set((result || []).map((d) => d._id))
}

;(async () => {
  console.log(DRY ? 'DRY RUN — nothing will be written\n' : 'Seeding page text\n')

  const docs = []
  for (const [flag, type] of Object.entries(PAGE_TYPES)) {
    if (!(TEXT[type] || []).length) continue
    const { doc } = extractPageText(block(flag), type, dc)
    docs.push({ _id: type, _type: type, ...stamp(doc, type) })
  }

  for (const d of docs) {
    const scalars = Object.entries(d).filter(([k]) => !k.startsWith('_'))
    console.log(`  ${d._id.padEnd(14)} ${scalars.length} top-level fields`)
    if (DRY) {
      for (const [k, v] of scalars) {
        const shown = Array.isArray(v)
          ? `[${v.length}]`
          : typeof v === 'object'
            ? `{${Object.keys(v).filter((x) => !x.startsWith('_')).join(', ')}}`
            : JSON.stringify(String(v).slice(0, 56))
        console.log(`      ${k.padEnd(22)} ${shown}`)
      }
    }
  }

  if (DRY) return

  /**
   * Flatten plain objects into dotted paths, so setIfMissing works per leaf.
   *
   * This matters more than it looks. migrate-photos.js already wrote
   * `hero.image`, so `hero` exists on every page document. A setIfMissing
   * keyed on `hero` would find it present and skip the whole object — and the
   * heading, eyebrow and standfirst inside it would never be written, silently.
   * Keyed on `hero.heading` it fills the gaps beside the photograph.
   *
   * Arrays are left whole: none of them overlap with what the photo seeder
   * wrote, and setIfMissing on an array member path needs _key syntax that
   * buys nothing here.
   */
  const flatten = (value, prefix, out) => {
    for (const [key, v] of Object.entries(value)) {
      if (key.startsWith('_')) continue
      const at = prefix ? `${prefix}.${key}` : key
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, at, out)
      else out[at] = v
    }
    return out
  }

  const present = await existing(docs.map((d) => d._id))
  const mutations = docs.map((doc) => {
    if (present.has(doc._id) && !FORCE) {
      // These documents already hold the photographs. Patch the text in beside
      // them without touching anything already set.
      const { _id, _type, ...fields } = doc
      return { patch: { id: _id, setIfMissing: flatten(fields, '', {}) } }
    }
    return { createOrReplace: doc }
  })

  const res = await fetch(`${API}/v2021-06-07/data/mutate/${DATASET}?returnIds=true`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  })
  const out = await res.text()
  if (!res.ok) throw new Error(`mutate failed: ${res.status} ${out}`)

  console.log(`\nwritten. ${docs.length} page documents.`)
  if (!FORCE) console.log('Existing fields were kept; re-run with --force to overwrite.')
})().catch((e) => {
  console.error('\n' + e.message)
  process.exit(1)
})
