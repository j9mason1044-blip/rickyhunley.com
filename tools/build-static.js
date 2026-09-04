#!/usr/bin/env node
/**
 * Converts the Claude Design source (`tools/RickyHunley.com.dc.html`) into the
 * plain static pages at the repo root.
 *
 * The design file is one Design Component holding all eight pages, switched by
 * an `isHome`/`isAbout`/... state variable. This script splits it into eight
 * standalone HTML files and resolves the handful of DC-only constructs:
 *
 *   <sc-if value="{{ isX }}">   -> kept for page X, dropped everywhere else
 *   onClick="{{ nav.x }}"       -> href="/x.html"
 *   style-hover="..."           -> a .hv-N class in css/site.css
 *   {{ accent }}, {{ reelUrl }} -> their default prop values
 *
 * Every inline style value is carried across untouched. Re-run after pulling a
 * new version of the design file:  node tools/build-static.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderBlogIndex, coverUrl } = require('./blog-index');
const { renderNewsRows, renderPressCards } = require('./news-index');
const dc = require('./dc-paths');
const { PHOTOS, PAGE_TYPES, applyPhotos, readField } = require('./page-photos');
const { TEXT, applyText } = require('./page-text');

/** Counted across the page loop, and reported so a build log says what landed. */
let photoCount = 0;
let textCount = 0;

const ROOT = path.join(__dirname, '..');
const SRC = path.join(__dirname, 'RickyHunley.com.dc.html');

// Prop defaults, read off the `data-props` block and renderVals() in the source.
const ACCENT = '#AB0520';
const REEL_URL = 'https://youtu.be/tGlJqTsDWkE';
const HAS_HERO_VIDEO = false; // heroVideoId defaults to '' -> the iframe branch is dead
const SHOW_FOUNDATION = true;

// The design owns the blog toggle, and its default is now true — so the blog
// index and the twelve article pages behind it are built and linked.
const SHOW_BLOG = true;

// The News page is back, and its links now come from Sanity.
//
// It was hidden on 2026-09-03 because seven of its nine press links did not go
// where they said — and could not be fixed in the Studio, because the URLs were
// written into the design and nothing read `newsItem`. tools/news-index.js is
// what closed that gap: the rows and the home page's press cards are rebuilt
// from the documents, so a bad link is now an edit rather than a deploy.
//
// Turning this back to false hides the page, its navigation links and the home
// page's "In the press" row in one move — see HIDDEN_PAGES and PROMO_SECTIONS.
const SHOW_NEWS = true;

// Empty in the design, which falls back to '#'. A CTA linking to '#' is a dead
// button on a live site, so the whole link is dropped until there is a real URL.
const EVENTBRITE_URL = '';

/**
 * Pages built but not linked, or not built at all.
 *
 * Hiding a page means it is not generated, it is dropped from the sitemap,
 * every navigation link to it is removed — header, mobile drawer and footer —
 * and any section elsewhere that exists only to advertise it goes too (see
 * PROMO_SECTIONS). Hiding the blog also deletes the article pages under blog/.
 */
const HIDDEN_PAGES = [
  ...(SHOW_BLOG ? [] : ['blog']),
  ...(SHOW_NEWS ? [] : ['news']),
];

/**
 * How many sections on *other* pages exist only to promote each page — the
 * home page's "In the press" row is the News page's one. Hiding a page drops
 * these along with its navigation links; the count is asserted after rendering
 * so a restructured design fails the build instead of shipping a headed row of
 * links to nowhere.
 */
const PROMO_SECTIONS = { news: 1, blog: 0 };

const SITE_URL = 'https://rickyhunley.com';

/**
 * Three of the design's photographs were saved as PNG. As PNG they are several
 * megabytes each; as JPEG they are a couple of hundred KB with no visible
 * difference (none of them has an alpha channel). tools/build-assets.js writes
 * them out as .jpg, so the references have to follow.
 */
const ASSET_RENAMES = {
  'assets/speaking-glendale.png': 'assets/speaking-glendale.jpg',
  'assets/contact-nogales.png': 'assets/contact-nogales.jpg',
  'assets/denver.png': 'assets/denver.jpg',
};

/**
 * The hero video is the one asset that could not be recovered: it exists only
 * inside the design project, where the API truncates it. The hero still sits
 * behind the video and is what shows when the video is absent, so the element
 * is simply dropped until the file is supplied. Drop RH-Hero-3.mp4 into
 * uploads/ and re-run this script to bring it back.
 */
const HERO_VIDEO = 'uploads/RH-Hero-3.mp4';
const heroVideoPresent = fs.existsSync(path.join(ROOT, HERO_VIDEO));

