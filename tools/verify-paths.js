#!/usr/bin/env node
/**
 * Proves the guarantee dc-paths.js owes: writing back exactly what was read
 * changes nothing.
 *
 * The page migration rests entirely on this. If `set(html, p, get(html, p))`
 * is not byte-identical for every addressable node, then somewhere the seeder
 * reads one element and the build writes another, and the failure is silent —
 * copy vanishes from a page and the build still reports success.
 *
 * So this runs over every node on every page rather than a sample, and it is
 * cheap enough to run on every build.
 *
 *   node tools/verify-paths.js
 */

const fs = require('fs');
const path = require('path');
const dc = require('./dc-paths');

const SRC = path.join(__dirname, 'RickyHunley.com.dc.html');
const PAGE_FLAGS = [
  'isHome',
  'isAbout',
  'isSpeaking',
  'isHuddle',
  'isNews',
  'isBlog',
  'isCommunity',
  'isContact',
];

const src = fs.readFileSync(SRC, 'utf8');
const body = src.slice(
  src.indexOf('<div style="--accent:'),
  src.indexOf('</x-dc>')
);

/** The contents of a top-level `<sc-if value="{{ flag }}">`, nesting-aware. */
function block(flag) {
  const open = `<sc-if value="{{ ${flag} }}"`;
  const start = body.indexOf(open);
  if (start === -1) throw new Error(`no sc-if block for ${flag}`);
  const afterTag = body.indexOf('>', start) + 1;
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

let checked = 0;
let failures = 0;
const perPage = [];

for (const flag of PAGE_FLAGS) {
  const html = block(flag);

  // Splitting and rejoining must itself be lossless, or every path below is
  // being tested against a page that already lost bytes.
  const rejoined = dc.joinSections(dc.splitSections(html));
  if (rejoined !== html) {
    console.error(`  ${flag}: split/join is LOSSY (${html.length} -> ${rejoined.length})`);
    failures++;
  }

  const nodes = dc.enumerate(html);
  let textNodes = 0;
  let imgNodes = 0;

  for (const node of nodes) {
    if (node.tag === 'img') {
      imgNodes++;
      // Rewriting an attribute to its own value must not disturb the tag.
      const src0 = dc.getAttr(html, node.path, 'src');
      const after = dc.setAttrs(html, node.path, { src: src0 });
      checked++;
      if (after !== html) {
        console.error(`  ${flag} ${node.path}: setAttrs(src) is not identity`);
        failures++;
      }
      continue;
    }

    textNodes++;
    const after = dc.set(html, node.path, dc.get(html, node.path));
    checked++;
    if (after !== html) {
      console.error(`  ${flag} ${node.path}: set(get()) is not identity`);
      failures++;
    }
  }

  perPage.push(`${flag}: ${textNodes} text + ${imgNodes} img`);
}

console.log(perPage.map((l) => '  ' + l).join('\n'));
console.log(
  failures === 0
    ? `\nround-trip identity holds for all ${checked} addressable nodes`
    : `\n${failures} FAILURES across ${checked} nodes`
);
process.exit(failures === 0 ? 0 : 1);
