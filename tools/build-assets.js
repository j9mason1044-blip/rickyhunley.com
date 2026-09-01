#!/usr/bin/env node
/**
 * Generates the web-sized images in `assets/` from the full-resolution
 * originals in Dropbox.
 *
 * The Claude Design project holds the same photographs, but at full camera
 * resolution (hero-asu.jpg is 4300x3370), and the DesignSync API truncates any
 * file over 256 KiB — so the design copies cannot be pulled down intact and are
 * the wrong size for the web regardless. This script goes back to the originals
 * and produces correctly sized, compressed versions instead.
 *
 * The filename mapping below is not guessable: the design assets were matched
 * to their originals via EXIF (photographer + DateTimeOriginal) and exact pixel
 * dimensions. Keep it up to date if new photography is added.
 *
 * Requires ffmpeg on PATH.
 *
 *   node tools/build-assets.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

const WORKING =
  'D:/Dropbox/J9 Brandworks Projects/Ricky Hunley/Ricky Hunley Working';
const PHOTOS = `${WORKING}/Ricky Hunley Photos`;

// `width` is the maximum width of the generated file. Full-bleed heroes get
// more pixels than images that sit inside the 1280px container.
const IMAGES = [
  // Home
  { out: 'hero-asu.jpg', src: `${PHOTOS}/231125 FB at ASU_Marison Bilagody6909.jpg`, width: 2400 },
  { out: 'practice.jpg', src: `${PHOTOS}/210415 FB Spring Practice_Mike Christy1386.jpg`, width: 2000 },
  { out: 'headshot.jpg', src: `${PHOTOS}/Updated Headshot Photo.jpg`, width: 1200 },

  // About
  { out: 'hunley-ricky-3.jpg', src: `${PHOTOS}/Hunley, Ricky-3.jpg`, width: 2400 },
  { out: 'denver.jpg', src: `${PHOTOS}/Ricky Denver.jpg`, width: 1400 },
  { out: 'family.jpg', src: `${PHOTOS}/Ricky Leadership Presentation Images/Ricky and Girls.jpeg`, width: 1400 },

  // Speaking
  { out: 'speaking-2.jpg', src: `${PHOTOS}/Ricky Leadership Presentation Images/IMG_3631.jpg`, width: 1600 },
  { out: 'speaking-3.jpg', src: `${PHOTOS}/Ricky Leadership Presentation Images/IMG_3655.jpg`, width: 1600 },
  { out: 'speaking-glendale.jpg', src: `${PHOTOS}/240517 ICA WWT Glendale_Mike Christy0407(small).png`, width: 1600 },

  // The Huddle — Football 101 grid
  { out: 'f101-a.jpg', src: `${PHOTOS}/20251112 Ricky Hunley Huddle football 101/DSC04700.JPG`, width: 1000 },
  { out: 'f101-b.jpg', src: `${PHOTOS}/20251112 Ricky Hunley Huddle football 101/DSC04760.JPG`, width: 1000 },
  { out: 'f101-c.jpg', src: `${PHOTOS}/20251112 Ricky Hunley Huddle football 101/DSC04730.JPG`, width: 1000 },
  { out: 'f101-d.jpg', src: `${PHOTOS}/20251112 Ricky Hunley Huddle football 101/DSC04680.JPG`, width: 1000 },
  { out: 'huddle-prescott.jpg', src: `${PHOTOS}/240606 WT Prescott Valley_Rebecca Sasnett876(small).png`, width: 1600 },

  // Contact / community
  { out: 'contact-nau.jpg', src: `${PHOTOS}/210918_FB_vs_NAU_MMattina_48.jpg`, width: 1600 },
  { out: 'contact-nogales.jpg', src: `${PHOTOS}/240617 WWT Nogales_Rebecca Sasnett159(small).png`, width: 1600 },
];

// Small enough that the design project serves them intact, and they have no
// larger original worth going back to.
const FROM_DESIGN_PROJECT = ['ua-1983.jpg', 'hunley-huddle-logo.png'];

/**
 * The home page hero loop. The master is 17.5 MB, far too much to stream behind
 * a hero, so it is re-encoded down to roughly 4 MB.
 *
 * The source is soft, grainy 1980s broadcast footage and it plays under a
 * `grayscale(0.35) contrast(1.05) brightness(0.72)` filter, so it tolerates
 * aggressive compression — the artefacts land in grain that is already there.
 *
 *   -an                    the element is muted and the master's audio track is
 *                          silent anyway; dropping it also avoids iOS refusing
 *                          to autoplay
 *   -movflags +faststart   moov atom first, so playback can start before the
 *                          whole file has arrived
 *   -maxrate / -bufsize    stops busy passages spiking the bitrate
 */
const VIDEO = {
  out: 'uploads/RH-Hero-3.mp4',
  src: `${WORKING}/RH-Hero-3.mp4`,
  args: [
    '-c:v', 'libx264',
    '-crf', '34',
    '-preset', 'slow',
    '-profile:v', 'main',
    '-level', '4.0',
    '-pix_fmt', 'yuv420p',
    '-maxrate', '1200k',
    '-bufsize', '2400k',
    '-movflags', '+faststart',
    '-an',
  ],
};

fs.mkdirSync(OUT, { recursive: true });

function probeWidth(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width', '-of', 'csv=p=0', file],
    { encoding: 'utf8' }
  );
  return parseInt(out.trim(), 10);
}

let built = 0;
let missing = [];

for (const img of IMAGES) {
  if (!fs.existsSync(img.src)) {
    missing.push(img.out);
    continue;
  }

  // Never upscale: if the original is already narrower, keep its width.
  const srcWidth = probeWidth(img.src);
  const target = Math.min(img.width, srcWidth);

  const dest = path.join(OUT, img.out);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel', 'error',
      '-i', img.src,
      // -2 keeps the height even, which some encoders insist on.
      '-vf', `scale=${target}:-2:flags=lanczos`,
      '-q:v', '4', // ~JPEG quality 75; every photo sits under a grayscale/contrast
      // filter in the design, which hides compression artefacts
      dest,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );

  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`${img.out.padEnd(24)} ${srcWidth} -> ${target}px  ${kb} KB`);
  built++;
}

if (fs.existsSync(VIDEO.src)) {
  const dest = path.join(ROOT, VIDEO.out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', VIDEO.src, ...VIDEO.args, dest],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
  const srcMb = fs.statSync(VIDEO.src).size / 1048576;
  const outMb = fs.statSync(dest).size / 1048576;
  console.log(
    `${VIDEO.out.padEnd(24)} ${srcMb.toFixed(1)} -> ${outMb.toFixed(1)} MB`
  );
  built++;
} else {
  missing.push(VIDEO.out);
}

for (const name of FROM_DESIGN_PROJECT) {
  if (fs.existsSync(path.join(OUT, name))) {
    console.log(`${name.padEnd(24)} (from the design project, unchanged)`);
  } else {
    missing.push(name);
  }
}

console.log(`\nbuilt ${built} files`);
if (missing.length) {
  console.log(`MISSING: ${missing.join(', ')}`);
  process.exitCode = 1;
}
