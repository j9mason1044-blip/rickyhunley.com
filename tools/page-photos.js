/**
 * Which photograph on which page is which field in Sanity.
 *
 * One map, used by both sides: `studio/scripts/migrate-photos.js` reads it to
 * decide what to upload and where to file it, and `build-static.js` reads it to
 * decide which `<img>` to point at Sanity. A single list means the seeder and
 * the renderer cannot drift — the failure mode that would otherwise put a photo
 * in a field nothing renders.
 *
 * `path` addresses the design's markup through tools/dc-paths.js.
 * `field` is a path into the page document, with `[n]` for array members.
 * `asset` is the file in assets/, which is how the seeder finds the original
 * via the mapping in build-assets.js.
 * `width` is the widest the photograph is ever displayed, doubled for density
 * when the URL is built — it decides what Sanity is asked to deliver.
 *
 * Deliberately absent:
 *
 * - `assets/hunley-huddle-logo.png` (home s5, huddle s0) and the two RH logo
 *   SVGs. Brand marks, not photography. Ricky replacing the logo through a
 *   photo picker is a way to break the site's identity by accident, and the
 *   vector originals live in Dropbox.
 * - The blog index cards (blog s2). Those already come from Sanity — they are
 *   `blogPost.coverImage`, rendered by tools/blog-index.js.
 * - The News page. Its header is text on a plain ground with no photograph at
 *   all, so `newsPage.hero.image` drives only the social card. See the note on
 *   that field.
 */

/**
 * Sizes come from build-assets.js, which decided them by measuring the layout.
 * Repeating them here rather than importing keeps build-static.js independent
 * of a script that needs ffmpeg and a Dropbox mount to load.
 */
const PHOTOS = {
  homePage: [
    { path: 's0.img[0]', field: 'hero.image', asset: 'hero-asu.jpg', width: 2400 },
    { path: 's2.img[0]', field: 'reelStill', asset: 'practice-sm.jpg', width: 1200 },
    { path: 's3.img[0]', field: 'aboutPhoto', asset: 'headshot.jpg', width: 1200 },
    { path: 's6.img[0]', field: 'f101Photos[0]', asset: 'f101-a.jpg', width: 1000 },
    { path: 's6.img[1]', field: 'f101Photos[1]', asset: 'f101-b.jpg', width: 1000 },
    { path: 's6.img[2]', field: 'f101Photos[2]', asset: 'f101-d.jpg', width: 1000 },
    { path: 's6.img[3]', field: 'f101Photos[3]', asset: 'f101-c.jpg', width: 1000 },
  ],

  aboutPage: [
    { path: 's0.img[0]', field: 'hero.image', asset: 'hunley-ricky-3.jpg', width: 2400 },
    // The three crossfading columns, in the order the design deals them.
    { path: 's3.img[0]', field: 'gallery[0]', asset: 'ua-1983.jpg', width: 900 },
    { path: 's3.img[1]', field: 'gallery[1]', asset: 'mag-cover-82.jpg', width: 900 },
    { path: 's3.img[2]', field: 'gallery[2]', asset: 'rhunley1.jpg', width: 900 },
    { path: 's3.img[3]', field: 'gallery[3]', asset: 'denver.jpg', width: 900 },
    { path: 's3.img[4]', field: 'gallery[4]', asset: 'sideline.jpg', width: 900 },
    { path: 's3.img[5]', field: 'gallery[5]', asset: 'coaching-sm.jpg', width: 900 },
    { path: 's3.img[6]', field: 'gallery[6]', asset: 'family.jpg', width: 1400 },
    { path: 's3.img[7]', field: 'gallery[7]', asset: 'banquet.jpg', width: 900 },
    { path: 's3.img[8]', field: 'gallery[8]', asset: 'hunley-bw.jpg', width: 900 },
  ],

  speakingPage: [
    { path: 's0.img[0]', field: 'hero.image', asset: 'speaking-glendale.jpg', width: 1600 },
    { path: 's2.img[0]', field: 'photos[0]', asset: 'huddle-prescott-sm.jpg', width: 1200 },
    { path: 's2.img[1]', field: 'photos[1]', asset: 'f101-c-sm.jpg', width: 1200 },
    { path: 's2.img[2]', field: 'photos[2]', asset: 'community-sm.jpg', width: 1200 },
  ],

  huddlePage: [
    { path: 's0.img[0]', field: 'hero.image', asset: 'huddle-header-sm.jpg', width: 1800 },
    { path: 's3.img[0]', field: 'f101Photos[0]', asset: 'f101-a.jpg', width: 1000 },
    { path: 's3.img[1]', field: 'f101Photos[1]', asset: 'f101-b.jpg', width: 1000 },
    { path: 's3.img[2]', field: 'f101Photos[2]', asset: 'f101-c.jpg', width: 1000 },
    { path: 's3.img[3]', field: 'f101Photos[3]', asset: 'f101-d.jpg', width: 1000 },
  ],

  blogPage: [
    { path: 's0.img[0]', field: 'hero.image', asset: 'blog-header-sm.jpg', width: 1800 },
  ],

  communityPage: [
    { path: 's0.img[0]', field: 'hero.image', asset: 'contact-nogales.jpg', width: 1600 },
    { path: 's2.img[0]', field: 'photos[0]', asset: 'f101-b.jpg', width: 1000 },
    { path: 's2.img[1]', field: 'photos[1]', asset: 'f101-d.jpg', width: 1000 },
  ],

  contactPage: [
    { path: 's0.img[0]', field: 'hero.image', asset: 'contact-nau.jpg', width: 1600 },
    { path: 's1.img[0]', field: 'photos[0]', asset: 'contact-nogales.jpg', width: 1600 },
  ],

  // No on-page photograph — see the note above.
  newsPage: [],
};

