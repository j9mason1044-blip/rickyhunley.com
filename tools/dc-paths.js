/**
 * Addressing for the design's markup.
 *
 * Moving the page copy into Sanity means two operations that must agree
 * exactly: pull the current text out of the design (once, to seed the
 * documents) and put Ricky's text back in (on every build). If they disagree
 * about *where* a field lives, the seed is silently wrong or the build silently
 * drops copy — and page copy is the one thing on this site nobody can
 * reconstruct from anywhere else.
 *
 * So neither side gets to describe a location in its own words. Both address
 * nodes through this module, by a path like `s3.p[1]` or `s0.img[0]`: section
 * index, tag, then occurrence within that section in document order.
 *
 * Why not CSS selectors or a DOM library: the design is a single file of inline
 * styles with no classes or ids to grab (`data-r` exists but is a handful of
 * responsive hooks, not a content map), and the repo is deliberately
 * dependency-free — build-static.js runs on Netlify with no `npm install`.
 *
 * The guarantee this module owes: for any path, `set(html, path, get(html,
 * path))` returns byte-identical html. `verify-paths.js` asserts that across
 * every page. Everything else here is built on that.
 */

/**
 * Tags whose text content is page copy.
 *
 * `div` is here because the design writes the small uppercase eyebrow labels as
 * bare divs — there is no semantic element for them and no class to select on.
 * It makes the addressable set much larger and most of those nodes are pure
 * layout wrappers, which is harmless: nothing is bound to a path unless a map
 * names it, and findTags counts nesting so a wrapper and its contents stay
 * distinct.
 */
const TEXT_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'span', 'a', 'li', 'div'];

/** Split a page block into its top-level sections, keeping every byte. */
function splitSections(html) {
  const parts = html.split(/(?=<section\b)/);
  // Anything before the first <section> is the block's own preamble. It is kept
  // as part 0's prefix so joining is lossless; it is never addressable.
  const lead = parts[0].startsWith('<section') ? '' : parts.shift();
  return { lead, sections: parts };
}

const joinSections = ({ lead, sections }) => lead + sections.join('');

/**
 * Every occurrence of an opening tag in a chunk, with the offsets of its inner
 * content. Self-closing and void tags report `inner: null` — an `<img>` has no
 * text to replace, only attributes.
 *
 * Scans opening tags rather than whole elements: a global match over
 * `<p>…</p>` never looks inside a match it has already consumed, so a nested
 * element of the same name is not merely skipped, it is never seen at all.
 */
function findTags(chunk, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*?(/?)>`, 'g');
  const hits = [];
  let m;
  while ((m = re.exec(chunk))) {
    const openStart = m.index;
    const openEnd = m.index + m[0].length;
    if (m[1] === '/' || tag === 'img') {
      hits.push({ openStart, openEnd, inner: null });
      continue;
    }
    // Pair with the matching close, counting nested opens of the same tag.
    let depth = 1;
    let i = openEnd;
    const openRe = new RegExp(`<${tag}\\b`, 'g');
    const closeTag = `</${tag}>`;
    while (depth > 0) {
      const close = chunk.indexOf(closeTag, i);
      if (close === -1) break;
      openRe.lastIndex = i;
      const nested = openRe.exec(chunk);
      if (nested && nested.index < close) {
        depth++;
        i = nested.index + nested[0].length;
      } else {
        depth--;
        i = close + closeTag.length;
        if (depth === 0) hits.push({ openStart, openEnd, inner: [openEnd, close] });
      }
    }
  }
  return hits;
}

const PATH_RE = /^s(\d+)\.([a-z0-9]+)\[(\d+)\]$/;

function locate(html, path) {
  const m = PATH_RE.exec(path);
  if (!m) throw new Error(`malformed path: ${path}`);
  const [, sIdx, tag, occ] = m;
  const split = splitSections(html);
  const section = split.sections[Number(sIdx)];
  if (section === undefined) throw new Error(`${path}: no section s${sIdx}`);
  const hits = findTags(section, tag);
  const hit = hits[Number(occ)];
  if (!hit) {
    throw new Error(
      `${path}: section s${sIdx} has ${hits.length} <${tag}>, no index ${occ}`
    );
  }
  return { split, sIdx: Number(sIdx), section, hit };
}

/** The inner HTML at `path`. Throws rather than returning undefined. */
function get(html, path) {
  const { section, hit } = locate(html, path);
  if (!hit.inner) throw new Error(`${path}: void element has no inner content`);
  return section.slice(hit.inner[0], hit.inner[1]);
}

/** Replace the inner HTML at `path`, leaving the element's attributes alone. */
function set(html, path, value) {
  const { split, sIdx, section, hit } = locate(html, path);
  if (!hit.inner) throw new Error(`${path}: void element has no inner content`);
  split.sections[sIdx] =
    section.slice(0, hit.inner[0]) + value + section.slice(hit.inner[1]);
  return joinSections(split);
}

/** The value of one attribute on the element at `path`. */
function getAttr(html, path, attr) {
  const { section, hit } = locate(html, path);
  const open = section.slice(hit.openStart, hit.openEnd);
  const m = new RegExp(`\\s${attr}="([^"]*)"`).exec(open);
  return m ? m[1] : null;
}

/**
 * Set attributes on the element at `path`. An attribute already present is
 * rewritten in place, keeping attribute order; a new one is appended just
 * before the closing bracket. Passing `null` removes it.
 */
function setAttrs(html, path, attrs) {
  const { split, sIdx, section, hit } = locate(html, path);
  let open = section.slice(hit.openStart, hit.openEnd);

  for (const [attr, value] of Object.entries(attrs)) {
    const re = new RegExp(`\\s${attr}="[^"]*"`);
    if (value === null) {
      open = open.replace(re, '');
    } else if (re.test(open)) {
      open = open.replace(re, ` ${attr}="${value}"`);
    } else {
      open = open.replace(/(\s*\/?>)$/, ` ${attr}="${value}"$1`);
    }
  }

  split.sections[sIdx] =
    section.slice(0, hit.openStart) + open + section.slice(hit.openEnd);
  return joinSections(split);
}

/** Every addressable path in a page block, in document order. Used by the seeder. */
function enumerate(html) {
  const { sections } = splitSections(html);
  const out = [];
  sections.forEach((section, sIdx) => {
    for (const tag of [...TEXT_TAGS, 'img']) {
      findTags(section, tag).forEach((hit, occ) => {
        const path = `s${sIdx}.${tag}[${occ}]`;
        out.push({
          path,
          tag,
          text: hit.inner
            ? section.slice(hit.inner[0], hit.inner[1]).replace(/\s+/g, ' ').trim()
            : null,
          src: tag === 'img' ? getAttr(html, path, 'src') : null,
        });
      });
    }
  });
  return out;
}

module.exports = { splitSections, joinSections, get, set, getAttr, setAttrs, enumerate, TEXT_TAGS };
