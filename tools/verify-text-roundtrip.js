#!/usr/bin/env node
/**
 * The test the page-text migration rests on.
 *
 * Lift every bound string out of the design exactly as the seeder does, build
 * the page documents from it, render them back through applyText(), and require
 * the result to be byte-identical to the design.
 *
 * If that holds, then seeding Sanity from the design and building the site from
 * Sanity cannot change a word — which is the only claim worth making about a
 * migration of copy that exists nowhere else. If it does not hold, the diff
 * says exactly which binding lost something.
 *
 *   node tools/verify-text-roundtrip.js
 */

const fs = require('fs');
const path = require('path');
const dc = require('./dc-paths');
const { TEXT, toField, applyText } = require('./page-text');
const { PAGE_TYPES } = require('./page-photos');
const { extractPageText, EMAIL_ANCHOR_PATH } = require('./extract-page-text');

const src = fs.readFileSync(
  path.join(__dirname, 'RickyHunley.com.dc.html'),
  'utf8'
);
const body = src.slice(
  src.indexOf('<div style="--accent:'),
  src.indexOf('</x-dc>')
);

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

/** Where the first difference is, in terms a person can act on. */
function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 70);
  return {
    at: i,
    before: JSON.stringify(a.slice(from, i + 90)),
    after: JSON.stringify(b.slice(from, i + 90)),
  };
}

let failures = 0;
let fields = 0;

for (const [flag, type] of Object.entries(PAGE_TYPES)) {
  const bindings = TEXT[type] || [];
  if (!bindings.length) continue;

  const html = block(flag);
  const { doc, email, emailAnchor } = extractPageText(html, type, dc);

  const { html: back, applied } = applyText(html, bindings, doc, dc, {
    email,
    emailAnchor,
  });
  fields += applied.length;

  if (back === html) {
    console.log(`  ${type.padEnd(14)} ${String(applied.length).padStart(3)} fields — identical`);
  } else {
    failures++;
    const d = firstDifference(html, back);
    console.error(`  ${type.padEnd(14)} DIFFERS at offset ${d.at}`);
    console.error(`    design: ${d.before}`);
    console.error(`    rebuilt: ${d.after}`);
  }
}

console.log(
  failures === 0
    ? `\n${fields} fields across ${Object.keys(TEXT).length} pages: seeding from the design and rendering back changes nothing.`
    : `\n${failures} PAGES DIFFER`
);
process.exit(failures === 0 ? 0 : 1);
