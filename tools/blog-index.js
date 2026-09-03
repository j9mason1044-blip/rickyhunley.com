/**
 * Rebuilds the /blog index from Sanity content.
 *
 * The article pages were easy to move to a CMS: the design already renders them
 * from a template and a data array, so the build only had to change where the
 * array comes from. The index is the opposite — three photo cards and nine rows
 * written out longhand in the design, because that is what a designer draws.
 *
 * So this takes the longhand markup and treats the first of each repeated thing
 * as an exemplar: one card, one numbered row, one plain row, one series section.
 * Every attribute and inline style is reused untouched, which is the whole
 * point — the design keeps deciding what a card looks like, and Sanity decides
 * how many there are and what they say. A restyle in the design flows through
 * with no change here.
 *
 * If Sanity has no content this module is never called, and the design's own
 * markup ships as-is. That is what makes the design still previewable.
 */

/** Text that is about to become the inside of an element. */
const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

/**
 * A Sanity CDN URL cropped to the size the card actually occupies.
 *
 * `fit=crop` with `crop=focalpoint` crops around the hotspot Ricky set in the
 * Studio, so his head stays in a 16:10 card cut from a portrait original. With
 * no hotspot Sanity centres the crop, which is the same thing the design's
 * `object-fit: cover` would have done.
 *
 * `auto=format` lets Sanity serve WebP to browsers that accept it. The width is
 * doubled for high-density screens; the card is ~430px at the 1280px container.
 */
function coverUrl(cover, { width, height }) {
  const params = [
    `w=${width * 2}`,
    `h=${height * 2}`,
    'fit=crop',
    'auto=format',
    'q=72',
  ];
  if (cover.hotspot) {
    params.push('crop=focalpoint', `fp-x=${cover.hotspot.x.toFixed(3)}`, `fp-y=${cover.hotspot.y.toFixed(3)}`);
  }
  return `${cover.url}?${params.join('&')}`;
}

/**
 * Replace the contents of a `<tag …>…</tag>`, keeping its attributes.
 *
 * Non-greedy, so it pairs an opening tag with the *next* closing one. That is
 * correct for the elements this is used on — a heading, a paragraph, a label —
 * and wrong for anything with a nested element of the same name. Hence `match`:
 * where the target sits inside a nest of `<div>`s, identify it by something in
 * its own opening tag rather than by counting.
 *
 * @param {RegExp} [match]  tested against the opening tag; first hit wins
 * @param {number} [occurrence]  used only when `match` is absent
 */
function setInner(html, tag, value, { match, occurrence = 0 } = {}) {
  // Scan opening tags rather than whole elements. A global replace over
  // `<div>…</div>` never looks inside a match it has already consumed, so a
  // nested target — which the category label is — is not merely skipped, it is
  // never tested at all.
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'g');
  let seen = 0;
  let m;
  while ((m = openRe.exec(html))) {
    const hit = match ? match.test(m[0]) : seen++ === occurrence;
    if (!hit) continue;
    const start = m.index + m[0].length;
    const end = html.indexOf(`</${tag}>`, start);
    if (end === -1) break;
    return html.slice(0, start) + value + html.slice(end);
  }
  return html;
}

/** Split a chunk of markup into its top-level `<section>` blocks. */
const sections = (html) => html.split(/(?=<section\b)/);

/**
 * A split chunk is "the section, plus whatever followed it" — and what follows
 * the *last* section is the `</div>` closing the whole page. Dropping a section
 * therefore has to keep its tail, or the page loses a closing tag and every
 * element after it nests one level too deep.
 */
const sectionEnd = (part) => {
  const at = part.lastIndexOf('</section>');
  return at === -1 ? part.length : at + '</section>'.length;
};
const sectionOnly = (part) => part.slice(0, sectionEnd(part));
const tailOf = (part) => part.slice(sectionEnd(part));

/** The first `<a href="#" onClick="{{ open.… }}">…</a>` in a chunk. */
const firstPostLink = (html) =>
  (html.match(/<a href="#" onClick="\{\{ open\.\w+ \}\}"[\s\S]*?<\/a>/) || [])[0];

/** Every such link, so a rebuilt run can replace exactly the old one. */
const allPostLinks = (html) =>
  html.match(/<a href="#" onClick="\{\{ open\.\w+ \}\}"[\s\S]*?<\/a>/g) || [];

/** Point an exemplar's anchor at a real page instead of a state change. */
const linkTo = (anchorHtml, href) =>
  anchorHtml.replace(
    /<a href="#" onClick="\{\{ open\.\w+ \}\}"/,
    `<a href="${escapeAttr(href)}"`
  );

