#!/usr/bin/env node
/**
 * Seeds the page singletons with the photographs the design currently shows.
 *
 * One-shot, and safe to re-run: uploads are content-addressed by Sanity, so a
 * second run reuses the same assets rather than duplicating them, and the
 * document patches are idempotent. What it will not do is overwrite a
 * photograph Ricky has already changed — see `--force`.
 *
 *   node studio/scripts/migrate-photos.js --dry-run
 *   node studio/scripts/migrate-photos.js
 *
 * Where the files come from, in order of preference:
 *
 *   1. The full-resolution Dropbox original, via the mapping in
 *      tools/build-assets.js. This is the right source. Sanity crops and
 *      resizes on delivery, so it should hold the largest file available —
 *      a hotspot set on a 900px copy has nothing to work with, which is the
 *      same reason the blog covers were uploaded from masters.
 *   2. The file in assets/, for the two photographs with no reachable
 *      original: `ua-1983.jpg`, which came from the design project, and
 *      `denver.jpg`, which build-assets.js lists as UNRESOLVED because the
 *      file in assets/ is the *wrong photograph* — an older Denver picture,
 *      not the Hula Bowl frame its alt text describes. Uploading it is not an
 *      endorsement: it puts the wrong image somewhere Ricky can replace it
 *      himself, which is better than it being wrong in a file only a developer
 *      can reach.
 *
 * Alt text and framing come from the design, not from a person retyping them:
 * the alt attribute as written, and the hand-tuned `object-position` converted
 * to a Sanity hotspot. Thirteen photographs carry one, and they are the
 * difference between Ricky's head being in frame and not.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// The studio package is ESM; tools/ is CommonJS, because build-static.js runs
// on Netlify with no package.json and no install step. This bridges the two
// rather than forking the maps into a second copy.
const require = createRequire(import.meta.url)
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const dc = require(path.join(ROOT, 'tools', 'dc-paths.js'))
const { PHOTOS, PAGE_TYPES, hotspotFrom } = require(
  path.join(ROOT, 'tools', 'page-photos.js')
)

const PROJECT_ID = '0m77etlx';
const DATASET = 'production';
const API = `https://${PROJECT_ID}.api.sanity.io`;

const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

/**
 * The CLI's own credentials. This is a developer-run migration, not part of the
 * site build — the build reads the public dataset and needs no token at all.
 */
function readToken() {
  const cfg = path.join(os.homedir(), '.config', 'sanity', 'config.json');
  const token = JSON.parse(fs.readFileSync(cfg, 'utf8')).authToken;
  if (!token) throw new Error(`no authToken in ${cfg} — run \`sanity login\``);
  return token;
}

const TOKEN = DRY ? null : readToken();
const auth = () => ({ Authorization: `Bearer ${TOKEN}` });

// --- the design, carved into pages -----------------------------------------

const src = fs.readFileSync(
  path.join(ROOT, 'tools', 'RickyHunley.com.dc.html'),
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

// --- where each photograph's largest available file lives -------------------

/**
 * Parsed out of build-assets.js rather than duplicated. That file is the
 * mapping's home — it was built by matching EXIF and pixel dimensions, is not
 * guessable, and is maintained when new photography arrives. A second copy here
 * would be a second thing to forget.
 */
function originals() {
  const text = fs.readFileSync(
    path.join(ROOT, 'tools', 'build-assets.js'),
    'utf8'
  );
  const map = {};
  const re = /\{\s*out:\s*'([^']+)',\s*src:\s*`([^`]+)`/g;
  let m;
  while ((m = re.exec(text))) {
    map[m[1]] = m[2]
      .replace(/\$\{PHOTOS\}/g, `${WORKING}/Ricky Hunley Photos`)
      .replace(/\$\{WORKING\}/g, WORKING);
  }
  return map;
}
const WORKING =
  'D:/Dropbox/J9 Brandworks Projects/Ricky Hunley/Ricky Hunley Working';
const ORIGINALS = originals();

function sourceFor(asset) {
  const original = ORIGINALS[asset];
  if (original && fs.existsSync(original)) {
    return { file: original, provenance: 'Dropbox master' };
  }
  const local = path.join(ROOT, 'assets', asset);
  if (fs.existsSync(local)) {
    return {
      file: local,
      provenance: original ? 'assets/ (master missing)' : 'assets/ (no master)',
    };
  }
  throw new Error(`no file found for ${asset}`);
}

// --- upload -----------------------------------------------------------------

const uploaded = new Map(); // asset filename -> Sanity asset _id

