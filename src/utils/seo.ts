import { site } from '@/config/site';
import type { GameDefinition } from '@/types';

/**
 * Shared by the runtime <PageMeta> and the build-time prerenderer so the
 * titles, descriptions and canonical URLs crawlers see always match.
 */

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;

/** Paths are canonicalised with a trailing slash, matching the static files. */
export function canonicalPath(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0] || '/';
  return clean.endsWith('/') ? clean : `${clean}/`;
}

export function absoluteUrl(pathname: string): string {
  return `${site.siteUrl}${canonicalPath(pathname)}`;
}

export function withBrand(title: string): string {
  return `${title} | ${site.siteName}`;
}

export function homeTitle(): string {
  return `${site.siteName} – Free Online Games, No Download`;
}

export function gameTitle(game: GameDefinition): string {
  const long = `${game.title} – Play Free Online, No Download`;
  if (withBrand(long).length <= MAX_TITLE) return withBrand(long);
  const short = `${game.title} – Play Free Online`;
  return withBrand(short).length <= MAX_TITLE ? withBrand(short) : `${game.title} – Play Free Online`;
}

export function clampDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION) return text;
  const cut = text.slice(0, MAX_DESCRIPTION - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export function gameDescription(game: GameDefinition): string {
  const lead = game.shortDescription.replace(/\.?$/, '.');
  return clampDescription(
    `${lead} Play ${game.title} free in your browser – no download, no sign-up, works on mobile.`,
  );
}

export function categoryTitle(name: string): string {
  return withBrand(`${name} Games – Play Free Online`);
}

export function categoryDescription(name: string, blurb: string, count: number): string {
  const games = count === 1 ? '1 free game' : `${count} free games`;
  return clampDescription(
    `${blurb} Play ${games} in the ${name.toLowerCase()} category instantly in your browser, with no download.`,
  );
}

export function gamePath(id: string): string {
  return `/games/${id}/`;
}

export function categoryPath(slug: string): string {
  return `/categories/${slug}/`;
}
