/**
 * The handful of primitives every "refill the design's own markup" renderer
 * needs — shared by tools/news-index.js and tools/episode-index.js.
 *
 * They all exist to serve one rule: the design decides what a thing *looks*
 * like, Sanity decides how many there are and what they say. So nothing here
 * ever writes a style, a class or a tag of its own. It finds the markup a
 * designer drew, and puts different words inside it.
 *
 * Extracted from news-index.js when the podcast episodes needed the same
 * treatment. replaceRun() in particular has invariants that are easy to get
 * subtly wrong on a second copy, and a wrong copy fails by shipping mangled
 * markup rather than by throwing.
 */

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

/**
 * Replace the contents of the `index`-th `<tag>` in a chunk of markup.
 *
 * Deliberately naive: it pairs an opening tag with the *next* closing one, so
 * it is only correct where the tag does not nest. That holds for everything it
 * is used on — a news row and an episode row are three flat `<span>`s, a press
 * card is a `<div>` and an `<h3>` — and each caller asserts its exemplar's
 * shape before filling it, so a redesign that nests them stops the build rather
 * than producing nonsense.
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
  throw new Error(`no <${tag}> #${index} in the exemplar to fill`);
}

/** Point an exemplar at a different destination. */
const linkTo = (html, url) =>
  html.replace(/^<a href="[^"]*"/, `<a href="${escapeAttr(url)}"`);

/**
 * Swap a run of sibling elements for a new one, in place — so whatever wraps
 * them (the grid, the hairlines, the padding) is left exactly as drawn.
 *
 * The whole span from the first to the last is replaced in one go, rather than
 * each being deleted in turn. Deleting them one at a time leaves the whitespace
 * that indented each behind, so a run that shrinks from nine links to six ships
 * three blank lines — harmless, but the generated HTML is what you read when
 * something looks wrong on the page.
 *
 * Only whitespace may separate the originals, and that is asserted rather than
 * assumed: anything else between them is markup this would throw away.
 *
 * `rebuilt` need not be the same length as `existing`, and need not even be the
 * same kind of element — the episode list interleaves season headings between
 * its rows.
 */
function replaceRun(html, existing, rebuilt, indent) {
  const start = html.indexOf(existing[0]);
  const tail = existing[existing.length - 1];
  const end = html.lastIndexOf(tail) + tail.length;

  let cursor = start;
  for (const item of existing) {
    const at = html.indexOf(item, cursor);
    if (at === -1 || html.slice(cursor, at).trim()) {
      throw new Error('the exemplars are no longer a contiguous run');
    }
    cursor = at + item.length;
  }

  return html.slice(0, start) + rebuilt.join(`\n${indent}`) + html.slice(end);
}

module.exports = { escapeHtml, escapeAttr, setNth, linkTo, replaceRun };
