#!/usr/bin/env node
/**
 * Reads the generated pages and pulls the real content out of them into
 * seed-data.json, so the CMS is seeded from what the site actually says rather
 * than from anything retyped by hand.
 *
 * Run from the studio directory:  node scripts/extract-seed.js
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SITE = path.join(__dirname, '..', '..')

const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8')
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/·/g, '·')
    .trim()

/** Strip tags from a fragment and collapse whitespace. */
const text = (html) => decode(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '))

// --- news ------------------------------------------------------------------
// Each item is one <a href="..."> wrapping: outlet, headline, and a
// "Read →" / "Watch →" label.
function extractNews() {
  const html = read('news.html')
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
  const anchors = main.match(/<a href="https:\/\/[^"]*"[^>]*>[\s\S]*?<\/a>/g) || []

  return anchors
    .map((a) => {
      const url = a.match(/href="([^"]+)"/)[1]
      const spans = a.match(/<(?:span|div|h3)[^>]*>([\s\S]*?)<\/(?:span|div|h3)>/g) || []
      const parts = spans.map(text).filter(Boolean)
      if (parts.length < 2) return null

      const label = parts[parts.length - 1]
      const kind = /watch/i.test(label) ? 'video' : 'article'
      return { outlet: parts[0], title: parts[1], url, kind }
    })
    .filter(Boolean)
}

// --- episodes --------------------------------------------------------------
// Each row is "EP. N", a title, and a platform name, inside one anchor.
function extractEpisodes() {
  const html = read('huddle.html')
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
  const anchors = main.match(/<a href="https:\/\/[^"]*"[^>]*>[\s\S]*?<\/a>/g) || []

  return anchors
    .map((a) => {
      const body = text(a)
      const m = body.match(/EP\.\s*(\d+)\s+(.*)/)
      if (!m) return null

      const url = a.match(/href="([^"]+)"/)[1]
      const rest = m[2]
      const platform = ['Apple Podcasts', 'iHeart', 'Listen Notes', 'Spotify', 'YouTube'].find(
        (p) => rest.endsWith(p)
      )
      if (!platform) return null

      return {
        episodeNumber: Number(m[1]),
        title: rest.slice(0, rest.length - platform.length).trim(),
        platform,
        url,
      }
    })
    .filter(Boolean)
}

// --- blog ------------------------------------------------------------------
// The three cards on /blog. These are the design's sample posts — the page says
// so — but seeding them gives Ricky something shaped like a real post to edit
// rather than an empty CMS.
function extractBlog() {
  const html = read('blog.html')
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
  const cards = main.match(/<article[\s\S]*?<\/article>/g) || []

  return cards
    .map((card) => {
      const category = card.match(/<div[^>]*>([\s\S]*?)<\/div>/)
      const title = card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)
      const excerpt = card.match(/<p[^>]*>([\s\S]*?)<\/p>/)
      if (!category || !title || !excerpt) return null

      return {
        category: text(category[1]),
        title: text(title[1]),
        excerpt: text(excerpt[1]),
      }
    })
    .filter(Boolean)
}

const data = {
  news: extractNews(),
  episodes: extractEpisodes(),
  blog: extractBlog(),
}

fs.writeFileSync(
  path.join(__dirname, 'seed-data.json'),
  JSON.stringify(data, null, 2),
  'utf8'
)

console.log(`news:     ${data.news.length}`)
console.log(`episodes: ${data.episodes.length}`)
console.log(`blog:     ${data.blog.length}`)