const PAGES = [
  {
    key: 'home',
    file: 'index.html',
    flag: 'isHome',
    title: 'Ricky Hunley — College Football Hall of Fame Speaker',
    description:
      'Linebacker, NFL veteran, coach and mentor. Ricky Hunley speaks on leadership, legacy and service — five decades on and off the field.',
    image: 'assets/hero-asu.jpg',
  },
  {
    key: 'about',
    file: 'about.html',
    flag: 'isAbout',
    title: 'About',
    description:
      'From Petersburg, Virginia to the College Football Hall of Fame: two-time consensus All-American at Arizona, seventh overall in the 1984 NFL Draft, seven seasons in the league.',
    image: 'assets/hunley-ricky-3.jpg',
  },
  {
    key: 'speaking',
    file: 'speaking.html',
    flag: 'isSpeaking',
    title: 'Speaking',
    description:
      'Book Ricky Hunley for keynotes, team talks and banquets. Leadership, resilience and service, drawn from a career in college and professional football.',
    image: 'assets/huddle-prescott-sm.jpg',
  },
  {
    key: 'huddle',
    file: 'huddle.html',
    flag: 'isHuddle',
    title: 'The Hunley Huddle',
    description:
      'The radio show, live events and podcast where football, brotherhood and community converge.',
    image: 'assets/huddle-header-sm.jpg',
  },
  {
    key: 'news',
    file: 'news.html',
    flag: 'isNews',
    title: 'News',
    description:
      'Latest features, interviews and appearances covering Ricky Hunley.',
    image: 'assets/hero-asu.jpg',
  },
  {
    key: 'blog',
    file: 'blog.html',
    flag: 'isBlog',
    title: 'Blog',
    description:
      'Insights from Ricky Hunley on leadership, the game and the work that follows it.',
    image: 'assets/blog-header-sm.jpg',
  },
  {
    key: 'community',
    file: 'community.html',
    flag: 'isCommunity',
    title: 'Community',
    description:
      'Easter Seals, the Arizona Diaper Bank, the American Heart Association, the Boys & Girls Club of Tucson and the foster-care work of the Ricky Hunley Foundation.',
    image: 'assets/f101-b.jpg',
  },
  {
    key: 'contact',
    file: 'contact.html',
    flag: 'isContact',
    title: 'Contact',
    description:
      'Get in touch with Ricky Hunley about speaking engagements, appearances and the Hunley Huddle.',
    image: 'assets/contact-nau.jpg',
  },
];

const HREF_FOR = {
  home: '/',
  about: '/about.html',
  speaking: '/speaking.html',
  huddle: '/huddle.html',
  news: '/news.html',
  blog: '/blog.html',
  community: '/community.html',
  contact: '/contact.html',
};

const src = fs.readFileSync(SRC, 'utf8');

/**
 * Article copy arrives as plain text — from the design's array, or as the text
 * of a Portable Text span — and here it becomes markup. Defined this high up
 * because reading the content is the first thing the build does.
 */
const escapeText = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** `stayCourse` -> `stay-course`. The design's slugs are camelCase; URLs are not. */
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * The blog's articles.
 *
 * Sanity owns these. `tools/fetch-content.js` writes them to
 * `tools/content.json`, and the design's own `posts = [...]` array is the
 * fallback — which is also its remaining job: sample data, so the article
 * template still renders in Claude Design when there is no CMS to ask.
 *
 * The fallback is not just politeness. It means the site can be rebuilt with no
 * network, that a broken fetch cannot silently publish an empty blog, and that
 * the design file stays a working preview of its own template.
 */
const CONTENT_FILE = path.join(__dirname, 'content.json');

/** The design's `## ` / `> ` prefixes, in the shape the Sanity path produces. */
function bodyFromDesign(paragraphs) {
  return paragraphs.map((raw) => {
    const kind = raw.startsWith('## ') ? 'h2' : raw.startsWith('> ') ? 'blockquote' : 'normal';
    const text = raw.startsWith('## ') ? raw.slice(3) : raw.startsWith('> ') ? raw.slice(2) : raw;
    return { kind, html: escapeText(text) };
  });
}

function readDesignPosts() {
  const open = src.indexOf('  posts = [');
  if (open === -1) throw new Error('could not find the posts array');
  const close = src.indexOf("\n  ];", open);
  if (close === -1) throw new Error('unterminated posts array');
  const literal = src.slice(open + '  posts = '.length, close + 4);

  // eslint-disable-next-line no-eval -- an array literal out of a file we own.
  const posts = eval('(' + literal + ')');
  if (!Array.isArray(posts) || !posts.length) throw new Error('no posts parsed');

  return posts.map((p) => ({
    slug: kebab(p.slug),
    designSlug: p.slug,
    title: p.title,
    dek: p.dek,
    category: p.category,
    seriesId: null,
    numberInSeries: null,
    cover: null,
    body: bodyFromDesign(p.body),
    url: `/blog/${kebab(p.slug)}.html`,
  }));
}

function readContent() {
  if (!SHOW_BLOG) return { posts: [], series: [], news: [], fromSanity: false };

  if (fs.existsSync(CONTENT_FILE)) {
    const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
    if (content.posts?.length) {
      return {
        posts: content.posts.map((p) => ({ ...p, url: `/blog/${p.slug}.html` })),
        series: content.series || [],
        // Absent on an older content.json, which simply means the press links
        // still come from the design — the same fallback everything else here
        // has.
        news: content.news || [],
        fetchedAt: content.fetchedAt,
        source: content.source,
        // The page singletons, keyed by _type. Absent on an older content.json,
        // which simply means every page still renders the design's own copy.
        pages: content.pages || {},
        siteSettings: content.siteSettings || null,
        fromSanity: true,
      };
    }
  }

  console.warn(
    'tools/content.json is absent or empty — building the blog from the ' +
      "design's sample posts. Run `node tools/fetch-content.js` for the real ones."
  );
  return { posts: readDesignPosts(), series: [], news: [], fromSanity: false };
}

