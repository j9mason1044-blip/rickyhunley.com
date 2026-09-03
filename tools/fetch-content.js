#!/usr/bin/env node
/**
 * Pulls the content Ricky owns out of Sanity and writes it to
 * `tools/content.json`, which `build-static.js` then reads synchronously.
 *
 * Two steps rather than one, for three reasons:
 *
 *   - `build-static.js` stays synchronous and dependency-free. It is the piece
 *     that has to stay readable; threading async through it to save a file
 *     would be a poor trade.
 *   - The build works offline. Fetch once, rebuild as often as you like.
 *   - `content.json` is committed, so a checkout builds the real blog with no
 *     network at all. It is a fallback, not a record: Netlify re-fetches on
 *     every deploy, so the committed copy goes stale the moment Ricky
 *     publishes. Sanity's own document history is the audit trail.
 *
 *   node tools/fetch-content.js && node tools/build-static.js
 *
 * The dataset is public, so this needs no token. If it is ever made private,
 * this is the one place a token would have to be threaded through.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = '0m77etlx';
const DATASET = 'production';
const API_VERSION = 'v2026-09-01';

const OUT = path.join(__dirname, 'content.json');

/**
 * `api` rather than `apicdn`, deliberately.
 *
 * The CDN host is faster and cached, which is the right default for a site
 * querying on every request. This is the opposite case: two queries, once per
 * deploy, triggered by a webhook a moment after Ricky pressed Publish — which
 * is precisely when a cache is most likely to hand back the version he just
 * replaced. The uncached host costs a few hundred milliseconds once and removes
 * the whole class of "I published it and the site didn't change" reports.
 *
 * `perspective=published` keeps drafts out of the live build.
 */
async function query(groq) {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}` +
    `?perspective=published&query=${encodeURIComponent(groq)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sanity returned ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  if (body.error) throw new Error(`Sanity: ${body.error.description}`);
  return body.result;
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

/**
 * One Portable Text block -> the shape `renderPost()` in build-static.js wants:
 * a kind, and a run of HTML for the inside of the element.
 *
 * Marks are resolved here rather than being flattened away. A word Ricky bolds
 * should arrive bold; the alternative is a formatting toolbar that silently
 * does nothing, which is worse than not offering it.
 *
 * Only the three block styles the design's article template can render are
 * emitted — see the note on `body` in the blogPost schema. Anything else is
 * treated as a paragraph rather than dropped, so unexpected content still
 * reaches the page.
 */
function blockToHtml(block) {
  const marksById = Object.fromEntries(
    (block.markDefs || []).map((def) => [def._key, def])
  );

  const html = (block.children || [])
    .filter((child) => child._type === 'span')
    .map((span) => {
      let out = escapeHtml(span.text || '');
      for (const mark of span.marks || []) {
        if (mark === 'strong') out = `<strong>${out}</strong>`;
        else if (mark === 'em') out = `<em>${out}</em>`;
        else if (marksById[mark]?._type === 'link') {
          const href = escapeAttr(marksById[mark].href || '');
          out = `<a href="${href}" target="_blank" rel="noreferrer">${out}</a>`;
        }
      }
      return out;
    })
    .join('');

  const kind =
    block.style === 'h2' ? 'h2' : block.style === 'blockquote' ? 'blockquote' : 'normal';

  return { kind, html };
}

const POSTS = `*[_type == "blogPost" && defined(slug.current)] | order(publishedAt desc) {
  "slug": slug.current,
  title,
  dek,
  category,
  publishedAt,
  numberInSeries,
  "series": series->{"id": _id, title, order},
  body[]{ _type, style, markDefs, children[]{_type, text, marks} },
  "cover": coverImage{
    alt,
    hotspot,
    "url": asset->url,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  }
}`;

const SERIES = `*[_type == "series"] | order(order asc) {
  "id": _id, title, intro, order
}`;

async function main() {
  const [posts, series] = await Promise.all([query(POSTS), query(SERIES)]);

  if (!Array.isArray(posts) || !posts.length) {
    throw new Error('Sanity returned no blog posts — refusing to write an empty content.json');
  }

  const content = {
    // Stamped so a stale content.json is obvious in a diff, and so a build log
    // says which snapshot it built from.
    fetchedAt: new Date().toISOString(),
    source: `${PROJECT_ID}/${DATASET}`,
    series: series || [],
    posts: posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      dek: p.dek,
      category: p.category,
      publishedAt: p.publishedAt,
      seriesId: p.series?.id ?? null,
      numberInSeries: p.numberInSeries ?? null,
      // The hotspot is carried through raw rather than turned into an
      // `object-position` here. Sanity can crop to the card's aspect ratio on
      // delivery, around the point Ricky marked — which beats sending a whole
      // photograph and cropping it in CSS. Only the build knows how large the
      // card is, so only the build can compose that URL.
      cover: p.cover?.url
        ? {
            url: p.cover.url,
            alt: p.cover.alt || '',
            hotspot: p.cover.hotspot
              ? { x: p.cover.hotspot.x, y: p.cover.hotspot.y }
              : null,
          }
        : null,
      body: (p.body || []).map(blockToHtml),
    })),
  };

  fs.writeFileSync(OUT, JSON.stringify(content, null, 2) + '\n', 'utf8');

  console.log(
    `fetched ${content.posts.length} posts and ${content.series.length} series ` +
      `from ${content.source} -> tools/content.json`
  );
}

main().catch((err) => {
  console.error(`fetch-content failed: ${err.message}`);
  process.exitCode = 1;
});
