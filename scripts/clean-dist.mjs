// Runs after the build: removes every mod file from dist/ that the website does not offer, so old versions
// (for example jars still lying in public/downloads/) can never be downloaded from the live site.
import { readFileSync, readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const data = JSON.parse(readFileSync(join(root, 'src/data/releases.json'), 'utf8'));
const dir = join(root, 'dist', 'downloads');
if (!existsSync(dir)) process.exit(0);

const html = readFileSync(join(dir, 'index.html'), 'utf8');
const offered = new Set([...html.matchAll(/href="(\/downloads\/[^"]+\.jar)"/g)].map((m) => decodeURIComponent(m[1])));
let removed = 0;
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) {
      walk(p);
      if (readdirSync(p).length === 0) rmSync(p, { recursive: true });
    } else if (name.toLowerCase().endsWith('.jar')) {
      const url = '/' + p.slice(join(root, 'dist').length + 1).split(/[\\/]/).join('/');
      if ((data.external ?? []).length > 0 || !offered.has(url)) {
        rmSync(p);
        removed++;
      }
    }
  }
};
walk(dir);
console.log(`clean-dist: removed ${removed} mod file(s) that are not offered`);
