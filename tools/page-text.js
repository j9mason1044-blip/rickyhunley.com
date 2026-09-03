/**
 * Which words on which page are which field in Sanity.
 *
 * The text counterpart to page-photos.js, and the same contract: one map, read
 * by the seeder that lifted this copy out of the design and by the build that
 * puts Ricky's back in. Two lists would drift, and the drift would be silent —
 * copy vanishing from a page while the build still reports success.
 *
 * `path` addresses the design's markup through tools/dc-paths.js.
 * `field` is a path into the page document, `[n]` for array members.
 *
 * ── What is here, and what is deliberately not ──────────────────────────────
 *
 * Here: headings, standfirsts, body copy, the small uppercase eyebrow labels,
 * the figures in the home page's record band, and the labels and destinations
 * of the buttons Ricky owns (the two hero buttons, the Huddle follow, the
 * community and Football 101 CTAs).
 *
 * Not here, on purpose:
 *
 * - Navigation labels: "Read the full story", "All episodes", "All news →",
 *   "See speaking details". They are chrome that has to stay true to where it
 *   points; an editable label that no longer matches its destination is worse
 *   than a fixed one. They stay in the design.
 * - Anything already owned by a document type. The three signature talks are
 *   `talk` documents (home s4 and speaking s1 render the same three, and the
 *   design had already let them drift). The episode lists are `episode`
 *   documents. The press rows and the blog cards are `newsItem` and `blogPost`.
 *   Those are wired separately — binding them here would give Ricky two places
 *   to edit one thing.
 * - `<svg>` arrows inside link text, and anything whose inner HTML is markup
 *   rather than words. dc-paths can address them; there is nothing to edit.
 *
 * ── Duplication the migration found ────────────────────────────────────────
 *
 * The home page teasers restate the Huddle, Football 101 and Community pages
 * in their own words, and two of them have already drifted from the page they
 * summarise — the home page lists "the Arizona Diaper Bank, the American Heart
 * Association", Community lists "American Heart Association, Arizona Diaper
 * Bank". They are modelled as separate fields rather than reconciled here,
 * because choosing which wording is right is an editorial decision and this is
 * a migration: it must not change a word. Flagged in the schema descriptions so
 * whoever decides can find it.
 */

/**
 * `s1.p[0]` on About is the opening paragraph; `s1.p[1..8]` are the bodies of
 * four sections that hold 2, 1, 2 and 3 paragraphs. The `paras` form binds a
 * run of <p> slots to one blank-line-separated text field, which is how
 * `contentSection.body` is modelled — Ricky writes prose, not records.
 */
