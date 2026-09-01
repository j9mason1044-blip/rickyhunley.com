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

const ROOT = path.join(__dirname, '..');
const SRC = path.join(__dirname, 'RickyHunley.com.dc.html');

// Prop defaults, read off the `data-props` block and renderVals() in the source.
const ACCENT = '#AB0520';
const REEL_URL = 'https://www.youtube.com/watch?v=RK45X4F-g9o';
const HAS_HERO_VIDEO = false; // heroVideoId defaults to '' -> the iframe branch is dead
const SHOW_FOUNDATION = true;

const SITE_URL = 'https://rickyhunley.com';

/**
 * Three of the design's photographs were saved as PNG. As PNG they are several
 * megabytes each; as JPEG they are a couple of hundred KB with no visible
 * difference (none of them has an alpha channel). tools/build-assets.js writes
 * them out as .jpg, so the references have to follow.
 */
const ASSET_RENAMES = {
  'assets/speaking-glendale.png': 'assets/speaking-glendale.jpg',
  'assets/huddle-prescott.png': 'assets/huddle-prescott.jpg',
  'assets/contact-nogales.png': 'assets/contact-nogales.jpg',
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
    image: 'assets/speaking-2.jpg',
  },
  {
    key: 'huddle',
    file: 'huddle.html',
    flag: 'isHuddle',
    title: 'The Hunley Huddle',
    description:
      'The radio show, live events and podcast where football, brotherhood and community converge.',
    image: 'assets/huddle-prescott.jpg',
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
    image: 'assets/headshot.jpg',
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

  // Page-state navigation -> real links. The href is always "#" in the source.
  out = out.replace(
    /href="#"\s+onClick="\{\{ nav\.(\w+) \}\}"/g,
    (_, key) => {
      const href = HREF_FOR[key];
      if (!href) throw new Error(`unknown nav target: ${key}`);
      return `href="${href}"`;
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

  // Photographs re-encoded from PNG to JPEG by tools/build-assets.js.
  for (const [from, to] of Object.entries(ASSET_RENAMES)) {
    out = out.split(from).join(to);
  }

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

  return out;
}

// ---------------------------------------------------------------------------
// 3. Emit the pages.
// ---------------------------------------------------------------------------

const headerHtml = transform(header);
const footerHtml = transform(footer);

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
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
<script src="/js/site.js" defer></script>
</body>
</html>
`;
}

for (const meta of PAGES) {
  const content = transform(extractBlock(meta.flag));
  fs.writeFileSync(path.join(ROOT, meta.file), page(meta, content), 'utf8');
}

// A 404 in the site's own clothes, using the same hero treatment as the
// interior pages so a mistyped URL still looks like the site.
const notFound = `    <section style="position:relative; background:#0C234B; color:#fff; overflow:hidden; min-height:520px; box-sizing:border-box; display:flex; align-items:center">
      <img src="assets/hunley-ricky-3.jpg" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:58% 44%; filter:grayscale(1) contrast(1.1) brightness(1.02); mix-blend-mode:screen; opacity:0.55" />
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

fs.writeFileSync(
  path.join(ROOT, '404.html'),
  page(
    {
      key: '404',
      file: '404.html',
      title: 'Page not found',
      description: 'That page has moved or never existed.',
      image: 'assets/hero-asu.jpg',
      noIndex: true,
    },
    notFound
  ),
  'utf8'
);

// sitemap.xml — the eight real pages, 404 excluded.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (p) =>
    `  <url><loc>${
      p.key === 'home' ? `${SITE_URL}/` : `${SITE_URL}/${p.file}`
    }</loc></url>`
).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

// ---------------------------------------------------------------------------
// 4. Emit the stylesheet: the design's own <helmet> rules plus the hover rules
//    lifted out of style-hover.
// ---------------------------------------------------------------------------

const helmetMatch = src.match(/<helmet>[\s\S]*?<style>([\s\S]*?)<\/style>/);
const helmetCss = helmetMatch ? helmetMatch[1].trim() : '';

const hoverCss = [...hoverRules.entries()]
  .map(([css, cls]) => {
    const decls = css
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => `${d};`)
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

/* Hover states, lifted from the design's style-hover attributes. */
${hoverCss}

/* The design is authored at desktop width; these keep it usable below 900px
   without changing any desktop value. */
@media (max-width: 900px) {
  main section > div[style*="grid-template-columns"],
  main section[style*="grid-template-columns"],
  footer > div[style*="grid-template-columns"] {
    grid-template-columns: 1fr !important;
    gap: 48px !important;
  }
  main section[style*="padding:130px"],
  main section > div[style*="padding:110px"],
  main section > div[style*="padding:130px"] {
    padding-left: 24px !important;
    padding-right: 24px !important;
  }
  header > div,
  footer > div { padding-left: 24px !important; padding-right: 24px !important; }
}
`;

fs.mkdirSync(path.join(ROOT, 'css'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'css', 'site.css'), css, 'utf8');

console.log(
  `wrote ${PAGES.length} pages + css/site.css (${hoverRules.size} hover rules)`
);
