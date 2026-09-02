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

// Empty in the design, which falls back to '#'. A CTA linking to '#' is a dead
// button on a live site, so the whole link is dropped until there is a real URL.
const EVENTBRITE_URL = '';

/**
 * Pages built but not linked, or not built at all.
 *
 * Hiding a page means it is not generated, it is dropped from the sitemap, and
 * every navigation link to it is removed — header, mobile drawer and footer.
 * Hiding the blog also deletes the article pages under blog/.
 */
const HIDDEN_PAGES = SHOW_BLOG ? [] : ['blog'];

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

/** `stayCourse` -> `stay-course`. The design's slugs are camelCase; URLs are not. */
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * The blog's articles.
 *
 * In the design these are a single `posts = [...]` array on the component, and
 * the one `isPost` block is a template rendering whichever article
 * `state.post` names. Static HTML has no state, so the array is read out of
 * the source and the template is rendered once per article into
 * blog/<slug>.html.
 *
 * Reading the literal rather than restating it here is the point: the copy
 * keeps exactly one home, and an edit in the design lands on the next build.
 */
function readPosts() {
  const open = src.indexOf('  posts = [');
  if (open === -1) throw new Error('could not find the posts array');
  const close = src.indexOf("\n  ];", open);
  if (close === -1) throw new Error('unterminated posts array');
  const literal = src.slice(open + '  posts = '.length, close + 4);

  // eslint-disable-next-line no-eval -- an array literal out of a file we own.
  const posts = eval('(' + literal + ')');
  if (!Array.isArray(posts) || !posts.length) throw new Error('no posts parsed');
  return posts.map((p) => ({ ...p, url: `/blog/${kebab(p.slug)}.html` }));
}

const POSTS = SHOW_BLOG ? readPosts() : [];

/**
 * The three articles the index gives a photographic card to. A card's own
 * image is the better og:image for the article behind it, so it is reused
 * rather than defaulted to the page header.
 */
const POST_IMAGE = {
  leadership: 'assets/coaching-sm.jpg',
  mentorship: 'assets/community-sm.jpg',
  theGame: 'assets/practice-sm.jpg',
};

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
      const post = POSTS.find((p) => p.slug === slug);
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

/** Article copy is plain text in the design's data; here it becomes markup. */
const escapeText = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
<meta property="og:image" content="${SITE_URL}/${meta.image}">
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

  const body = variant('isBody');
  const sub = variant('isSub');
  const quote = variant('isQuote');

  const paras = post.body
    .map((text) => {
      const [tpl_, plain] =
        text.startsWith('## ') ? [sub, text.slice(3)]
        : text.startsWith('> ') ? [quote, text.slice(2)]
        : [body, text];
      return tpl_.split('{{ para.text }}').join(escapeText(plain));
    })
    .join("\n      ");

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

// Transform every page first. This populates `hoverRules`, which the stylesheet
// is built from — and the stylesheet has to exist before any page can be
// written, because its filename carries a content hash that goes in the <head>.
const rendered = BUILT.map((meta) => ({
  meta,
  content: transform(extractBlock(meta.flag)),
}));

// One page per article, under blog/. Each takes its dek as the meta
// description and, where the index gave it a card, that card's photograph.
for (const post of POSTS) {
  rendered.push({
    meta: {
      key: `post:${post.slug}`,
      file: post.url.slice(1), // "/blog/x.html" -> "blog/x.html"
      title: post.title,
      description: post.dek,
      image: POST_IMAGE[post.slug] || 'assets/blog-header-sm.jpg',
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
    `${cssUrl} (${hoverRules.size} hover rules), ${jsUrl}`
);
