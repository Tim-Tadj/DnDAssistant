#!/usr/bin/env node
// Builds the monster art the app serves: JPEG XL first, WebP as the
// fallback for browsers that can't decode JXL yet.
//
// For every `img_url` in the bundled monster data (local Monster Manual
// pages and D&D Beyond art) it writes two variants:
//   public/img/monsters/thumb/<key>.{jxl,webp}  96px square, for list rows
//   public/img/monsters/full/<key>.{jxl,webp}   up to 640px, for stat blocks
// plus public/img/monsters/manifest.json, the list of keys that exist.
// The app reads the manifest at runtime and uses the original URL for
// anything not in it (homebrew art, or a clone that hasn't run this).
//
// The art is copyrighted, so public/img/ is gitignored like
// public/monster-manual/: run this on the machine that builds/deploys.
//
// Usage:   npm run images            (needs ffmpeg with libjxl + libwebp)
//          npm run images -- --force (rebuild files that already exist)
//
// Downloads are cached in node_modules/.cache/dnd-images. Keys must stay
// in step with `imageKey` in src/ts/shared/images.ts.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'img', 'monsters');
const CACHE = join(ROOT, 'node_modules', '.cache', 'dnd-images');
const SOURCES = ['srd_5e_monsters.json', 'monster_manual_monsters.json'];
const FORCE = process.argv.includes('--force');
const JOBS = 4;

// Mirrors imageKey() in src/ts/shared/images.ts.
const imageKey = (url) => {
  let m = url.match(/^monster-manual\/img-(\d+)\.\w+$/i);
  if (m) return `mm-${m[1]}`;
  m = url.match(/cursecdn\.com\/avatars\/thumbnails\/.+\/(\d+)\.\w+$/i);
  if (m) return `ddb-${m[1]}`;
  m = url.match(/cursecdn\.com\/attachments\/.+\/([a-z]+)\.\w+$/i);
  if (m) return `ddb-${m[1].toLowerCase()}`;
  return null;
};

const probe = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
if (probe.status !== 0 || !/libjxl/.test(probe.stdout) || !/libwebp/.test(probe.stdout)) {
  console.error('ffmpeg with libjxl and libwebp is required (e.g. `winget install ffmpeg`).');
  process.exit(1);
}

const urls = new Set();
for (const file of SOURCES) {
  const rows = JSON.parse(readFileSync(join(ROOT, 'src', 'res', 'resources', file), 'utf8'));
  for (const r of rows) if (r.img_url) urls.add(r.img_url);
}

for (const d of [CACHE, join(OUT, 'thumb'), join(OUT, 'full')]) mkdirSync(d, { recursive: true });

// Local pages come from public/; remote art is downloaded once.
const source = async (url, key) => {
  if (!/^https?:/i.test(url)) {
    const p = join(ROOT, 'public', url);
    return existsSync(p) ? p : null;
  }
  const cached = join(CACHE, `${key}${url.match(/\.\w+$/)?.[0] ?? '.jpg'}`);
  if (existsSync(cached)) return cached;
  const res = await fetch(url);
  if (!res.ok) return null;
  writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  return cached;
};

const ffmpeg = (args) =>
  new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let stderr = '';
    p.stderr.on('data', (d) => (stderr += d));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr.trim()))));
  });

// Thumbs are cropped a little above centre: most art has the head up top.
const VARIANTS = {
  thumb: 'scale=96:96:force_original_aspect_ratio=increase,crop=96:96:(iw-96)/2:(ih-96)*0.3',
  full: "scale='min(640,iw)':'min(640,ih)':force_original_aspect_ratio=decrease",
};
// JXL distance 2.5 lands at about WebP q72's size for the stat-block copies
// (2 is ~20% bigger there); thumbs are ~4KB either way, so keep them crisp.
const ENCODERS = {
  jxl: (variant) => ['-c:v', 'libjxl', '-distance', variant === 'full' ? '2.5' : '2', '-effort', '7'],
  webp: () => ['-c:v', 'libwebp', '-quality', '72'],
};

const keys = new Map();
for (const url of urls) {
  const key = imageKey(url);
  if (key && !keys.has(key)) keys.set(key, url);
}

const built = [];
const failed = [];
const queue = [...keys];
const worker = async () => {
  while (queue.length) {
    const [key, url] = queue.shift();
    try {
      const src = await source(url, key);
      if (!src) throw new Error('source not found');
      for (const [variant, filter] of Object.entries(VARIANTS)) {
        for (const [ext, enc] of Object.entries(ENCODERS)) {
          const out = join(OUT, variant, `${key}.${ext}`);
          if (!FORCE && existsSync(out)) continue;
          await ffmpeg(['-i', src, '-vf', filter, '-frames:v', '1', ...enc(variant), out]);
        }
      }
      built.push(key);
      if (built.length % 50 === 0) console.log(`  ${built.length}/${keys.size}`);
    } catch (e) {
      failed.push(`${key} (${url}): ${e.message}`);
    }
  }
};
await Promise.all(Array.from({ length: JOBS }, worker));

built.sort();
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ keys: built }));
console.log(`Built ${built.length} of ${keys.size} images into public/img/monsters.`);
if (failed.length) {
  console.log(`Skipped ${failed.length}:`);
  for (const f of failed) console.log(`  ${f}`);
}
