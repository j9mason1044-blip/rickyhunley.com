#!/usr/bin/env node
/**
 * Seeds the Sanity dataset from seed-data.json (produced by extract-seed.js)
 * plus the site settings below.
 *
 * Safe to run twice: it uses `createIfNotExists`, so anything already in the
 * dataset is left completely alone. Once Ricky has edited a seeded document,
 * re-running this will not touch it.
 *
 * The IDs are derived from the content deliberately — they are markers for
 * "this was already seeded", not a modelling device. Sanity's guidance is to
 * let it generate IDs for ordinary content, and anything created in the Studio
 * from here on will do exactly that.
 *
 * Needs a token with write access:
 *   SANITY_TOKEN=<token> node scripts/seed.js
 *
 * Pass --dry to print what it would do without writing anything.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@sanity/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PROJECT_ID = '0m77etlx'
const DATASET = 'production'
const API_VERSION = '2026-09-01'

const DRY = process.argv.includes('--dry')
const token = process.env.SANITY_TOKEN

if (!token && !DRY) {
  console.error('SANITY_TOKEN is not set. Run with --dry to preview instead.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token,
  useCdn: false,
})

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8')
)

/** Stable, content-derived key so re-runs update rather than duplicate. */
const key = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

// Dates are unknown for the seeded content — these are links collected over
// time, not posts with a publication date we hold. Spacing them a day apart
// preserves the design's ordering without inventing specific dates that would
// read as fact.
const baseDate = new Date('2026-08-01T12:00:00Z')
const dayOffset = (i) =>
  new Date(baseDate.getTime() - i * 86400000).toISOString()

const docs = []

// --- site settings (singleton, fixed ID) -----------------------------------
docs.push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  email: 'connect@rickyhunley.com',
  footerBlurb:
    'College Football Hall of Famer, NFL veteran, coach and community leader. Tucson, Arizona.',
  location: 'Tucson, Arizona',
  socials: [
    {
      _key: 'instagram-personal',
      _type: 'social',
      platform: 'instagram',
      label: 'Instagram @hunley.ricky',
      url: 'https://www.instagram.com/hunley.ricky',
    },
    {
      _key: 'instagram-huddle',
      _type: 'social',
      platform: 'instagram',
      label: '@hunleyhuddle',
      url: 'https://www.instagram.com/hunleyhuddle',
    },
    {
      _key: 'email',
      _type: 'social',
      platform: 'email',
      label: 'connect@rickyhunley.com',
      url: 'mailto:connect@rickyhunley.com',
    },
  ],
})

// --- news ------------------------------------------------------------------
data.news.forEach((n, i) => {
  docs.push({
    _id: `newsItem-${key(n.outlet + '-' + n.title)}`,
    _type: 'newsItem',
    outlet: n.outlet,
    title: n.title,
    url: n.url,
    kind: n.kind,
    publishedAt: dayOffset(i),
  })
})

// --- episodes --------------------------------------------------------------
data.episodes.forEach((e) => {
  docs.push({
    _id: `episode-${e.episodeNumber}`,
    _type: 'episode',
    episodeNumber: e.episodeNumber,
    title: e.title,
    platform: e.platform,
    url: e.url,
  })
})

// --- blog ------------------------------------------------------------------
// Deliberately nothing.
//
// This used to seed three sample posts shaped like the design's placeholders:
// no body, and titles that have since been rewritten. The real twelve articles
// were migrated out of the design by `scripts/migrate-from-design.js`, and
// those three were deleted.
//
// Seeding them again would resurrect them — `createIfNotExists` only protects
// documents that are still there — and the build would put three empty pages on
// the live site. To rebuild the blog from scratch, run the migration instead;
// it is idempotent, and it writes the articles Ricky actually has.

if (DRY) {
  console.log(`${docs.length} documents would be written:\n`)
  for (const d of docs) console.log(`  ${d._type.padEnd(14)} ${d._id}`)
  process.exit(0)
}

const tx = docs.reduce((t, doc) => t.createIfNotExists(doc), client.transaction())

try {
  await tx.commit()
  const counts = docs.reduce((acc, d) => {
    acc[d._type] = (acc[d._type] || 0) + 1
    return acc
  }, {})
  console.log('seeded:')
  for (const [type, n] of Object.entries(counts)) {
    console.log(`  ${type.padEnd(14)} ${n}`)
  }
} catch (err) {
  console.error('seed failed:', err.message)
  process.exit(1)
}