const TEXT = {
  homePage: [
    { path: 's0.span[1]', field: 'hero.eyebrow' },
    { path: 's0.h1[0]', field: 'hero.heading' },
    { path: 's0.p[0]', field: 'hero.intro' },
    { path: 's0.a[0]', field: 'heroButtons[0].label', href: 'heroButtons[0].url' },
    { path: 's0.a[1]', field: 'heroButtons[1].label' },

    // The record band. Five pairs of divs, figure then label.
    { path: 's1.div[2]', field: 'stats[0].value' },
    { path: 's1.div[3]', field: 'stats[0].label' },
    { path: 's1.div[5]', field: 'stats[1].value' },
    { path: 's1.div[6]', field: 'stats[1].label' },
    { path: 's1.div[8]', field: 'stats[2].value' },
    { path: 's1.div[9]', field: 'stats[2].label' },
    { path: 's1.div[11]', field: 'stats[3].value' },
    { path: 's1.div[12]', field: 'stats[3].label' },
    { path: 's1.div[14]', field: 'stats[4].value' },
    { path: 's1.div[15]', field: 'stats[4].label' },

    { path: 's2.h2[0]', field: 'reelHeading' },
    { path: 's2.p[0]', field: 'reelIntro' },

    { path: 's3.span[1]', field: 'aboutEyebrow' },
    { path: 's3.h2[0]', field: 'aboutHeading' },
    { path: 's3.p[0]', field: 'aboutBody', paras: ['s3.p[0]', 's3.p[1]'] },

    { path: 's4.span[1]', field: 'talksEyebrow' },
    { path: 's4.h2[0]', field: 'talksHeading' },
    { path: 's4.p[0]', field: 'talksIntro' },

    { path: 's5.h2[0]', field: 'huddleHeading' },
    { path: 's5.p[0]', field: 'huddleBody' },

    { path: 's6.span[1]', field: 'f101Eyebrow' },
    { path: 's6.h2[0]', field: 'f101Heading' },
    { path: 's6.p[0]', field: 'f101Body' },

    { path: 's7.span[1]', field: 'communityEyebrow' },
    { path: 's7.h2[0]', field: 'communityHeading' },
    { path: 's7.h3[0]', field: 'communitySections[0].heading' },
    { path: 's7.p[0]', field: 'communitySections[0].body' },
    { path: 's7.h3[1]', field: 'communitySections[1].heading' },
    { path: 's7.p[1]', field: 'communitySections[1].body' },
    { path: 's7.h3[2]', field: 'communitySections[2].heading' },
    { path: 's7.p[2]', field: 'communitySections[2].body' },

    { path: 's8.h2[0]', field: 'pressHeading' },
  ],

  aboutPage: [
    { path: 's0.div[3]', field: 'hero.eyebrow' },
    { path: 's0.h1[0]', field: 'hero.heading' },
    { path: 's0.p[0]', field: 'hero.intro' },

    { path: 's1.p[0]', field: 'intro' },

    { path: 's1.h2[0]', field: 'sections[0].heading' },
    { path: 's1.p[1]', field: 'sections[0].body', paras: ['s1.p[1]', 's1.p[2]'] },
    { path: 's1.h2[1]', field: 'sections[1].heading' },
    { path: 's1.p[3]', field: 'sections[1].body', paras: ['s1.p[3]'] },
    { path: 's1.h2[2]', field: 'sections[2].heading' },
    { path: 's1.p[4]', field: 'sections[2].body', paras: ['s1.p[4]', 's1.p[5]'] },
    { path: 's1.h2[3]', field: 'sections[3].heading' },
    {
      path: 's1.p[6]',
      field: 'sections[3].body',
      paras: ['s1.p[6]', 's1.p[7]', 's1.p[8]'],
    },

    { path: 's2.h2[0]', field: 'honoursHeading' },
    // Ten honours, each a title span then a detail span.
    ...Array.from({ length: 10 }, (_, i) => [
      { path: `s2.span[${i * 2}]`, field: `honours[${i}].title` },
      { path: `s2.span[${i * 2 + 1}]`, field: `honours[${i}].detail` },
    ]).flat(),
  ],

  speakingPage: [
    { path: 's0.div[2]', field: 'hero.eyebrow' },
    { path: 's0.h1[0]', field: 'hero.heading' },
    { path: 's0.p[0]', field: 'hero.intro' },
    { path: 's0.a[0]', field: 'heroButton.label', href: 'heroButton.url' },

    { path: 's1.h2[0]', field: 'talksHeading' },

    { path: 's2.h2[0]', field: 'audiencesHeading' },
    { path: 's2.p[0]', field: 'bookingNote', html: true },
    { path: 's2.div[3]', field: 'audiences[0]' },
    { path: 's2.div[4]', field: 'audiences[1]' },
    { path: 's2.div[5]', field: 'audiences[2]' },
    { path: 's2.div[6]', field: 'audiences[3]' },
    { path: 's2.div[7]', field: 'audiences[4]' },
  ],

  huddlePage: [
    { path: 's0.div[3]', field: 'hero.eyebrow' },
    { path: 's0.h1[0]', field: 'hero.heading' },
    { path: 's0.p[0]', field: 'hero.intro' },
    { path: 's0.a[0]', field: 'heroButton.label', href: 'heroButton.url' },

    { path: 's1.div[3]', field: 'strands[0].eyebrow' },
    { path: 's1.h3[0]', field: 'strands[0].heading' },
    { path: 's1.p[0]', field: 'strands[0].body' },
    { path: 's1.div[5]', field: 'strands[1].eyebrow' },
    { path: 's1.h3[1]', field: 'strands[1].heading' },
    { path: 's1.p[1]', field: 'strands[1].body' },
    { path: 's1.div[7]', field: 'strands[2].eyebrow' },
    { path: 's1.h3[2]', field: 'strands[2].heading' },
    { path: 's1.p[2]', field: 'strands[2].body' },

    { path: 's2.h2[0]', field: 'episodesHeading' },
    { path: 's2.span[27]', field: 'episodesNote' },

    { path: 's3.div[3]', field: 'f101Eyebrow' },
    { path: 's3.h2[0]', field: 'f101Heading' },
    { path: 's3.p[0]', field: 'f101Body' },
    { path: 's3.span[1]', field: 'f101Note' },
  ],

  newsPage: [
    { path: 's0.div[0]', field: 'hero.eyebrow' },
    { path: 's0.h1[0]', field: 'hero.heading' },
    { path: 's0.p[0]', field: 'hero.intro' },
  ],

  blogPage: [
    { path: 's0.div[4]', field: 'hero.eyebrow' },
    { path: 's0.h1[0]', field: 'hero.heading' },
    { path: 's0.p[0]', field: 'hero.intro' },
    { path: 's1.h2[0]', field: 'latestHeading' },
  ],

  communityPage: [
    { path: 's0.div[2]', field: 'hero.eyebrow' },
    { path: 's0.h1[0]', field: 'hero.heading' },
    { path: 's0.p[0]', field: 'hero.intro' },

    { path: 's1.h2[0]', field: 'sections[0].heading' },
    { path: 's1.p[0]', field: 'sections[0].body' },
    { path: 's1.h2[1]', field: 'sections[1].heading' },
    { path: 's1.p[1]', field: 'sections[1].body' },
    { path: 's1.h2[2]', field: 'sections[2].heading' },
    { path: 's1.p[2]', field: 'sections[2].body' },

    { path: 's2.h2[0]', field: 'closingHeading' },
    { path: 's2.p[0]', field: 'closingBody' },
    { path: 's2.a[0]', field: 'closingButton.label', href: 'closingButton.url' },
  ],

  contactPage: [
    { path: 's0.div[3]', field: 'hero.eyebrow' },
    { path: 's0.h1[0]', field: 'hero.heading' },
    { path: 's0.p[0]', field: 'hero.intro' },

    { path: 's1.h2[0]', field: 'sections[0].heading' },
    { path: 's1.p[0]', field: 'sections[0].body' },
  ],
};

