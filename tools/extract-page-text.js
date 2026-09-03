/**
 * Lifts a page's bound copy out of the design.
 *
 * Shared by the seeder, which writes it to Sanity once, and by
 * verify-text-roundtrip.js, which renders it straight back and requires the
 * result to be byte-identical. Sharing it is the point: the thing being
 * verified has to be the thing that runs, or the proof is of something else.
 *
 * It lives in tools/ rather than in studio/scripts/ for that reason — the
 * verifier runs as part of the build's checks, and the build cannot load an
 * ESM module out of the Studio package.
 */

const { TEXT, toField } = require('./page-text');

/**
 * The booking sentence's anchor, borrowed as a template so the rebuilt link
 * keeps the design's styling rather than a copy of it written out here.
 */
const EMAIL_ANCHOR_PATH = { type: 'speakingPage', path: 's2.p[0]' };

/** Set `a.b[2].c` on a plain object, creating the shape as it goes. */
function assign(target, field, value) {
  const parts = field.split('.');
  let node = target;
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    const open = part.indexOf('[');
    if (open !== -1 && part.endsWith(']')) {
      const key = part.slice(0, open);
      const idx = Number(part.slice(open + 1, -1));
      node[key] = node[key] || [];
      if (last) node[key][idx] = value;
      else node[key][idx] = node[key][idx] || {};
      node = node[key][idx];
    } else {
      if (last) node[part] = value;
      else node[part] = node[part] || {};
      node = node[part];
    }
  });
}

/**
 * Build a page document from the design's own markup.
 *
 * Returns the document plus, for the Speaking page, the email address and the
 * anchor template pulled out of the booking sentence — applyText() needs both
 * to put the link back.
 */
function extractPageText(html, type, dc) {
  const bindings = TEXT[type] || [];
  const doc = {};
  let email = null;
  let emailAnchor = null;

  for (const b of bindings) {
    if (b.paras) {
      // A run of <p> slots is one field, paragraphs separated by blank lines.
      const chunks = b.paras.map((p) => toField(dc.get(html, p)).trim());
      assign(doc, b.field, chunks.filter(Boolean).join('\n\n'));
      continue;
    }

    let raw = dc.get(html, b.path);

    if (b.html) {
      // The booking sentence: keep the anchor as a template, and reduce the
      // sentence itself to the plain prose Ricky should be editing.
      const anchor = /<a\b[\s\S]*?<\/a>/.exec(raw);
      if (anchor) {
        emailAnchor = anchor[0];
        const inner = />([^<]*)<\/a>/.exec(anchor[0]);
        email = inner ? toField(inner[1]).trim() : null;
        raw = raw.replace(anchor[0], inner ? inner[1] : '');
      }
    }

    assign(doc, b.field, toField(raw).trim());

    // A button's destination travels with its label, or Ricky can rename the
    // button but not change where it goes — which is how a CTA ends up
    // pointing somewhere it no longer describes.
    if (b.href) {
      const href = dc.getAttr(html, b.path, 'href');
      if (href) assign(doc, b.href, href);
    }
  }

  return { doc, email, emailAnchor };
}

module.exports = { extractPageText, EMAIL_ANCHOR_PATH };
