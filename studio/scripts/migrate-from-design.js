#!/usr/bin/env node
/**
 * One-off: lifts the blog out of the design file and into Sanity.
 *
 * The twelve articles were written into `tools/RickyHunley.com.dc.html` as a
 * `posts = [...]` array, because at the time the design was the only place
 * content lived. From here Sanity owns them, and the design's array reverts to
 * what it should always have been — sample data for previewing the template.
 *
 * Writes NDJSON to stdout; nothing is sent anywhere. Feed it to the CLI:
 *
 *   node scripts/migrate-from-design.js > /tmp/blog.ndjson
 *   npx sanity documents create --replace /tmp/blog.ndjson
 *
 * Safe to run twice: document IDs are derived from the design's slugs, so a
 * second run replaces rather than duplicates. That is the one place this breaks
 * Sanity's "let the system generate _id" rule, and it does so knowingly — a
 * migration that cannot be re-run without cleaning up after itself is worse.
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DESIGN = path.join(__dirname, '..', '..', 'tools', 'RickyHunley.com.dc.html')
const src = fs.readFileSync(DESIGN, 'utf8')

/** Same extraction `tools/build-static.js` uses, so the two cannot disagree. */
function readPosts() {
  const open = src.indexOf('  posts = [')
  if (open === -1) throw new Error('could not find the posts array')
  const close = src.indexOf('\n  ];', open)
  const literal = src.slice(open + '  posts = '.length, close + 4)
  // eslint-disable-next-line no-eval -- an array literal from a file we own.
  return eval('(' + literal + ')')
}

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

/**
 * The blog index groups posts under two headings. Which post belongs to which
 * is read out of the markup rather than restated here, so a post moved between
 * series in the design moves here too.
 *
 * Each series section is a <section> containing a heading, an intro paragraph
 * and a run of `open.<slug>` links; the numbered ones carry a two-digit span.
 */
function readSeries() {
  const blogStart = src.indexOf('<sc-if value="{{ isBlog }}"')
  const blogEnd = src.indexOf('<sc-if value="{{ isPost }}"')
  const blog = src.slice(blogStart, blogEnd)

  const out = []
  const sections = blog.split(/<section\b/).slice(1)

  for (const section of sections) {
    const heading = section.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)
    const links = [...section.matchAll(/onClick="\{\{ open\.(\w+) \}\}"([\s\S]*?)<\/a>/g)]
    // The "Latest posts" section holds the standalone cards, not a series: its
    // links carry an <img>, and it has no introductory paragraph of its own.
    if (!heading || links.length < 2 || /<img/.test(section)) continue

    const intro = section.match(/<p[^>]*>([\s\S]*?)<\/p>/)
    out.push({
      title: text(heading[1]),
      intro: intro ? text(intro[1]) : '',
      order: out.length + 1,
      members: links.map(([, slug, rest]) => {
        const num = rest.match(/min-width:34px">\s*(\d+)\s*</)
        return { slug, numberInSeries: num ? Number(num[1]) : null }
      }),
    })
  }
  return out
}

const text = (html) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Deterministic keys, so re-running produces byte-identical documents. */
const key = (...parts) =>
  crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12)

/**
 * The design's paragraph convention -> Portable Text.
 *
 * `## ` is a heading and `> ` a pull quote; article() in the design does the
 * same test, and `renderPost()` in build-static.js renders the same three
 * shapes. Keeping all three in step is the whole reason the convention is a
 * prefix rather than a separate field.
 */
function toPortableText(body, slug) {
  return body.map((raw, i) => {
    const style = raw.startsWith('## ') ? 'h2' : raw.startsWith('> ') ? 'blockquote' : 'normal'
    const value = raw.startsWith('## ') ? raw.slice(3) : raw.startsWith('> ') ? raw.slice(2) : raw
    return {
      _type: 'block',
      _key: key(slug, 'block', i),
      style,
      markDefs: [],
      children: [
        { _type: 'span', _key: key(slug, 'span', i), text: value, marks: [] },
      ],
    }
  })
}

/**
 * The design carries no dates. These preserve the order the design lists posts
 * in — newest first — one day apart, ending the day the site went live. They
 * are placeholders with the right *order*, not claims about when Ricky wrote
 * anything; he can correct any of them in the Studio.
 */
const DATE_ANCHOR = Date.parse('2026-09-01T17:00:00Z')
const dateFor = (index) =>
  new Date(DATE_ANCHOR - index * 86_400_000).toISOString()

/**
 * Card photographs for the three standalone posts.
 *
 * These are the Dropbox masters, not the downsized copies in assets/ — Sanity
 * resizes and crops on delivery, and a hotspot set on a 900px file has almost
 * nothing to work with. Uploaded once with:
 *
 *   npx sanity assets upload --file <original> --filename <name>.jpg
 *
 * Alt text is carried over from the design's own markup rather than rewritten.
 */
const COVER = {
  leadership: {
    ref: 'image-83381d833299ce6c098b4f3506fc1893a7ee03fe-1920x1484-jpg',
    alt: 'Ricky Hunley on the sideline with Arizona players during a game',
  },
  mentorship: {
    ref: 'image-6ce248a40131f34e0ee0da3814478f8d5e17f691-5683x3776-jpg',
    alt: 'Ricky Hunley speaking at a Wildcats community event',
  },
  theGame: {
    ref: 'image-5dc49758b29a526503c5b318b9b576a4bf405138-4656x3405-jpg',
    alt: 'Ricky Hunley at Arizona spring practice',
  },
}

// ---------------------------------------------------------------------------

const posts = readPosts()
const seriesList = readSeries()

const seriesIdFor = (title) => `series-${kebab(title.replace(/[^A-Za-z0-9]+/g, '-'))}`
const memberOf = new Map()
for (const s of seriesList) {
  for (const m of s.members) memberOf.set(m.slug, { series: s, ...m })
}

const docs = []

for (const s of seriesList) {
  docs.push({
    _id: seriesIdFor(s.title),
    _type: 'series',
    title: s.title,
    intro: s.intro,
    order: s.order,
  })
}

posts.forEach((p, i) => {
  const member = memberOf.get(p.slug)
  const doc = {
    _id: `blogPost-${kebab(p.slug)}`,
    _type: 'blogPost',
    title: p.title,
    slug: { _type: 'slug', current: kebab(p.slug) },
    dek: p.dek,
    category: p.category,
    publishedAt: dateFor(i),
    body: toPortableText(p.body, p.slug),
  }
  if (member) {
    doc.series = { _type: 'reference', _ref: seriesIdFor(member.series.title) }
    if (member.numberInSeries) doc.numberInSeries = member.numberInSeries
  }
  const cover = COVER[p.slug]
  if (cover) {
    doc.coverImage = {
      _type: 'image',
      asset: { _type: 'reference', _ref: cover.ref },
      alt: cover.alt,
    }
  }
  docs.push(doc)
})

// A summary on stderr so a human can check the grouping before anything is sent.
const summary = docs
  .filter((d) => d._type === 'blogPost')
  .map(
    (d) =>
      `  ${d.slug.current.padEnd(14)} ${String(d.numberInSeries ?? '–').padStart(2)}  ` +
      `${(d.series ? d.series._ref.replace('series-', '') : 'standalone').padEnd(30)} ` +
      `${d.body.length} blocks`
  )
process.stderr.write(
  `${seriesList.length} series, ${posts.length} posts\n` +
    seriesList.map((s) => `  · ${s.title} (${s.members.length})`).join('\n') +
    `\n${summary.join('\n')}\n`
)

process.stdout.write(docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