const CONTENT = readContent();
const POSTS = CONTENT.posts;

/**
 * The press links, newest first, as tools/fetch-content.js ordered them.
 *
 * Empty when there is no content.json — and then the design's own links
 * ship, unchanged. That is deliberate: the fallback has to be the design, or the
 * file stops being a working preview of itself.
 */
const NEWS = SHOW_NEWS ? CONTENT.news || [] : [];

// Filled in once the hashed files are written; page() reads them.
let cssUrl;
let jsUrl;

/**
 * Icon links from the design's <helmet>.
 *
 * This generator writes its own <head> rather than copying the helmet, so
 * anything the design adds there is dropped unless it is picked up explicitly —
 * the favicon arrived that way and would otherwise have vanished without a
 * trace. Only icon-ish rels are taken; the font and preconnect links are
 * already emitted below, and copying them would duplicate them.
 *
 * A link whose file is missing is skipped, so a referenced-but-absent icon
 * gives no icon rather than a 404 on every page.
 */
const iconLinks = (src.match(/<link\b[^>]*>/g) || [])
  .filter((tag) => /rel="(icon|shortcut icon|apple-touch-icon|manifest)"/.test(tag))
  .filter((tag) => {
    const href = (tag.match(/href="([^"]+)"/) || [])[1];
    if (!href || /^https?:/.test(href)) return true;
    return fs.existsSync(path.join(ROOT, href.replace(/^\//, '')));
  })
  .map((tag) => tag.replace(/\s*\/>$/, '>'))
  // Root-absolute, for the same reason the body's asset paths are: an icon
  // written as "assets/favicon.png" resolves to "blog/assets/favicon.png" on
  // an article page, and the tab silently loses its icon.
  .map((tag) => tag.replace(/href="(assets\/)/, 'href="/$1'));

// ---------------------------------------------------------------------------
// 1. Carve the source into shared chrome + one block per page.
// ---------------------------------------------------------------------------

const shellOpen = src.indexOf('<div style="--accent:');
if (shellOpen === -1) throw new Error('could not find the root wrapper div');
const shellEnd = src.indexOf('</x-dc>');
if (shellEnd === -1) throw new Error('could not find </x-dc>');

// Everything between the wrapper div and </x-dc>, minus the wrapper's own
// closing tag on the final line.
let body = src.slice(shellOpen, shellEnd).replace(/<\/div>\s*$/, '');
body = body.slice(body.indexOf('>') + 1); // drop the wrapper's opening tag

const headerMatch = body.match(/<header[\s\S]*?<\/header>/);
if (!headerMatch) throw new Error('could not find <header>');
const header = headerMatch[0];

const footerMatch = body.match(/<footer[\s\S]*?<\/footer>/);
if (!footerMatch) throw new Error('could not find <footer>');
const footer = footerMatch[0];

/** Pull the contents of the top-level `<sc-if value="{{ flag }}">` block. */
function extractBlock(flag) {
  const open = `<sc-if value="{{ ${flag} }}"`;
  const start = body.indexOf(open);
  if (start === -1) throw new Error(`no sc-if block for ${flag}`);
  const afterTag = body.indexOf('>', start) + 1;

  // Walk forward counting nested sc-if opens so we stop on the matching close.
  let depth = 1;
  let i = afterTag;
  while (depth > 0) {
    const nextOpen = body.indexOf('<sc-if', i);
    const nextClose = body.indexOf('</sc-if>', i);
    if (nextClose === -1) throw new Error(`unterminated sc-if for ${flag}`);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 6;
    } else {
      depth--;
      i = nextClose + 8;
      if (depth === 0) return body.slice(afterTag, nextClose);
    }
  }
  throw new Error(`unreachable for ${flag}`);
}

// ---------------------------------------------------------------------------
// 2. Resolve the DC constructs.
// ---------------------------------------------------------------------------

const hoverRules = new Map(); // css text -> class name

/**
 * Sections dropped for pointing at a hidden page, counted so the emit step can
 * insist the removal actually happened. A regex that silently matched nothing
 * would leave the dead press links on the home page and still build green.
 */
const droppedSections = new Map();

/**
 * Remove every <section> whose subtree contains a link to `href`.
 *
 * Written as a scan rather than a regex because <section> can nest, and a lazy
 * `[\s\S]*?</section>` would stop at the first inner close tag — leaving a
 * stray `</section>` behind and unbalancing the page. check.js would report
 * that as a tag-balance failure several steps away from its cause.
 */
function dropSectionsLinkingTo(html, href, key) {
  if (!href) return html;
  const needle = `href="${href}"`;
  const opens = /<section\b/g;
  const tags = /<(\/?)section\b/g;
  let out = '';
  let cursor = 0;
  let m;
  while ((m = opens.exec(html))) {
    if (m.index < cursor) continue;
    tags.lastIndex = m.index;
    let depth = 0;
    let end = -1;
    let t;
    while ((t = tags.exec(html))) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) {
        end = html.indexOf('>', t.index) + 1;
        break;
      }
    }
    if (end === -1) break; // unbalanced markup: leave the remainder alone
    if (html.slice(m.index, end).includes(needle)) {
      out += html.slice(cursor, m.index).replace(/[ \t]+$/, '');
      cursor = end;
      droppedSections.set(key, (droppedSections.get(key) || 0) + 1);
      opens.lastIndex = end;
    }
  }
  return out + html.slice(cursor);
}

function transform(html) {
  let out = html;

  // Nested sc-if blocks whose flag is a known constant.
  if (!HAS_HERO_VIDEO) {
    out = out.replace(
      /<sc-if value="\{\{ hasHeroVideo \}\}"[\s\S]*?<\/sc-if>/g,
      ''
    );
  }
  if (SHOW_FOUNDATION) {
    out = out.replace(
      /<sc-if value="\{\{ showFoundation \}\}"[^>]*>([\s\S]*?)<\/sc-if>/g,
      '$1'
    );
  }

  // The design's own blog toggle, wrapping the nav links to /blog.
  out = SHOW_BLOG
    ? out.replace(/<sc-if value="\{\{ showBlog \}\}"[^>]*>([\s\S]*?)<\/sc-if>/g, '$1')
    : out.replace(/<sc-if value="\{\{ showBlog \}\}"[\s\S]*?<\/sc-if>/g, '');

  // The Eventbrite CTA. With no URL set the design falls back to '#', which on
  // a live site is a button that does nothing — so the link is removed instead,
  // leaving the copy around it ("Dates … are announced each season") intact.
  if (EVENTBRITE_URL) {
    out = out.replace(/\{\{ eventbriteUrl \}\}/g, EVENTBRITE_URL);
  } else {
    out = out.replace(
      /\s*<a href="\{\{ eventbriteUrl \}\}"[^>]*>[\s\S]*?<\/a>/g,
      ''
    );
  }

  // Page-state navigation -> real links. The href is always "#" in the source.
  out = out.replace(
    /href="#"\s+onClick="\{\{ nav\.(\w+) \}\}"/g,
    (_, key) => {
      const href = HREF_FOR[key];
      if (!href) throw new Error(`unknown nav target: ${key}`);
      return `href="${href}"`;
    }
  );

  // The blog index links each article with open.<slug>, which in the design
  // sets state.post and re-renders the isPost block. Here every article is
  // its own page, so the call becomes that page's URL.
  out = out.replace(
    /href="#"\s+onClick="\{\{ open\.(\w+) \}\}"/g,
    (_, slug) => {
      // The design writes camelCase slugs; Sanity's are kebab-case. Match on
      // either, so this works whichever source the posts came from.
      const post = POSTS.find(
        (p) => p.designSlug === slug || p.slug === kebab(slug)
      );
      if (!post) throw new Error(`blog link to an unknown post: ${slug}`);
      return `href="${post.url}"`;
    }
  );

  // Interpolated props.
  out = out.replace(/\{\{ accent \}\}/g, ACCENT);
  out = out.replace(/\{\{ reelUrl \}\}/g, REEL_URL);

  // The hero <video>: DC bound its attributes through a ref. As plain HTML the
  // attributes are just boolean attributes, and the fade-in lives in site.js.
  out = out.replace(/\s+ref="\{\{ heroVideoRef \}\}"/g, ' data-hero-video');
  out = out.replace(/\s+autoPlay="\{\{ true \}\}"/g, ' autoplay');
  out = out.replace(/\s+muted="\{\{ true \}\}"/g, ' muted');
  out = out.replace(/\s+loop="\{\{ true \}\}"/g, ' loop');
  out = out.replace(/\s+playsInline="\{\{ true \}\}"/g, ' playsinline');

  // --- the mobile menu -------------------------------------------------------
  // The burger holds both icons; the design switches between them on state.
  // Both are emitted and js/site.js toggles `hidden`.
  out = out.replace(
    /<sc-if value="\{\{ menuOpen \}\}"[^>]*>\s*(<svg[\s\S]*?<\/svg>)\s*<\/sc-if>/g,
    (_, svg) => svg.replace('<svg ', '<svg data-menu-icon="open" hidden ')
  );
  out = out.replace(
    /<sc-if value="\{\{ menuClosed \}\}"[^>]*>\s*(<svg[\s\S]*?<\/svg>)\s*<\/sc-if>/g,
    (_, svg) => svg.replace('<svg ', '<svg data-menu-icon="closed" ')
  );

  // The drawer itself: rendered, hidden, and toggled by the same script. It is
  // also display:none above 900px via the design's own stylesheet.
  out = out.replace(
    /<sc-if value="\{\{ menuOpen \}\}"[^>]*>\s*(<div data-r="drawer"[\s\S]*?<\/div>)\s*<\/sc-if>/g,
    (_, div) => div.replace('<div ', '<div hidden ')
  );

  out = out.replace(
    /onClick="\{\{ toggleMenu \}\}"/g,
    'data-menu-toggle aria-expanded="false" aria-controls="mobile-menu"'
  );
  out = out.replace('<div hidden data-r="drawer"', '<div hidden id="mobile-menu" data-r="drawer"');

  // Photographs re-encoded from PNG to JPEG by tools/build-assets.js.
  for (const [from, to] of Object.entries(ASSET_RENAMES)) {
    out = out.split(from).join(to);
  }

  // The design writes asset paths relative to the document, which is fine only
  // while every page sits at the root. The article pages do not: from
  // blog/roster.html, "assets/x.jpg" resolves to "blog/assets/x.jpg" and 404s.
  // Root-absolute paths work at any depth, so the shared header and footer can
  // still be rendered once and used by every page.
  out = out.replace(/(src|href)="(assets|uploads)\//g, '$1="/$2/');
  out = out.replace(/url\((assets|uploads)\//g, 'url(/$1/');

  if (!heroVideoPresent) {
    out = out.replace(/<video\b[^>]*data-hero-video[\s\S]*?<\/video>\s*/g, '');
  }

  // style-hover -> a shared class. Values repeat heavily, so they dedupe down
  // to a handful of rules.
  out = out.replace(/\s+style-hover="([^"]*)"/g, (_, css) => {
    let cls = hoverRules.get(css);
    if (!cls) {
      cls = `hv-${hoverRules.size + 1}`;
      hoverRules.set(css, cls);
    }
    return ` data-hv="${cls}"`;
  });

  // Fold the data-hv marker into a real class attribute.
  out = out.replace(/ data-hv="([^"]+)"/g, ' class="$1"');

  // A whole section that exists only to promote a hidden page goes with it.
  // The home page's "In the press" row is three cards plus an "All news →"
  // link; strip only the link and what is left is a headed, empty-looking row
  // of the same dead press links the News page was hidden for. The section is
  // identified by the navigation link it contains rather than by its heading,
  // because the heading is Sanity copy (homePage.pressHeading) and can be
  // renamed in the Studio at any time.
  for (const key of HIDDEN_PAGES) {
    out = dropSectionsLinkingTo(out, HREF_FOR[key], key);
  }

  // Navigation links to hidden pages, wherever they appear.
  for (const key of HIDDEN_PAGES) {
    const href = HREF_FOR[key];
    out = out.replace(
      new RegExp(`\\s*<a href="${href}"[^>]*>[\\s\\S]*?</a>`, 'g'),
      ''
    );
  }

  return out;
}

// ---------------------------------------------------------------------------
// 3. Emit the pages.
// ---------------------------------------------------------------------------

const headerHtml = transform(header);
const footerHtml = transform(footer);

/** Site-relative paths become absolute; a Sanity CDN URL already is. */
const absoluteUrl = (ref) =>
  /^https?:/.test(ref) ? ref : `${SITE_URL}/${ref.replace(/^\//, '')}`;

const escapeAttr = (s) =>
  s
    .replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

function page(meta, content) {
  const fullTitle =
    meta.key === 'home' ? meta.title : `${meta.title} | Ricky Hunley`;
  const canonical =
    meta.key === 'home' ? `${SITE_URL}/` : `${SITE_URL}/${meta.file}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeAttr(fullTitle)}</title>
<meta name="description" content="${escapeAttr(meta.description)}">
<link rel="canonical" href="${canonical}">${
    meta.noIndex ? '\n<meta name="robots" content="noindex">' : ''
  }
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ricky Hunley">
<meta property="og:title" content="${escapeAttr(fullTitle)}">
<meta property="og:description" content="${escapeAttr(meta.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${absoluteUrl(meta.image)}">
<meta name="twitter:card" content="summary_large_image">
${iconLinks.map((l) => `${l}\n`).join('')}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cssUrl}">
</head>
<body>
<a href="#main" class="skip-link">Skip to content</a>
<div style="--accent: ${ACCENT}; background:#FBFAF8; color:#12161F; font-family:'Source Serif 4', Georgia, serif; overflow-x:hidden">
${headerHtml}
  <main id="main">
${content.trimEnd()}
  </main>
${footerHtml}
</div>
<script src="${jsUrl}" defer></script>
</body>
</html>
`;
}

/**
 * Render the design's single `isPost` block for one article.
 *
 * The block holds an `sc-for` over `article.paras` wrapping three mutually
 * exclusive `sc-if` variants — body, subheading, pull quote. The design
 * decides between them in article(), by looking for a `## ` or `> ` prefix on
 * each paragraph; this does the same and picks the matching variant, so the
 * markup for each kind comes from the design rather than from here.
 */
function renderPost(post) {
  const tpl = extractBlock('isPost');

  const loop = tpl.match(/<sc-for list="\{\{ article\.paras \}\}"[^>]*>([\s\S]*?)<\/sc-for>/);
  if (!loop) throw new Error('no sc-for over article.paras');

  const variant = (flag) => {
    const re = new RegExp(
      '<sc-if value="\\{\\{ para\\.' + flag + ' \\}\\}"[^>]*>([\\s\\S]*?)</sc-if>'
    );
    const m = loop[1].match(re);
    if (!m) throw new Error(`no para variant for ${flag}`);
    return m[1].trim();
  };

  // The design's three variants, keyed by the `kind` both content sources emit.
  // A kind with no variant falls back to a paragraph rather than disappearing:
  // an unrenderable block is a bug worth seeing on the page, not one worth
  // hiding by dropping the sentence Ricky wrote.
  const VARIANT = {
    normal: variant('isBody'),
    h2: variant('isSub'),
    blockquote: variant('isQuote'),
  };

  const paras = post.body
    .map((block) =>
      (VARIANT[block.kind] || VARIANT.normal)
        .split('{{ para.text }}')
        .join(block.html)
    )
    .join('\n      ');

  return tpl
    // A function replacement: article copy is arbitrary text, and a bare $&
    // inside it would otherwise be read as a backreference.
    .replace(/<sc-for[\s\S]*?<\/sc-for>/, () => '      ' + paras)
    .split('{{ article.category }}').join(escapeText(post.category))
    .split('{{ article.title }}').join(escapeText(post.title))
    .split('{{ article.dek }}').join(escapeText(post.dek));
}

const BUILT = PAGES.filter((p) => !HIDDEN_PAGES.includes(p.key));

// Remove any page that has since been hidden. Without this the last build's
// file stays on disk, gets committed, and Netlify keeps serving it — unlinked
// and out of the sitemap, but still public.
for (const meta of PAGES.filter((p) => HIDDEN_PAGES.includes(p.key))) {
  const stale = path.join(ROOT, meta.file);
  if (fs.existsSync(stale)) {
    fs.unlinkSync(stale);
    console.log(`removed ${meta.file} (hidden)`);
  }
}

// Article pages the design no longer has. A renamed or deleted post would
// otherwise keep its old file on disk — unlinked and out of the sitemap, but
// still served.
const blogDir = path.join(ROOT, 'blog');
if (fs.existsSync(blogDir)) {
  const wanted = new Set(POSTS.map((p) => path.basename(p.url)));
  for (const name of fs.readdirSync(blogDir)) {
    if (name.endsWith('.html') && !wanted.has(name)) {
      fs.unlinkSync(path.join(blogDir, name));
      console.log(`removed blog/${name} (no longer in the design)`);
    }
  }
}

/**
 * The anchor the design wraps the booking email in, borrowed as a template.
 *
 * The Speaking page's booking sentence has the address inside a styled link.
 * Ricky edits that sentence as plain prose — the address comes from Site
 * Settings, so it is written once — which means the build has to put the link
 * back. Lifting the anchor from the design rather than writing one here keeps
 * its styling wherever the design takes it.
 */
const EMAIL_ANCHOR = (() => {
  // Read it out of the booking sentence itself, not out of the page. The
  // Speaking hero's "Book Ricky" button is also a mailto: link and comes first,
  // so searching the whole block borrows a 38px-tall uppercase button and drops
  // it into the middle of a paragraph.
  const binding = (TEXT.speakingPage || []).find((b) => b.html);
  if (!binding) return null;
  const sentence = dc.get(extractBlock('isSpeaking'), binding.path);
  const m = /<a\b[\s\S]*?<\/a>/.exec(sentence);
  return m ? m[0] : null;
})();

// Transform every page first. This populates `hoverRules`, which the stylesheet
// is built from — and the stylesheet has to exist before any page can be
// written, because its filename carries a content hash that goes in the <head>.
const rendered = BUILT.map((meta) => {
  let block = extractBlock(meta.flag);

  // The blog index is the one page whose *shape* comes from content rather than
  // from the design: three cards and two lists today, however many Ricky has
  // tomorrow. Rebuilt from the design's own markup, so it still looks exactly
  // as drawn — see tools/blog-index.js.
  if (meta.key === 'blog' && CONTENT.fromSanity) {
    block = renderBlogIndex(block, CONTENT, (post) => post.url);
  }

  // The press links, in both places they appear. Same rule as the blog index:
  // the design draws one row and one card, Sanity says how many there are and
  // where they point. With nothing in Sanity the design's own links ship, which
  // is what keeps the file previewable in Claude Design.
  if (NEWS.length) {
    if (meta.key === 'news') block = renderNewsRows(block, NEWS);
    if (meta.key === 'home') block = renderPressCards(block, NEWS);
  }

  // Photographs Ricky owns. Applied to the design's markup before transform(),
  // so the Sanity URL is already absolute when the assets/ -> /assets/ rewrite
  // runs and is left alone by it. A photograph missing from Sanity leaves the
  // design's own file in place rather than blanking the image, which is what
  // lets this ship page by page.
  const type = PAGE_TYPES[meta.flag];
  const pageDoc = CONTENT.pages && CONTENT.pages[type];
  if (pageDoc && PHOTOS[type]) {
    const { html, applied } = applyPhotos(block, PHOTOS[type], pageDoc, dc);
    block = html;
    photoCount += applied.length;
  }

  // The words. Same rule as the photographs: each binding is independent and
  // skipped when its field is empty, so a page Sanity has nothing to say about
  // renders the design's own copy rather than a blank heading.
  if (pageDoc && TEXT[type]) {
    const { html, applied } = applyText(block, TEXT[type], pageDoc, dc, {
      email: CONTENT.siteSettings && CONTENT.siteSettings.email,
      emailAnchor: EMAIL_ANCHOR,
    });
    block = html;
    textCount += applied.length;
  }

  // The share image follows the header photograph, rather than being a second
  // filename to remember. Without this, changing a page's header in the Studio
  // leaves every link to it on Facebook and iMessage showing the old picture —
  // the kind of wrong that nobody sees until a client does.
  //
  // Sanity crops to Open Graph's 1.91:1 around the hotspot Ricky set, which is
  // the one place a server-side crop is safe: the ratio is fixed and known.
  const heroImage = readField(pageDoc || {}, 'hero.image');
  const shareMeta = heroImage
    ? { ...meta, image: coverUrl(heroImage, { width: 600, height: 315 }) }
    : meta;

  return { meta: shareMeta, content: transform(block) };
});

// One page per article, under blog/. Each takes its dek as the meta
// description and, where the index gave it a card, that card's photograph.
for (const post of POSTS) {
  rendered.push({
    meta: {
      key: `post:${post.slug}`,
      file: post.url.slice(1), // "/blog/x.html" -> "blog/x.html"
      title: post.title,
      description: post.dek,
      // An article's own card photograph is the better share image. Sanity
      // serves it already cropped to the 1.91:1 that Open Graph wants.
      image: post.cover
        ? coverUrl(post.cover, { width: 600, height: 315 })
        : 'assets/blog-header-sm.jpg',
    },
    content: transform(renderPost(post)),
  });
}

// A 404 in the site's own clothes, using the same hero treatment as the
// interior pages so a mistyped URL still looks like the site.
const notFound = `    <section style="position:relative; background:#0C234B; color:#fff; overflow:hidden; min-height:520px; box-sizing:border-box; display:flex; align-items:center">
      <img src="/assets/hunley-ricky-3.jpg" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:58% 44%; filter:grayscale(1) contrast(1.1) brightness(1.02); mix-blend-mode:screen; opacity:0.55" />
      <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(12,35,75,.55) 0%, rgba(12,35,75,.72) 60%, rgba(12,35,75,.94) 100%)"></div>
      <div style="position:relative; width:100%; max-width:1280px; margin:0 auto; padding:72px 40px">
        <div style="font-family:Archivo, sans-serif; font-size:11.5px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:#93A0B6">Error 404</div>
        <h1 style="margin:24px 0 0; font-family:Archivo, sans-serif; font-weight:800; font-size:clamp(42px, 5.4vw, 78px); line-height:0.98; letter-spacing:-0.035em; color:#fff">Page not found</h1>
        <p style="margin:28px 0 0; font-size:20px; line-height:1.65; color:#C6CCD8; max-width:56ch">That page has moved or never existed. The rest of the site is still where you left it.</p>
        <div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:38px">
          <a href="/" style="font-family:Archivo, sans-serif; font-size:13px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#0C234B; background:#fff; padding:18px 30px" class="hv-2">Back to the home page</a>
          <a href="/contact.html" style="font-family:Archivo, sans-serif; font-size:13px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#fff; border:1px solid rgba(255,255,255,.45); padding:18px 30px" class="hv-5">Get in touch</a>
        </div>
      </div>
    </section>`;

rendered.push({
  meta: {
    key: '404',
    file: '404.html',
    title: 'Page not found',
    description: 'That page has moved or never existed.',
    image: 'assets/hero-asu.jpg',
    noIndex: true,
  },
  content: notFound,
});

// Every hidden page's promo section has to have actually been found. Hiding a
// page is a two-part edit — the nav links go, and so does the block on another
// page that advertises it — and only the first half announces itself. If the
// design is restructured so the home page's press row is no longer a <section>,
// this stops the build rather than shipping a row of dead links under a heading.
for (const key of HIDDEN_PAGES) {
  const found = droppedSections.get(key) || 0;
  const expected = PROMO_SECTIONS[key];
  if (expected === undefined) continue;
  if (found !== expected) {
    console.error(
      `hidden page "${key}": expected to drop ${expected} promo section(s), dropped ${found}.\n` +
        'The design has moved; find what now promotes the page and update PROMO_SECTIONS.'
    );
    process.exit(1);
  }
}

// sitemap.xml — the real pages and every article, 404 excluded.
const sitemapUrls = [
  ...BUILT.map((p) =>
    p.key === 'home' ? `${SITE_URL}/` : `${SITE_URL}/${p.file}`
  ),
  ...POSTS.map((p) => `${SITE_URL}${p.url}`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

// ---------------------------------------------------------------------------
// 4. Emit the stylesheet: the design's own <helmet> rules plus the hover rules
//    lifted out of style-hover.
// ---------------------------------------------------------------------------

const helmetMatch = src.match(/<helmet>[\s\S]*?<style>([\s\S]*?)<\/style>/);
const rawHelmetCss = helmetMatch ? helmetMatch[1].trim() : '';

/**
 * The design's responsive rules target inline styles by substring, e.g.
 * `[style*="margin: 0px auto"]`. That spelling is what the *browser* produces
 * when it re-serialises a style attribute, which is what the Design Component
 * runtime ends up with. Static HTML keeps the author's literal spelling —
 * `margin:0 auto` — so those selectors would match nothing here and the whole
 * mobile layout would silently do nothing.
 *
 * Rewriting the selectors to the authored spelling is the fix. `\b0px\b` is
 * deliberate: a blunt "0px" -> "0" would corrupt `130px` into `13 0`.
 */
const helmetCss = rawHelmetCss.replace(
  /\[style\*="([^"]+)"\]/g,
  (_, value) =>
    `[style*="${value.replace(/:\s+/g, ':').replace(/\b0px\b/g, '0')}"]`
);

/**
 * Every declaration is forced with `!important`, and it has to be.
 *
 * The design styles everything inline, and an inline style beats a class
 * selector no matter what — `:hover` does not change specificity. So
 * `.hv-1:hover { color: … }` loses to the element's own `style="…color:#2A2F3A"`
 * and the hover silently does nothing. The Design Component runtime does not
 * hit this because `style-hover` swaps the inline style itself.
 *
 * These rules only ever fire on :hover, so the bluntness costs nothing.
 */
const hoverCss = [...hoverRules.entries()]
  .map(([css, cls]) => {
    const decls = css
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => (/!important$/.test(d) ? `${d};` : `${d} !important;`))
      .join(' ');
    return `.${cls}:hover { ${decls} }`;
  })
  .join('\n');

const css = `/* Generated by tools/build-static.js — edit the design source, not this file. */

${helmetCss}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 100;
  background: #0C234B;
  color: #fff;
  font-family: Archivo, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 16px 24px;
}
.skip-link:focus { left: 0; color: #fff; }

:focus-visible { outline: 2px solid #AB0520; outline-offset: 3px; }

/* The photo columns on the About and Speaking pages crossfade with a CSS
   animation the design declares in its <helmet>. Nothing there honours a
   reduced-motion preference, and the animation runs forever, so it is stopped
   here — on its first frame, which is what the column would show anyway. */
@media (prefers-reduced-motion: reduce) {
  [style*="animation:rhFade"] { animation: none !important; }
  [style*="animation:rhFade"]:first-of-type { opacity: 0.94 !important; }
}

/* Hover states, lifted from the design's style-hover attributes. */
${hoverCss}

/* The mobile menu's drawer and icons carry inline display values, which beat
   the [hidden] rule in the user-agent stylesheet. This puts it back. */
[hidden] { display: none !important; }
`;

// ---------------------------------------------------------------------------
// 5. Write the stylesheet and script under content-hashed names, then the
//    pages that point at them.
//
// The hash is the whole point. Without it, `css/site.css` is one URL forever,
// and a browser that cached it under a long max-age keeps serving that copy
// until the age expires — no request, no revalidation, nothing the server can
// say. That is not hypothetical: the stylesheet went out once with a week-long
// max-age, and phones that fetched it in that window kept rendering the site
// without its mobile layout, days after the fix was live.
//
// A hashed filename makes new content a new URL, so a stale cache entry simply
// cannot be matched against it — and it makes a year of `immutable` correct
// rather than reckless, because the name changes whenever the bytes do.
// ---------------------------------------------------------------------------

const hashOf = (text) =>
  crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);

