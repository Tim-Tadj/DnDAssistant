// Monster art. `npm run images` (scripts/build-images.mjs) builds JPEG XL
// and WebP copies of every bundled monster image, in a 96px thumbnail and
// a stat-block size, and lists them in public/img/monsters/manifest.json.
// Anything not in the manifest (homebrew art, or a checkout that hasn't
// built the images) falls back to the original URL.

import { useEffect, useState } from 'react';
import { resolveImgUrl } from '../types/Monster';

export type ImageVariant = 'thumb' | 'full';

const BASE = `${process.env.PUBLIC_URL || ''}/img/monsters`;

// Keep in step with imageKey() in scripts/build-images.mjs.
export const imageKey = (url: string): string | null => {
  let m = url.match(/^monster-manual\/img-(\d+)\.\w+$/i);
  if (m) return `mm-${m[1]}`;
  m = url.match(/cursecdn\.com\/avatars\/thumbnails\/.+\/(\d+)\.\w+$/i);
  if (m) return `ddb-${m[1]}`;
  m = url.match(/cursecdn\.com\/attachments\/.+\/([a-z]+)\.\w+$/i);
  if (m) return `ddb-${m[1].toLowerCase()}`;
  return null;
};

// D&D Beyond's stock pictures for monsters with no art of their own.
// In a list they'd repeat row after row, so rows show a type badge.
const STOCK = new Set(['ddb-beast', 'ddb-humanoid', 'ddb-undead', 'ddb-plant', 'ddb-ooze']);
export const hasOwnArt = (url?: string | null): url is string => !!url && !STOCK.has(imageKey(url) ?? '');

let pending: Promise<Set<string>> | null = null;
let loaded: Set<string> | null = null;

export const loadImageManifest = (): Promise<Set<string>> => {
  if (!pending) {
    pending = fetch(`${BASE}/manifest.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((m: { keys?: string[] }) => new Set(m.keys ?? []))
      .catch(() => new Set<string>())
      .then((keys) => (loaded = keys));
  }
  return pending;
};

// null until the manifest has loaded (once per page load).
export function useImageManifest(): Set<string> | null {
  const [keys, setKeys] = useState(loaded);
  useEffect(() => {
    if (keys) return;
    let alive = true;
    loadImageManifest().then((k) => alive && setKeys(k));
    return () => {
      alive = false;
    };
  }, [keys]);
  return keys;
}

export type ImageSources = { jxl?: string; webp?: string; src: string };

export const imageSources = (url: string, variant: ImageVariant, manifest: Set<string>): ImageSources => {
  const key = imageKey(url);
  if (!key || !manifest.has(key)) return { src: resolveImgUrl(url) };
  const base = `${BASE}/${variant}/${key}`;
  return { jxl: `${base}.jxl`, webp: `${base}.webp`, src: `${base}.webp` };
};
