#!/usr/bin/env node
/**
 * Structural check on the generated pages. Not a spec-complete validator — it
 * catches the things the conversion could plausibly get wrong: unbalanced tags,
 * missing landmarks, leftover Design Component syntax, dead links and dead
 * asset references.
 *
 *   node tools/check.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let failures = 0;

function fail(file, msg) {
  console.log(`  FAIL ${file}: ${msg}`);
  failures++;
}

for (const file of pages) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');

  // --- tag balance -------------------------------------------------------
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const [, closing, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    if (name === '!doctype' || VOID.has(name) || attrs.trimEnd().endsWith('/')) {
      continue;
    }
    if (closing) {
      const open = stack.pop();
      if (open !== name) {
        fail(file, `</${name}> closes <${open || 'nothing'}>`);
        break;
      }
    } else {
      stack.push(name);
    }
  }
  if (stack.length) fail(file, `unclosed: ${stack.join(', ')}`);

  // --- landmarks and headings -------------------------------------------
  for (const tag of ['header', 'main', 'footer', 'title']) {
    if (!new RegExp(`<${tag}[\\s>]`).test(html)) fail(file, `no <${tag}>`);
  }
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(file, `${h1s} <h1> elements (want exactly 1)`);

  if (!/<meta name="description" content="[^"]+"/.test(html)) {
    fail(file, 'no meta description');
  }

  // --- no Design Component syntax should survive -------------------------
  for (const leftover of ['sc-if', '{{', 'style-hover', 'onClick', 'x-dc', 'hint-placeholder']) {
    if (html.includes(leftover)) fail(file, `leftover DC syntax: ${leftover}`);
  }

  // --- images need alt text ---------------------------------------------
  for (const img of html.match(/<img\b[^>]*>/g) || []) {
    if (!/\balt=/.test(img)) fail(file, `<img> with no alt: ${img.slice(0, 70)}`);
  }

  // --- referenced files must exist --------------------------------------
  const refs = [
    ...(html.match(/(?:src|href)="((?:assets|uploads|css|js)\/[^"]+)"/g) || []),
    ...(html.match(/(?:src|href)="(\/(?:assets|uploads|css|js)\/[^"]+)"/g) || []),
  ].map((s) => s.replace(/^(?:src|href)="/, '').replace(/"$/, ''));

  // CSS mask/background urls inside inline styles. The header and footer logos
  // are drawn this way, and a missing file there shows as nothing at all rather
  // than a broken-image icon — so it needs checking as much as any <img>.
  for (const m of html.match(/(?:-webkit-)?(?:mask|background-image)\s*:\s*url\(([^)]+)\)/g) || []) {
    const url = m.replace(/.*url\(/, '').replace(/\)$/, '').replace(/^['"]|['"]$/g, '');
    if (/^(data:|https?:)/.test(url)) continue;
    refs.push(url);
  }

  for (const ref of new Set(refs)) {
    const rel = ref.startsWith('/') ? ref.slice(1) : ref;
    if (!fs.existsSync(path.join(ROOT, rel))) fail(file, `missing file: ${ref}`);
  }

  // --- internal page links must exist -----------------------------------
  for (const link of html.match(/href="\/[a-z0-9-]*\.html"/g) || []) {
    const target = link.slice(7, -1).replace(/^\//, '');
    if (!fs.existsSync(path.join(ROOT, target))) fail(file, `dead link: ${target}`);
  }
}

// --- hover classes referenced in HTML must exist in the stylesheet --------
const css = fs.readFileSync(path.join(ROOT, 'css', 'site.css'), 'utf8');
const used = new Set();
for (const file of pages) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const c of html.match(/class="(hv-\d+)"/g) || []) {
    used.add(c.slice(7, -1));
  }
}
for (const cls of used) {
  const rule = css.match(new RegExp(`\\.${cls}:hover \\{([^}]*)\\}`));
  if (!rule) {
    fail('css/site.css', `no rule for .${cls}`);
    continue;
  }
  // Every declaration must be !important. The design styles everything inline,
  // and an inline style beats a class selector regardless of :hover — so a
  // hover rule without !important silently does nothing at all. This is not a
  // style preference; it is the difference between working and not.
  for (const decl of rule[1].split(';').map((d) => d.trim()).filter(Boolean)) {
    if (!/!important$/.test(decl)) {
      fail('css/site.css', `.${cls}:hover — "${decl}" is not !important, so the inline style wins`);
    }
  }
}

console.log(
  `\nchecked ${pages.length} pages, ${used.size} hover classes — ${
    failures ? `${failures} failure(s)` : 'all clear'
  }`
);
process.exitCode = failures ? 1 : 0;