/** Which `sc-if` flag holds each page, and which document type it maps to. */
const PAGE_TYPES = {
  isHome: 'homePage',
  isAbout: 'aboutPage',
  isSpeaking: 'speakingPage',
  isHuddle: 'huddlePage',
  isNews: 'newsPage',
  isBlog: 'blogPage',
  isCommunity: 'communityPage',
  isContact: 'contactPage',
};

/**
 * `object-position: 62% 34%` -> a Sanity hotspot.
 *
 * The design hand-tuned these on thirteen photographs because the subject is
 * off-centre, and they are the difference between Ricky's head being in frame
 * and not. Carrying them across as hotspots is what lets him swap a photograph
 * later and set the same thing himself, with a crop tool rather than by asking
 * someone to edit CSS.
 *
 * Sanity's hotspot also carries a crop rectangle; height/width of 1 means "the
 * whole image, focused here", which is what an object-position is.
 */
function hotspotFrom(objectPosition) {
  const m = /^\s*([\d.]+)%\s+([\d.]+)%\s*$/.exec(objectPosition || '');
  const x = m ? Number(m[1]) / 100 : 0.5;
  const y = m ? Number(m[2]) / 100 : 0.5;
  return { x, y, height: 1, width: 1 };
}

/** The inverse, for rendering: a hotspot back to the CSS the design expects. */
function objectPositionFrom(hotspot) {
  const pct = (n) => {
    const v = Number((n * 100).toFixed(4));
    return Number.isInteger(v) ? String(v) : String(v);
  };
  const x = hotspot && typeof hotspot.x === 'number' ? hotspot.x : 0.5;
  const y = hotspot && typeof hotspot.y === 'number' ? hotspot.y : 0.5;
  return `${pct(x)}% ${pct(y)}%`;
}

/**
 * A Sanity CDN URL for a photograph at the size the layout uses.
 *
 * `object-position` still does the cropping, exactly as the design drew it —
 * this asks only for a correctly sized, correctly compressed file. Cropping
 * server-side around the focal point instead would need each photograph's
 * display box ratio, which is set in CSS and varies per breakpoint; getting it
 * wrong crops a face out. The hotspot is carried as object-position, so the
 * result is the design's own framing.
 *
 * `width` is asked for as-is, not doubled. The numbers in PHOTOS come from
 * build-assets.js, where they are the width of the *file* it wrote and already
 * account for high-density screens — hero-asu.jpg is 2400px wide for a
 * full-bleed hero. Doubling them again asked Sanity for 4800px and served a
 * 967 KB hero in place of a 458 KB one, on the largest image on the home page.
 *
 * (This is the opposite convention to coverUrl() in blog-index.js, which does
 * double — there the number is the card's CSS width, not a file size.)
 */
function photoUrl(image, width) {
  if (!image || !image.url) return null;
  return `${image.url}?w=${width}&auto=format&q=72`;
}


/** Read `hero.image` or `gallery[3]` out of a page document. */
function readField(doc, field) {
  return field.split('.').reduce((node, part) => {
    if (node == null) return null;
    const open = part.indexOf('[');
    if (open !== -1 && part.endsWith(']')) {
      const arr = node[part.slice(0, open)];
      const idx = Number(part.slice(open + 1, -1));
      return Array.isArray(arr) ? arr[idx] : null;
    }
    return node[part];
  }, doc);
}

/**
 * Point a page's photographs at Sanity.
 *
 * Applied to the design's markup before build-static.js transforms it, so the
 * Sanity URL is already absolute by the time the `assets/` -> `/assets/`
 * rewrite runs and is left alone by it.
 *
 * Every photograph is independent: one missing from Sanity leaves the design's
 * own file in place rather than blanking the image. That is what lets this ship
 * before every page is seeded, and what makes a deleted asset degrade to the
 * previous photograph instead of to a broken tile.
 *
 * On `object-position`: the value is rewritten from the hotspot only where the
 * design already had one, or where Ricky has moved the hotspot off centre.
 * Adding `object-position:50% 50%` to the twelve photographs the design left
 * alone would be a no-op in the browser and pure noise in the diff — and this
 * migration is verified by reading that diff.
 */
function applyPhotos(html, bindings, doc, dc) {
  let out = html;
  const applied = [];

  for (const b of bindings) {
    const image = readField(doc, b.field);
    if (!image || !image.url) continue;

    const url = photoUrl(image, b.width);
    const attrs = { src: url };
    if (image.alt) attrs.alt = image.alt;

    const style = dc.getAttr(out, b.path, 'style') || '';
    const had = /object-position:/.test(style);
    const wanted = objectPositionFrom(image.hotspot);
    const centred = wanted === '50% 50%';

    if (had) {
      attrs.style = style.replace(
        /object-position:[^;]*/,
        `object-position:${wanted}`
      );
    } else if (!centred) {
      // No object-position in the design, but Ricky has moved the hotspot.
      // Insert it next to object-fit, where it belongs and where the design
      // would have written it.
      attrs.style = /object-fit:[^;]*/.test(style)
        ? style.replace(/(object-fit:[^;]*)/, `$1; object-position:${wanted}`)
        : `${style}; object-position:${wanted}`;
    }

    out = dc.setAttrs(out, b.path, attrs);
    applied.push(b.field);
  }

  return { html: out, applied };
}

module.exports = {
  PHOTOS,
  PAGE_TYPES,
  hotspotFrom,
  objectPositionFrom,
  photoUrl,
  readField,
  applyPhotos,
};
