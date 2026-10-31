import { createHash } from 'node:crypto';
import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import data from '../data/releases.json';
import changelog from '../data/changelog.json';

/**
 * Downloads are found automatically: every .jar in public/downloads/<version>/ is a download of that version.
 * The Minecraft version is read from the file name (…mc1.21.11.jar, …+1.21.11.jar, …+26.3.jar). Every version
 * that can appear must be listed in releases.json → "targets".
 * Files hosted elsewhere (Dropbox …) are listed in releases.json → "external". As soon as "external" has entries,
 * ONLY those are offered and every jar in public/downloads/ is ignored (and removed from dist by scripts/clean-dist.mjs).
 * Only the newest version is offered for download.
 */

export type McVersion = keyof typeof data.targets;

export interface FileInfo {
  mc: McVersion;
  name: string;
  href: string;
  bytes: number;
  size: string;
  sha256: string | null;
  java: number;
  loader: string;
  fabricApi: string;
  external: boolean;
}

export interface Release {
  version: string;
  date: string | null;
  title: string | null;
  files: FileInfo[];
}

/** Cloudflare Pages serves files up to 25 MiB. */
export const MAX_FILE = 25 * 1024 * 1024;
const DOWNLOADS = join(process.cwd(), 'public', 'downloads');

export const targets = data.targets;
export const mcVersions = Object.keys(data.targets) as McVersion[];

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Minecraft version from a file name, longest match first (so 1.21.11 wins over 1.21.1). */
export function mcFromName(name: string): McVersion | null {
  const sorted = [...mcVersions].sort((a, b) => b.length - a.length);
  for (const v of sorted) {
    const esc = v.replace(/\./g, '\\.');
    if (new RegExp(`(^|[^0-9.])(mc)?${esc}(\\.jar$|[^0-9])`, 'i').test(name)) return v;
  }
  return null;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function localFile(version: string, name: string): FileInfo {
  const mc = mcFromName(name);
  if (!mc) {
    throw new Error(
      `public/downloads/${version}/${name}: cannot tell the Minecraft version from the file name. ` +
        `Put it in the name, e.g. ToadsVisuals-${version}-mc1.21.11.jar`,
    );
  }
  const path = join(DOWNLOADS, version, name);
  const bytes = statSync(path).size;
  if (bytes > MAX_FILE) {
    throw new Error(
      `public/downloads/${version}/${name} is ${formatSize(bytes)}. Cloudflare Pages only serves files up to 25 MB. ` +
        'Upload it somewhere else (e.g. GitHub Releases), remove it here and add the link to "external" in src/data/releases.json.',
    );
  }
  const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
  const t = data.targets[mc];
  return {
    mc,
    name,
    href: `/downloads/${encodeURIComponent(version)}/${encodeURIComponent(name)}`,
    bytes,
    size: formatSize(bytes),
    sha256,
    java: t.java,
    loader: t.loader,
    fabricApi: t.fabricApi,
    external: false,
  };
}

type External = { version: string; mc: McVersion; url: string; name: string; bytes?: number; sha256?: string };

function collect(): Release[] {
  const byVersion = new Map<string, FileInfo[]>();
  const useLocal = ((data.external ?? []) as External[]).length === 0;
  if (useLocal && existsSync(DOWNLOADS)) {
    for (const version of readdirSync(DOWNLOADS)) {
      const dir = join(DOWNLOADS, version);
      if (!statSync(dir).isDirectory() || !/^\d+(\.\d+)*$/.test(version)) continue;
      for (const name of readdirSync(dir)) {
        if (!name.toLowerCase().endsWith('.jar')) continue;
        const file = localFile(version, name);
        const twin = (byVersion.get(version) ?? []).find((f) => f.mc === file.mc);
        if (twin) {
          throw new Error(
            `public/downloads/${version}/ has two files for Minecraft ${file.mc}: ${twin.name} and ${name}. ` +
              'Keep only one per Minecraft version (delete the old one).',
          );
        }
        byVersion.set(version, [...(byVersion.get(version) ?? []), file]);
      }
    }
  }
  for (const e of (data.external ?? []) as External[]) {
    const t = data.targets[e.mc];
    byVersion.set(e.version, [
      ...(byVersion.get(e.version) ?? []),
      {
        mc: e.mc,
        name: e.name,
        href: e.url,
        bytes: e.bytes ?? 0,
        size: e.bytes ? formatSize(e.bytes) : '',
        sha256: e.sha256 ?? null,
        java: t.java,
        loader: t.loader,
        fabricApi: t.fabricApi,
        external: true,
      },
    ]);
  }
  return [...byVersion.entries()]
    .sort(([a], [b]) => compareVersions(a, b))
    .map(([version, files]) => {
      const notes = changelog.versions.find((v) => v.version === version);
      files.sort((a, b) => mcVersions.indexOf(a.mc) - mcVersions.indexOf(b.mc));
      return { version, date: notes?.date ?? null, title: notes?.title?.en ?? null, files };
    });
}

const all = collect();
if (all.length === 0) throw new Error('No downloads found (public/downloads/<version>/ or "external" in src/data/releases.json)');
/** Only the newest version is offered. */
export const latest = all[0];
export const releases: Release[] = [latest];
/** The Minecraft versions the newest release has files for, in the order of releases.json. */
export const offeredMc: McVersion[] = latest.files.map((f) => f.mc);

/** "a", "a and b", "a, b and c" */
export function joinList(items: string[], word = 'and'): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
