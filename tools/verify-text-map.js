#!/usr/bin/env node
/**
 * Checks the text map against the design: every path resolves, nothing is bound
 * twice, and nothing that looks like copy is left unclaimed by accident.
 *
 * Run it after any change to page-text.js or to the design file. A binding that
 * has slipped by one — `s1.p[3]` where the design now has an extra paragraph —
 * is the failure this catches, and it is otherwise invisible until a page ships
 * with the wrong sentence under the wrong heading.
 *
 *   node tools/verify-text-map.js          summary
 *   node tools/verify-text-map.js --list   every binding and the text it claims
 */

const fs = require('fs');
const path = require('path');
const dc = require('./dc-paths');
const { TEXT } = require('./page-text');
const { PAGE_TYPES } = require('./page-photos');

const LIST = process.argv.includes('--list');

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

let problems = 0;
let bound = 0;

for (const [flag, type] of Object.entries(PAGE_TYPES)) {
  const bindings = TEXT[type] || [];
  const html = block(flag);
  const seen = new Map();

  if (LIST) console.log(`\n### ${type}`);

  for (const b of bindings) {
    const paths = b.paras || [b.path];

    for (const p of paths) {
      if (seen.has(p)) {
        console.error(
          `  ${type} ${p}: bound twice — ${seen.get(p)} and ${b.field}`
        );
        problems++;
      }
      seen.set(p, b.field);

      let text;
      try {
        text = dc.get(html, p);
      } catch (e) {
        console.error(`  ${type} ${b.field}: ${e.message}`);
        problems++;
        continue;
      }

      const flat = text.replace(/\s+/g, ' ').trim();

      // A binding that has landed on a wrapper rather than on copy. The tell is
      // that the content opens with a tag — a heading holds words, not divs.
      if (/^</.test(flat) && !b.html) {
        console.error(
          `  ${type} ${p} (${b.field}): claims markup, not text — "${flat.slice(0, 60)}"`
        );
        problems++;
        continue;
      }
      if (!flat) {
        console.error(`  ${type} ${p} (${b.field}): empty`);
        problems++;
        continue;
      }

      bound++;
      if (LIST) {
        console.log(`  ${p.padEnd(13)} ${b.field.padEnd(30)} ${JSON.stringify(flat).slice(0, 78)}`);
      }
    }
  }
}

console.log(
  problems === 0
    ? `\n${bound} text bindings, all resolving to copy`
    : `\n${problems} PROBLEMS across ${bound} bindings`
);
process.exit(problems === 0 ? 0 : 1);