/** Write `dir/name.<hash>.ext`, clear out earlier hashes, return the URL. */
function writeHashed(dir, base, ext, contents) {
  const outDir = path.join(ROOT, dir);
  fs.mkdirSync(outDir, { recursive: true });

  for (const stale of fs.readdirSync(outDir)) {
    if (new RegExp(`^${base}\\.[0-9a-f]{8}\\.${ext}$`).test(stale)) {
      fs.unlinkSync(path.join(outDir, stale));
    }
  }

  const name = `${base}.${hashOf(contents)}.${ext}`;
  fs.writeFileSync(path.join(outDir, name), contents, 'utf8');
  return `/${dir}/${name}`;
}

cssUrl = writeHashed('css', 'site', 'css', css);

const jsSource = fs.readFileSync(path.join(__dirname, 'site.js'), 'utf8');
jsUrl = writeHashed('js', 'site', 'js', jsSource);

for (const { meta, content } of rendered) {
  const dest = path.join(ROOT, meta.file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, page(meta, content), 'utf8');
}

console.log(
  `wrote ${rendered.length} pages (${POSTS.length} articles), ` +
    `${textCount} fields and ${photoCount} photographs from Sanity, ` +
    `${cssUrl} (${hoverRules.size} hover rules), ${jsUrl}`
);

// ---------------------------------------------------------------------------
// Build provenance.
//
// Every other output of this build is deterministic: the same content produces
// byte-identical pages, which is what makes `git diff` after a rebuild mean
// something. It also makes a deploy impossible to verify from the outside —
// a successful build and a failed one that left the previous deploy in place
// serve exactly the same bytes.
//
// So the build states, once, when it ran and what it built from. Ricky presses
// Publish, and this file answers "did that actually reach the site?" without a
// Netlify login and without editing content to see whether the edit lands.
//
// The Netlify fields are absent in a local build, which is the tell that a page
// was built on someone's machine rather than by a deploy.
// ---------------------------------------------------------------------------

fs.writeFileSync(
  path.join(ROOT, 'build-info.json'),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      contentFetchedAt: CONTENT.fetchedAt || null,
      contentSource: CONTENT.fromSanity ? CONTENT.source || 'sanity' : 'design fallback',
      posts: POSTS.length,
      pages: rendered.length,
      commit: process.env.COMMIT_REF || null,
      deployId: process.env.DEPLOY_ID || null,
      context: process.env.CONTEXT || null,
    },
    null,
    2
  ) + '\n',
  'utf8'
);