// ---------------------------------------------------------------------------
// Text in the design's markup <-> text in a Sanity field.
//
// These two are inverses, and that is the whole design: `toField(toMarkup(x))`
// must give back `x`, so seeding from the design and rendering back produces
// byte-identical pages. verify-text-roundtrip.js asserts it.
//
// The bound copy uses exactly three things beyond plain words — `&amp;` (14
// times), one `<br />`, and the anchor around the booking email — so the pair
// below handles those three and nothing else. Anything richer belongs in a blog
// post, which has Portable Text and a template built for it.
// ---------------------------------------------------------------------------

/** The design's markup -> what Ricky should see in a text box. */
function toField(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** What Ricky typed -> the design's markup. */
function toMarkup(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // A line break inside a heading or an honour is the one bit of formatting
    // the fixed layouts can take. "Petersburg High School Hall of Fame,
    // individual / and 1979 state championship team" is written as two lines.
    .replace(/\n/g, '<br />');
}

/**
 * The booking sentence on /speaking wraps the email address in a styled link.
 *
 * The schema says the address itself comes from Site Settings, so it is written
 * once — which means the sentence cannot be stored as raw markup, or Ricky
 * would be editing an anchor tag and the address would live in two places. He
 * writes plain prose with the address in it; the anchor is rebuilt here from
 * the design's own, so the styling stays the design's.
 *
 * If the address is not in the sentence, the sentence renders as written. A
 * missing link is a smaller failure than a mangled one.
 */
function linkEmail(markup, email, anchorTemplate) {
  if (!email || !anchorTemplate) return markup;
  const at = markup.indexOf(toMarkup(email));
  if (at === -1) return markup;
  const anchor = anchorTemplate.replace(/>[^<]*<\/a>/, `>${toMarkup(email)}</a>`);
  return (
    markup.slice(0, at) + anchor + markup.slice(at + toMarkup(email).length)
  );
}

/** Read `hero.heading` or `honours[3].title` out of a page document. */
function readField(doc, field) {
  return field.split('.').reduce((node, part) => {
    if (node == null) return null;
    const open = part.indexOf('[');
    if (open !== -1 && part.endsWith(']')) {
      const arr = node[part.slice(0, open)];
      return Array.isArray(arr) ? arr[Number(part.slice(open + 1, -1))] : null;
    }
    return node[part];
  }, doc);
}

/**
 * Put a page's words back into the design's markup.
 *
 * Every binding is independent and skipped when the field is absent, so a
 * half-filled document renders the design's own copy everywhere else. That is
 * what lets this be seeded and shipped without a flag day, and what makes a
 * field Ricky clears fall back rather than leaving a blank heading.
 *
 * `paras` binds one blank-line-separated field to a run of <p> slots. If the
 * field has fewer paragraphs than the design drew, the spare slots are emptied
 * rather than left showing the old copy; more paragraphs than slots are joined
 * into the last one, so nothing Ricky writes is silently dropped.
 */
function applyText(html, bindings, doc, dc, opts = {}) {
  let out = html;
  const applied = [];

  for (const b of bindings) {
    const value = readField(doc, b.field);
    if (value == null || value === '') continue;

    if (b.paras) {
      const chunks = String(value).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
      b.paras.forEach((p, i) => {
        const isLast = i === b.paras.length - 1;
        const text = isLast ? chunks.slice(i).join('\n\n') : chunks[i];
        out = dc.set(out, p, text ? toMarkup(text) : '');
      });
      applied.push(b.field);
      continue;
    }

    let markup = toMarkup(value);
    if (b.html) {
      markup = linkEmail(markup, opts.email, opts.emailAnchor);
    }
    out = dc.set(out, b.path, markup);

    // A button's destination travels with its label.
    if (b.href) {
      const url = readField(doc, b.href);
      if (url) out = dc.setAttrs(out, b.path, { href: String(url) });
    }

    applied.push(b.field);
  }

  return { html: out, applied };
}

module.exports = { TEXT, toField, toMarkup, readField, applyText };
