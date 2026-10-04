/**
 * Build-time helpers for the route files. They touch the file system and
 * git, so only server components, metadata routes and route handlers may
 * import this module — never a client component.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { site } from '@/config/site';
import { ogImagePath } from '@/utils/seo';
import type { OgImageKind } from '@/utils/seo';
import type { GameDefinition } from '@/types';

const root = process.cwd();

/** The page's own share image from scripts/og-images.ts, if it has been generated. */
export function shareImage(kind: OgImageKind, slug: string): string | undefined {
  const path = ogImagePath(kind, slug);
  return existsSync(join(root, 'public', path)) ? `${site.siteUrl}${path}` : undefined;
}

export const defaultImage = `${site.siteUrl}${site.ogImage}`;

/* -------------------------------------------------- last-modified dates */

const today = new Date().toISOString().slice(0, 10);
let fileDates: Map<string, string> | null = null;

/**
 * Real per-page modification dates for the sitemap and structured data.
 * Search engines ignore lastmod once they notice it is always "today", so a
 * game uses the date of the last commit touching its folder, and every page
 * moves forward when the shared SEO copy changes. Falls back to today outside
 * a git checkout.
 */
function dates(): Map<string, string> {
  if (fileDates) return fileDates;
  const found = new Map<string, string>();
  try {
    const out = execFileSync(
      'git',
      ['log', '--format=%x00%cs', '--name-only', '--', 'src/games', 'src/seo', 'src/views', 'src/utils/seo.ts'],
      { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let date = '';
    for (const line of out.split('\n')) {
      if (line.startsWith('\0')) date = line.slice(1);
      else if (line && !found.has(line)) found.set(line, date);
    }
  } catch {
    // Not a git checkout (e.g. a tarball build): every page gets today's date.
  }
  fileDates = found;
  return found;
}

function latest(...values: (string | undefined)[]): string {
  const known = values.filter((d): d is string => !!d).sort();
  return known.length ? known[known.length - 1] : today;
}

function dateOfPrefix(prefix: string): string | undefined {
  let best: string | undefined;
  for (const [file, date] of dates()) if (file.startsWith(prefix) && (!best || date > best)) best = date;
  return best;
}

export function seoDate(): string {
  return latest(dateOfPrefix('src/seo/'), dates().get('src/utils/seo.ts'));
}

export function gameDate(id: string): string {
  return latest(dateOfPrefix(`src/games/${id}/`), seoDate());
}

export function newestOf(games: GameDefinition[]): string {
  return latest(seoDate(), ...games.map((g) => gameDate(g.id)));
}

export function fileDate(path: string): string {
  return latest(dates().get(path), seoDate());
}
