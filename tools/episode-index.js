/**
 * Rebuilds the podcast episode list on /huddle from Sanity content, grouped by
 * season.
 *
 * The same trick as tools/news-index.js: the design writes its nine episodes
 * out longhand, so the first row is treated as an exemplar and refilled once per
 * `episode`. Every attribute and inline style is reused untouched — the design
 * keeps deciding what an episode row looks like, Sanity decides how many there
 * are, what season they belong to and where they point.
 *
 * Until now the episodes were the last thing on the site still rendered from
 * the design. They were in Sanity and had been for weeks, but nothing read
 * them, so adding an episode in the Studio changed nothing — which is exactly
 * the complaint that closed the same gap on the News page in September.
 */

const { escapeHtml, setNth, linkTo, replaceRun } = require('./exemplar');

/** Six spaces, the indent the design gives an episode row inside its section. */
const INDENT = '      ';

/**
 * What marks an episode row: the fixed width that keeps every "EP. n" label in
 * the same column. It is the one thing in the section that belongs to the rows
 * and to nothing else — not the heading, which is editable copy, and not the
 * link below the list, which is a button.
 */
const ROW_LABEL = 'min-width:56px';

/**
 * A season heading.
 *
 * Built out of the row's own label style rather than invented: Archivo, 12px,
 * 700, the same 0.14em tracking and the same #9B9689 as the "EP. 9" beside it.
 * That is already this list's vocabulary for a small label, so a season reads as
 * part of the list rather than as a second design.
 *
 * `margin-top` is 0 on the first — the h2 above it has its own 40px — and
 * generous on the rest, because the gap is what separates one season's closed
 * list from the next.
 */
const seasonHeading = (label, first) =>
  `<h3 style="margin:${first ? '0' : '64px'} 0 18px; font-family:Archivo, sans-serif; ` +
  `font-size:12px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; ` +
  `color:#9B9689">${escapeHtml(label)}</h3>`;

/** "Season 2", or its name if Ricky gave it one in the Studio. */
const seasonLabel = (season) =>
  season.title ? `Season ${season.number} — ${season.title}` : `Season ${season.number}`;

/**
 * Episodes in the order they are listed: newest season first, and newest
 * episode first within it — which is the order the design drew, EP. 9 down to
 * EP. 1.
 *
 * Sorted here rather than in the GROQ query so that a `content.json` written by
 * an older fetch still renders in the right order, and so the ordering is
 * visible next to the markup that depends on it.
 */
function groupBySeason(episodes) {
  const seasons = new Map();

  for (const ep of episodes) {
    const number = ep.season && ep.season.number;
    if (number == null) continue; // season is required in the schema; belt and braces
    if (!seasons.has(number)) {
      seasons.set(number, { number, title: (ep.season && ep.season.title) || null, episodes: [] });
    }
    seasons.get(number).episodes.push(ep);
  }

  const out = [...seasons.values()].sort((a, b) => b.number - a.number);
  for (const season of out) {
    season.episodes.sort((a, b) => (b.episodeNumber || 0) - (a.episodeNumber || 0));
  }
  return out;
}

/**
 * The episode list on /huddle.
 *
 * Two row exemplars, not one, for the reason the news rows need two: the design
 * gives its *last* row a bottom hairline the others do not have, and that is
 * what closes the list. Here every season's last row gets it, so each season is
 * drawn as a list that opens and closes — which is what makes the grouping read
 * without a box or a rule of its own.
 *
 * With one season the headings are dropped entirely and the page is exactly the
 * list it has always been. A lone "Season 1" over the only nine episodes there
 * are is a label that tells the reader nothing, the same judgement that renders
 * a blog series of one as a feature panel instead of a list of one.
 */
function renderEpisodes(huddleHtml, episodes) {
  // Found by the row label's own fixed width, not by the "Episodes" heading
  // above it. That heading is Sanity copy (`huddlePage.episodesHeading`) and
  // Ricky can rename it in the Studio at any time — searching for its current
  // wording would be a build that breaks the day he does.
  const marker = huddleHtml.indexOf(ROW_LABEL);
  if (marker === -1) {
    throw new Error('could not find the episode rows in the design');
  }
  const start = huddleHtml.lastIndexOf('<section', marker);
  const end = huddleHtml.indexOf('</section>', marker) + '</section>'.length;
  const section = huddleHtml.slice(start, end);

  // Every anchor in the section, minus the "@hunleyhuddle" button below the
  // list — an episode row is the only one carrying the fixed-width EP. label.
  const rows = (section.match(/<a href="[^"]*"[^>]*>[\s\S]*?<\/a>/g) || []).filter((a) =>
    a.includes(ROW_LABEL)
  );
  if (rows.length < 2) {
    throw new Error('could not find the episode row exemplars in the design');
  }

  // Three flat spans: "EP. 9", the title, the platform. Asserted rather than
  // assumed, because setNth() below counts on that shape.
  if ((rows[0].match(/<span\b/g) || []).length !== 3) {
    throw new Error('an episode row is no longer three spans — see tools/episode-index.js');
  }

  // And the first of the three really is the episode label.
  //
  // This is the guard that catches the failure this file caused on its first
  // run. The page's Sanity copy is bound to the design *by position* — the note
  // under the list is "the 28th span of this section" — so rebuilding the rows
  // before applyText() runs silently moves that sentence into the last row.
  // build-static.js now rebuilds afterwards; this is what says so out loud if
  // the order is ever swapped back.
  for (const row of [rows[0], rows[rows.length - 1]]) {
    const label = /<span\b[^>]*>([\s\S]*?)<\/span>/.exec(row);
    if (!label || !/^EP\.\s/.test(label[1].trim())) {
      throw new Error(
        'an episode row does not start with its "EP. n" label — the page copy is ' +
          'bound by position, so renderEpisodes() must run after applyText(). ' +
          'See tools/episode-index.js'
      );
    }
  }

  const middle = rows[0];
  const last = rows[rows.length - 1];

  const seasons = groupBySeason(episodes);
  if (!seasons.length) return huddleHtml;

  const rebuilt = [];
  for (const [i, season] of seasons.entries()) {
    if (seasons.length > 1) rebuilt.push(seasonHeading(seasonLabel(season), i === 0));

    for (const [j, ep] of season.episodes.entries()) {
      let html = linkTo(j === season.episodes.length - 1 ? last : middle, ep.url);
      html = setNth(html, 'span', 0, `EP. ${escapeHtml(ep.episodeNumber)}`);
      html = setNth(html, 'span', 1, escapeHtml(ep.title));
      html = setNth(html, 'span', 2, escapeHtml(ep.platform));
      rebuilt.push(html);
    }
  }

  const out = replaceRun(section, rows, rebuilt, INDENT);
  return huddleHtml.slice(0, start) + out + huddleHtml.slice(end);
}

module.exports = { renderEpisodes, groupBySeason };
