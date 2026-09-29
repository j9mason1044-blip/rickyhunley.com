/**
 * The tickets button in the Football 101 section of /huddle.
 *
 * The design draws that spot as a dead end: a grey, unclickable
 * `<span aria-disabled="true">Tickets coming soon</span>`. That is the right
 * thing to draw, because for most of the year it is the truth — but it was the
 * *only* thing the site could show. `huddlePage.f101Button` has existed in the
 * Studio since the migration, promising in its own description that a filled-in
 * address would appear as a button, and nothing read it. On 2026-09-29 the
 * document held a real Eventbrite link for a real dated session while the live
 * page said "Tickets coming soon" beside it.
 *
 * So this turns that spot into the two states it always described:
 *
 *   switch on, with text and a link  ->  a real button, in the design's own
 *                                        primary-button treatment
 *   anything else                    ->  the placeholder, whose wording is now
 *                                        `f101ButtonPlaceholder` in the Studio
 *
 * The switch is separate from the link on purpose. Between sessions the last
 * Eventbrite URL is the most useful thing to keep, and "delete the address to
 * hide the button" means finding it again in an email six months later.
 *
 * **Ordering: this must run AFTER applyText().** The huddle page's copy is
 * bound to the design by position, and two of those bindings are the spans this
 * touches — `s3.span[0]` is the placeholder and `s3.span[1]` the note beside
 * it. Replacing the span with an `<a>` first would slide the note one element
 * to the left and render it inside the button. The build would succeed and
 * check.js would pass, because its verifiers run against the design rather than
 * against the built page. Same trap as renderEpisodes(); see tools/page-text.js.
 *
 * Run BEFORE transform(), so the button's `style-hover` is lifted into a real
 * `.hv-N` rule by the same machinery as every other hover on the site.
 */

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

/** The placeholder, matched on the attribute the design gives it. */
const PLACEHOLDER = /<span aria-disabled="true" style="([^"]*)"[^>]*>([\s\S]*?)<\/span>/;

/**
 * The placeholder's greys, and what the live button uses instead.
 *
 * Only colours are swapped: every dimension — the type, the tracking, the
 * 18px/30px padding, the 1px border that is part of the box's width — is
 * carried over from what the designer drew, so the button cannot end up a
 * different size from the placeholder it replaces. The navy-on-cream fill and
 * the accent hover are the design's own primary-button treatment, the one the
 * "Book Ricky" and "Get in touch" buttons use at exactly this size.
 *
 * Each pair is asserted to be present before anything is replaced. A restyled
 * placeholder stops the build rather than producing a half-recoloured button
 * with grey text on navy.
 */
const RECOLOUR = [
  ['color:#8A8579', 'color:#fff'],
  ['background:#EDEAE4', 'background:#0C234B'],
  ['border:1px solid #DCD7CD', 'border:1px solid #0C234B'],
];
const HOVER = 'background:var(--accent, #AB0520); color:#fff';

/**
 * Is there a button to show?
 *
 * The switch has to be on AND both halves of the link present. A button with
 * no address is the thing the field's description has always promised not to
 * ship, and a button with no words is worse: an empty navy rectangle.
 */
function ctaFrom(huddlePage) {
  if (!huddlePage) return null;
  if (huddlePage.f101ButtonEnabled !== true) return null;

  const button = huddlePage.f101Button || {};
  const label = String(button.label || '').trim();
  const url = String(button.url || '').trim();
  if (!label || !url) {
    return {
      incomplete: true,
      missing: [!label && 'button text', !url && 'link'].filter(Boolean),
    };
  }

  return { label, url };
}

/** The placeholder's own markup, recoloured, carrying the label and the link. */
function buttonHtml(style, { label, url }) {
  let out = style;
  for (const [grey, live] of RECOLOUR) {
    if (!out.includes(grey)) {
      throw new Error(
        `f101 tickets button: the placeholder no longer declares "${grey}".\n` +
          'Its styling has changed in the design, so recolouring it would ship a half-styled button.\n' +
          'Update RECOLOUR in tools/f101-cta.js to the new treatment.'
      );
    }
    out = out.replace(grey, live);
  }
  // `cursor:default` says "this does nothing", which stops being true here.
  out = out.replace(/;?\s*cursor:default/, '');

  return (
    `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer"` +
    ` style="${out}" style-hover="${HOVER}">${escapeHtml(label)}</a>`
  );
}

/**
 * Swap the placeholder for the live button, when there is one.
 *
 * Returns `{ html, state }` where state is 'off', 'incomplete' or 'on', so the
 * build log can tell "Ricky has not switched it on" apart from "Ricky switched
 * it on and nothing happened" — only the second needs explaining to anyone.
 */
function renderF101Cta(html, huddlePage) {
  const found = PLACEHOLDER.exec(html);
  if (!found) {
    throw new Error(
      'f101 tickets button: no <span aria-disabled="true"> in the huddle block.\n' +
        'The design has moved — find what now sits where the tickets button goes ' +
        'and update PLACEHOLDER in tools/f101-cta.js.'
    );
  }

  const cta = ctaFrom(huddlePage);
  if (!cta) return { html, state: 'off' };
  if (cta.incomplete) return { html, state: 'incomplete', missing: cta.missing };

  return {
    html: html.replace(PLACEHOLDER, () => buttonHtml(found[1], cta)),
    state: 'on',
  };
}

module.exports = { renderF101Cta };
