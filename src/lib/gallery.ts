import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import captions from '../data/gallery.json';

/**
 * Gallery pictures: every PNG/JPG/WebP in public/gallery/ is shown. Order and captions come from
 * src/data/gallery.json; pictures that are not listed there come last, with their file name as caption.
 */
export interface Shot {
  src: string;
  caption: string;
  alt: string;
  home: boolean;
}

const DIR = join(process.cwd(), 'public', 'gallery');
const list = captions as { file: string; caption: string; alt?: string; home?: boolean }[];

function fromName(file: string) {
  const base = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export const gallery: Shot[] = (() => {
  if (!existsSync(DIR)) return [];
  const files = readdirSync(DIR).filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f));
  const order = (f: string) => {
    const i = list.findIndex((c) => c.file === f);
    return i < 0 ? 1e6 : i;
  };
  return files
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .map((f) => {
      const c = list.find((x) => x.file === f);
      const caption = c?.caption ?? fromName(f);
      return { src: `/gallery/${encodeURIComponent(f)}`, caption, alt: c?.alt ?? `Toad's Visuals: ${caption}`, home: !!c?.home };
    });
})();