async function uploadAsset(asset) {
  if (uploaded.has(asset)) return uploaded.get(asset);

  const { file, provenance } = sourceFor(asset);
  const bytes = fs.readFileSync(file);
  const ext = path.extname(file).slice(1).toLowerCase();
  const type =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  if (DRY) {
    console.log(
      `  would upload ${asset.padEnd(24)} ${(bytes.length / 1048576).toFixed(2)} MB  <- ${provenance}`
    );
    uploaded.set(asset, `image-DRYRUN-${asset}`);
    return uploaded.get(asset);
  }

  // `filename` is what the Studio shows in the media library, so it is the
  // asset name a person would recognise, not the Dropbox original's.
  const res = await fetch(
    `${API}/v2021-06-07/assets/images/${DATASET}?filename=${encodeURIComponent(asset)}`,
    { method: 'POST', headers: { ...auth(), 'Content-Type': type }, body: bytes }
  );
  if (!res.ok) {
    throw new Error(`upload ${asset} failed: ${res.status} ${await res.text()}`);
  }
  const { document } = await res.json();
  console.log(
    `  uploaded ${asset.padEnd(24)} ${(bytes.length / 1048576).toFixed(2)} MB  ` +
      `${document.metadata.dimensions.width}x${document.metadata.dimensions.height}  <- ${provenance}`
  );
  uploaded.set(asset, document._id);
  return document._id;
}

// --- build the documents ----------------------------------------------------

/** Set `a.b[2].c` on a plain object, creating the shape as it goes. */
function assign(target, field, value) {
  const parts = field.split('.');
  let node = target;
  parts.forEach((part, i) => {
    const m = /^(\w+)\[(\d+)\]$/.exec(part);
    const last = i === parts.length - 1;
    const key = m ? m[1] : part;
    if (m) {
      node[key] = node[key] || [];
      const idx = Number(m[2]);
      if (last) node[key][idx] = value;
      else node[key][idx] = node[key][idx] || {};
      node = node[key][idx];
    } else {
      if (last) node[key] = value;
      else node[key] = node[key] || {};
      node = node[key];
    }
  });
}

async function buildDoc(flag, type) {
  const bindings = PHOTOS[type];
  if (!bindings.length) return null;

  const html = block(flag);
  const doc = { _id: type, _type: type };

  for (const b of bindings) {
    const alt = dc.getAttr(html, b.path, 'alt');
    const style = dc.getAttr(html, b.path, 'style') || '';
    const objectPosition = (style.match(/object-position:([^;]*)/) || [])[1];
    const assetId = await uploadAsset(b.asset);

    const image = {
      _type: 'image',
      asset: { _type: 'reference', _ref: assetId },
      hotspot: { _type: 'sanity.imageHotspot', ...hotspotFrom(objectPosition) },
      crop: { _type: 'sanity.imageCrop', top: 0, bottom: 0, left: 0, right: 0 },
      alt,
    };
    // Array members need a stable key or the Studio re-orders them on edit.
    if (b.field.includes('[')) image._key = b.field.replace(/[.[\]]/g, '_');

    assign(doc, b.field, image);
  }
  return doc;
}

// --- write ------------------------------------------------------------------

async function existing(ids) {
  const q = encodeURIComponent(`*[_id in $ids]{_id}`);
  const p = encodeURIComponent(JSON.stringify(ids));
  const res = await fetch(
    `${API}/v2021-06-07/data/query/${DATASET}?query=${q}&$ids=${p}`,
    { headers: auth() }
  );
  const { result } = await res.json();
  return new Set((result || []).map((d) => d._id));
}

(async () => {
  console.log(
    DRY ? 'DRY RUN — nothing will be uploaded or written\n' : 'Seeding page photographs\n'
  );

  const docs = [];
  for (const [flag, type] of Object.entries(PAGE_TYPES)) {
    const doc = await buildDoc(flag, type);
    if (doc) docs.push(doc);
  }

  const count = docs.reduce((n, d) => n + PHOTOS[d._type].length, 0);
  console.log(
    `\n${docs.length} page documents, ${count} photographs, ` +
      `${uploaded.size} distinct files\n`
  );

  if (DRY) {
    docs.forEach((d) =>
      console.log(`  ${d._id}: ${PHOTOS[d._type].map((b) => b.field).join(', ')}`)
    );
    return;
  }

  const present = await existing(docs.map((d) => d._id));
  const mutations = docs.map((doc) => {
    if (present.has(doc._id) && !FORCE) {
      // The document already exists — someone has been in the Studio. Fill in
      // only what is absent rather than overwriting an edit; `setIfMissing`
      // on the whole document body would be too coarse, so patch per field.
      const { _id, _type, ...fields } = doc;
      return { patch: { id: _id, setIfMissing: fields } };
    }
    return { createOrReplace: doc };
  });

  const res = await fetch(
    `${API}/v2021-06-07/data/mutate/${DATASET}?returnIds=true`,
    {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations }),
    }
  );
  const out = await res.text();
  if (!res.ok) throw new Error(`mutate failed: ${res.status} ${out}`);

  const skipped = docs.filter((d) => present.has(d._id) && !FORCE);
  console.log(`written. ${docs.length - skipped.length} created, ${skipped.length} patched (existing fields kept).`);
  if (skipped.length && !FORCE) {
    console.log('Re-run with --force to overwrite photographs already in Sanity.');
  }
})().catch((e) => {
  console.error('\n' + e.message);
  process.exit(1);
});
