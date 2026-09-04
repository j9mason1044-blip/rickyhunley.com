/**
 * Rebuilds the press links — the /news rows and the home page's "In the press"
 * cards — from Sanity content.
 *
 * The same trick as tools/blog-index.js, and for the same reason: the design
 * writes its links out longhand, because that is what a designer draws. So the
 * first of each repeated thing is treated as an exemplar and refilled once per
 * `newsItem`. Every attribute and inline style is reused untouched — the design
 * keeps deciding what a press link looks like, Sanity decides how many there
 * are and where they point.
 *
 * This is the piece that was missing when the News page had to be taken down:
 * the nine bad URLs lived in the design, so no amount of editing in the Studio
 * could fix them. Now they live in `newsItem` documents and the design's own
 * links are only the fallback — sample data, so the page still previews in
 * Claude Design with no CMS to ask.
 */

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

/** How many cards the home page's press row has room for. */
const HOME_CARDS = 3;

/**
 * Replace the contents of the `index`-th `<tag>` in a chunk of markup.
 *
 * Deliberately naive: it pairs an opening tag with the *next* closing one, so
 * it is only correct where the tag does not nest. That holds for both things it
 * is used on — a news row is three flat `<span>`s, a press card is a `<div>`
 * and an `<h3>` — and the exemplar shape is asserted before either is filled,
 * so a redesign that nests them stops the build rather than producing nonsense.
 */
function setNth(html, tag, index, value) {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'g');
  let seen = 0;
  let m;
  while ((m = openRe.exec(html))) {
    if (seen++ !== index) continue;
    const start = m.index + m[0].length;
    const end = html.indexOf(`</${tag}>`, start);
    if (end === -1) break;
    return html.slice(0, start) + value + html.slice(end);
  }
  throw new Error(`no <${tag}> #${index} in the press exemplar to fill`);
}

/** Point an exemplar at a different article. */
const linkTo = (html, url) =>
  html.replace(/^<a href="[^"]*"/, `<a href="${escapeAttr(url)}"`);

/**
 * Swap a run of links for a new one, in place — so whatever wraps them (the
 * grid, the hairlines, the padding) is left exactly as drawn.
 *
 * The whole span from the first link to the last is replaced in one go, rather
 * than each link being deleted in turn. Deleting them one at a time leaves the
 * whitespace that indented each behind, so a run that shrinks from nine links
 * to six ships three blank lines — harmless, but the generated HTML is what you
 * read when something looks wrong on the page.
 *
 * Only whitespace may separate the links, and that is asserted rather than
 * assumed: anything else between them is markup this would throw away.
 */
function replaceRun(html, existing, rebuilt, indent) {
  const start = html.indexOf(existing[0]);
  const tail = existing[existing.length - 1];
  const end = html.lastIndexOf(tail) + tail.length;

  let cursor = start;
  for (const link of existing) {
    const at = html.indexOf(link, cursor);
    if (at === -1 || html.slice(cursor, at).trim()) {
      throw new Error('the press links are no longer a contiguous run');
    }
    cursor = at + link.length;
  }

  return html.slice(0, start) + rebuilt.join(`\n${indent}`) + html.slice(end);
}

/**
 * The rows on /news.
 *
 * Two exemplars, not one: the design gives its *last* row a bottom hairline the
 * others do not have, which is what closes the list. Both are taken while they
 * are still there, so however many rows Sanity has, the run still opens and
 * closes the way it was drawn.
 */
function renderNewsRows(newsHtml, items) {
  const rows = newsHtml.match(/<a href="[^"]*"[^>]*data-r="newsrow"[\s\S]*?<\/a>/g) || [];
  if (rows.length < 2) {
    throw new Error('could not find the news row exemplars in the design');
  }

  const middle = rows[0];
  const last = rows[rows.length - 1];

  // Three flat spans: outlet, headline, "Read →". Asserted rather than assumed,
  // because setNth() below counts on the shape.
  if ((middle.match(/<span\b/g) || []).length !== 3) {
    throw new Error('a news row is no longer three spans — see tools/news-index.js');
  }

  const rebuilt = items.map((item, i) => {
    let html = linkTo(i === items.length - 1 ? last : middle, item.url);
    html = setNth(html, 'span', 0, escapeHtml(item.outlet));
    html = setNth(html, 'span', 1, escapeHtml(item.title));
    html = setNth(html, 'span', 2, `${item.kind === 'video' ? 'Watch' : 'Read'} →`);
    return html;
  });

  return replaceRun(newsHtml, rows, rebuilt, '      ');
}

/**
 * The home page's "In the press" cards: the newest three, in a grid drawn for
 * exactly three.
 *
 * The cards sit in the one section that also holds the "All news →" link, which
 * is how the section is found — the heading above them is Sanity copy and can
 * be renamed in the Studio at any time. (It is the same landmark build-static.js
 * uses to drop the whole section when the News page is hidden.)
 *
 * If Sanity is ever down to one or two items the grid is narrowed to match.
 * Left at three, the empty cell shows as a bare beige panel, because the hairline
 * between the cards is the grid's own background showing through 1px gaps.
 */
function renderPressCards(homeHtml, items) {
  const start = homeHtml.lastIndexOf('<section', homeHtml.indexOf('onClick="{{ nav.news }}"'));
  if (start === -1) {
    throw new Error('could not find the home page press section in the design');
  }
  const end = homeHtml.indexOf('</section>', start) + '</section>'.length;
  const section = homeHtml.slice(start, end);

  const cards = section.match(/<a href="https?:[^"]*"[^>]*target="_blank"[\s\S]*?<\/a>/g) || [];
  if (!cards.length) {
    throw new Error('could not find the press card exemplar in the design');
  }
  if ((cards[0].match(/<div\b/g) || []).length !== 1 || !/<h3\b/.test(cards[0])) {
    throw new Error('a press card is no longer a div and an h3 — see tools/news-index.js');
  }

  const shown = items.slice(0, HOME_CARDS);
  const rebuilt = shown.map((item) => {
    let html = linkTo(cards[0], item.url);
    html = setNth(html, 'div', 0, escapeHtml(item.outlet));
    html = setNth(html, 'h3', 0, escapeHtml(item.title));
    return html;
  });

  let out = replaceRun(section, cards, rebuilt, '        ');
  if (shown.length < HOME_CARDS) {
    out = out.replace(
      `grid-template-columns:repeat(${HOME_CARDS}, 1fr)`,
      `grid-template-columns:repeat(${shown.length}, 1fr)`
    );
  }

  return homeHtml.slice(0, start) + out + homeHtml.slice(end);
}

module.exports = { renderNewsRows, renderPressCards };
