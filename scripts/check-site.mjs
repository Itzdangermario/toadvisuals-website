// Checks the built site in dist/: every internal link and #anchor exists, every download is there.
// Run after `npm run build`:  npm run check-links
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const redirects = existsSync(join(dist, '_redirects'))
  ? readFileSync(join(dist, '_redirects'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s+/)[0])
  : [];

const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) pages.push(p);
  }
})(dist);

function fileFor(path) {
  const clean = decodeURIComponent(path.split('#')[0].split('?')[0]);
  const candidates = [join(dist, clean), join(dist, clean, 'index.html'), join(dist, clean + '.html')];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
}

const ids = new Map();
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  ids.set(p, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

let errors = 0;
const external = new Set();
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:)/.test(url)) {
      if (!url.startsWith('https://toadvisuals.lol')) external.add(url);
      continue;
    }
    if (url.startsWith('data:')) continue;
    const page = relative(dist, p);
    if (url.startsWith('#')) {
      if (url.length > 1 && !ids.get(p).has(url.slice(1))) {
        console.log(`✗ ${page}: missing anchor ${url}`);
        errors++;
      }
      continue;
    }
    const [path, hash] = url.split('#');
    const target = fileFor(path);
    if (!target) {
      if (redirects.includes(path) || redirects.includes(path.replace(/\/$/, ''))) continue;
      console.log(`✗ ${page}: broken link ${url}`);
      errors++;
      continue;
    }
    if (hash && target.endsWith('.html') && !ids.get(target)?.has(hash)) {
      console.log(`✗ ${page}: ${url} – anchor #${hash} not found`);
      errors++;
    }
  }
}

console.log(`\n${pages.length} pages checked, ${errors} problem(s).`);
console.log(`External links (open them once by hand):\n  ${[...external].sort().join('\n  ')}`);
process.exit(errors ? 1 : 0);