/**
 * Swap the run of links inside a chunk for a new run, in place — so whatever
 * wraps them (the grid, the border, the padding) is left exactly as drawn.
 */
function replaceLinks(html, rebuilt) {
  const existing = allPostLinks(html);
  if (!existing.length) return html;

  let out = html.replace(existing[0], '<!--RUN-->');
  for (const link of existing.slice(1)) out = out.replace(link, '');
  out = out.replace('<!--RUN-->', rebuilt.join('\n        '));

  // Removing a link leaves the whitespace that indented it. Harmless, but it
  // accumulates a blank line per post, and the generated HTML is what you read
  // when something looks wrong on the page.
  return out.replace(/\n[ \t]*\n(?=[ \t]*\n)/g, '\n');
}

/** One photo card. */
function card(exemplar, post, hrefFor) {
  let html = linkTo(exemplar, hrefFor(post));

  if (post.cover) {
    html = html
      .replace(/src="[^"]*"/, `src="${escapeAttr(coverUrl(post.cover, { width: 440, height: 275 }))}"`)
      .replace(/alt="[^"]*"/, `alt="${escapeAttr(post.cover.alt)}"`);
  }

  // The category label is a <div> nested two deep inside other <div>s, so it is
  // found by the accent colour only it carries among them — counting would pair
  // the wrong opening and closing tags.
  html = setInner(html, 'div', escapeHtml(post.category), {
    match: /color:var\(--accent/,
  });
  html = setInner(html, 'h2', escapeHtml(post.title));
  html = setInner(html, 'p', escapeHtml(post.dek));
  return html;
}

/**
 * The lone post of a one-post series.
 *
 * A series list is a run of rows separated by hairlines; with one member it
 * renders as a heading, an intro, and a single rule with a title floating over
 * it — which reads as a list that failed to load rather than as a deliberate
 * one. So a series of one is presented as a feature panel instead: the card
 * treatment from "Latest posts", minus the photograph, at the full width of the
 * section.
 *
 * Built from the card exemplar rather than written out here, for the same
 * reason as everything else in this file — the design keeps deciding what a
 * card looks like. Dropping the image block is the one liberty taken, because a
 * 16:10 photograph across the full 1280px would tower over the three cards
 * above it, and the posts that end up alone in a series are the ones least
 * likely to have a photograph of their own.
 */
function feature(cardExemplar, post, hrefFor) {
  // The image sits in a wrapper div of its own, identified by the aspect ratio
  // only it carries. Matching the wrapper rather than the <img> takes the
  // 16:10 box with it; leaving the box behind would reserve the space.
  const withoutImage = cardExemplar.replace(
    /\s*<div\b[^>]*aspect-ratio:16 \/ 10[^>]*>[\s\S]*?<\/div>/,
    ''
  );
  if (withoutImage === cardExemplar) {
    throw new Error('the blog card exemplar no longer has an image block to drop');
  }

  // Standing on its own, the panel needs the hairline the cards get from their
  // grid — the three cards are separated by a 1px gap over a #E6E2DA ground,
  // which a single card outside that grid does not inherit.
  const bordered = withoutImage.replace(
    /(<a href="#" onClick="\{\{ open\.\w+ \}\}" style="[^"]*)"/,
    '$1; border:1px solid #E6E2DA"'
  );

  return card(bordered, post, hrefFor);
}

/** One row in a series list. */
function row(exemplar, post, hrefFor, { isLast }) {
  let html = linkTo(exemplar, hrefFor(post));

  const numbered = /min-width:34px/.test(exemplar);
  if (numbered) {
    html = setInner(html, 'span', String(post.numberInSeries ?? '').padStart(2, '0'), { occurrence: 0 });
    html = setInner(html, 'span', escapeHtml(post.title), { occurrence: 1 });
  } else {
    html = setInner(html, 'span', escapeHtml(post.title), { occurrence: 0 });
  }

  // The design closes each list with a bottom rule on its final row. Exemplars
  // are taken from the top of a list, so the rule has to be put back.
  if (isLast && !/border-bottom:1px solid #E6E2DA/.test(html)) {
    html = html.replace(
      /(<a [^>]*?style="[^"]*?border-top:1px solid #E6E2DA)/,
      '$1; border-bottom:1px solid #E6E2DA'
    );
  }
  return html;
}

/**
 * @param {string} blogHtml  the design's `isBlog` block, untransformed
 * @param {{posts: Array, series: Array}} content
 * @param {(post: object) => string} hrefFor
 */
