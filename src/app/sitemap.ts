import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@/data/categories';
import { activeCollections, collectionGames, collectionPath } from '@/data/collections';
import { getGamesByCategory, getPlayableGames } from '@/data/gameCatalog';
import { fileDate, gameDate, newestOf, shareImage } from '@/seo/server';
import { absoluteUrl, categoryPath, gamePath } from '@/utils/seo';

export const dynamic = 'force-static';

/** Every indexable page with its real last-modified date and share image. */
export default function sitemap(): MetadataRoute.Sitemap {
  const games = getPlayableGames();
  const entry = (path: string, lastModified: string, image?: string): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    lastModified,
    ...(image ? { images: [image] } : {}),
  });

  return [
    entry('/', newestOf(games)),
    entry('/games/', newestOf(games)),
    entry('/categories/', newestOf(games)),
    ...CATEGORIES.filter((c) => getGamesByCategory(c.id, true).length > 0).map((c) =>
      entry(categoryPath(c.slug), newestOf(getGamesByCategory(c.id, true)), shareImage('categories', c.slug)),
    ),
    ...activeCollections(games).map((c) =>
      entry(collectionPath(c.slug), newestOf(collectionGames(c, games)), shareImage('collections', c.slug)),
    ),
    ...games.map((g) => entry(gamePath(g.id), gameDate(g.id), shareImage('games', g.id))),
    entry('/about/', fileDate('src/views/AboutPage.tsx')),
    entry('/privacy/', fileDate('src/views/PrivacyPage.tsx')),
  ];
}