function renderBlogIndex(blogHtml, content, hrefFor) {
  const parts = sections(blogHtml);

  const cardsIndex = parts.findIndex((s) => firstPostLink(s) && /<img/.test(s));
  const seriesIndexes = parts
    .map((s, i) => (firstPostLink(s) && !/<img/.test(s) ? i : -1))
    .filter((i) => i !== -1);

  if (cardsIndex === -1 || !seriesIndexes.length) {
    throw new Error('could not find the blog index exemplars in the design');
  }

  // Both row shapes exist in the design because the two series differ: the
  // lessons are numbered, the essays are not. Take one of each while they are
  // both still here, rather than trying to synthesise the other later.
  const rowExemplars = {
    numbered: null,
    plain: null,
  };
  for (const i of seriesIndexes) {
    const link = firstPostLink(parts[i]);
    if (/min-width:34px/.test(link)) rowExemplars.numbered ??= link;
    else rowExemplars.plain ??= link;
  }

  const cardExemplar = firstPostLink(parts[cardsIndex]);
  const seriesExemplar = sectionOnly(parts[seriesIndexes[0]]);

  /**
   * Every series is rebuilt from the first one's markup, but the design gives
   * its *last* series section a bottom padding the others do not have — it is
   * what holds the page off the footer. Carried across by opening tag, so the
   * value stays the design's to choose.
   */
  const lastSectionTag = (
    parts[seriesIndexes[seriesIndexes.length - 1]].match(/^<section[^>]*>/) || []
  )[0];

  // --- the cards: every post that is not part of a series ------------------
  const standalone = content.posts.filter((p) => !p.seriesId);

  // A card without a cover image keeps the exemplar's — which is the blog
  // header photograph, so the new post would silently appear wearing the same
  // picture as the page it sits on. Every other missing field degrades safely,
  // this one does not, so it stops the build instead. Failing the deploy leaves
  // the previous site up; shipping it puts a duplicate photograph in front of
  // the client. (Series rows carry no photograph, so this applies to the cards
  // only — moving a post out of a series is what turns it into a card.)
  const coverless = standalone.filter((p) => !p.cover);
  if (coverless.length) {
    throw new Error(
      `blog post(s) with no cover image would render as cards: ${coverless
        .map((p) => p.slug)
        .join(', ')}.\n` +
        'Add a Cover image to each in the Studio, or give the post a series.'
    );
  }

  parts[cardsIndex] = replaceLinks(
    parts[cardsIndex],
    standalone.map((p) => card(cardExemplar, p, hrefFor))
  );

  // --- one section per series ----------------------------------------------
  const rebuiltSeries = [...content.series]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => {
      const members = content.posts
        .filter((p) => p.seriesId === s.id)
        .sort(
          (a, b) =>
            (a.numberInSeries ?? Number.MAX_SAFE_INTEGER) -
            (b.numberInSeries ?? Number.MAX_SAFE_INTEGER)
        );
      if (!members.length) return '';

      let html = seriesExemplar;
      html = setInner(html, 'h2', escapeHtml(s.title));
      html = setInner(html, 'p', escapeHtml(s.intro || ''));

      // A series of one is a feature panel, not a list with a single item. Note
      // this runs after the heading and the intro are set: `setInner` takes the
      // first <h2> and the first <p> it finds, and the panel brings an <h2> and
      // a <p> of its own.
      if (members.length === 1) {
        return replaceLinks(html, [feature(cardExemplar, members[0], hrefFor)]);
      }

      const numbered = members.some((p) => p.numberInSeries != null);
      const exemplar = numbered
        ? rowExemplars.numbered ?? rowExemplars.plain
        : rowExemplars.plain ?? rowExemplars.numbered;

      return replaceLinks(
        html,
        members.map((p, i) =>
          row(exemplar, p, hrefFor, { isLast: i === members.length - 1 })
        )
      );
    })
    .filter(Boolean);

  // Give the final section the design's closing padding, whichever series ends
  // up last.
  if (lastSectionTag && rebuiltSeries.length) {
    const i = rebuiltSeries.length - 1;
    rebuiltSeries[i] = rebuiltSeries[i].replace(/^<section[^>]*>/, lastSectionTag);
  }

  // The rebuilt sections take the place of the first; the rest are dropped, so
  // adding or removing a series in Sanity adds or removes one here. Each part's
  // tail is kept — see `sectionEnd`.
  parts[seriesIndexes[0]] =
    rebuiltSeries.join('\n') + tailOf(parts[seriesIndexes[0]]);
  for (const i of seriesIndexes.slice(1)) parts[i] = tailOf(parts[i]);

  return parts.join('');
}

module.exports = { renderBlogIndex, coverUrl };
