import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { site } from '@/config/site';
import { getCategory } from '@/data/categories';
import { getGame, getPlayableGames } from '@/data/gameCatalog';
import { categoryLabel, gameFaqs } from '@/seo/content';
import { pageMetadata } from '@/seo/metadata';
import { breadcrumbs, faqPage, organization, videoGame } from '@/seo/schema';
import { defaultImage, gameDate, shareImage } from '@/seo/server';
import { categoryPath, gameDescription, gamePath, gameTitle } from '@/utils/seo';
import GameDetailPage from '@/views/GameDetailPage';

interface Props {
  params: Promise<{ gameId: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getPlayableGames().map((g) => ({ gameId: g.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = getGame((await params).gameId);
  if (!game) return {};
  return pageMetadata({
    path: gamePath(game.id),
    title: gameTitle(game),
    description: gameDescription(game),
    image: shareImage('games', game.id),
    imageAlt: `${game.title} – play free online on ${site.siteName}`,
  });
}

export default async function Page({ params }: Props) {
  const { gameId } = await params;
  const game = getGame(gameId);
  if (!game) notFound();
  const cat = getCategory(game.category);
  return (
    <>
      <JsonLd
        graph={[
          organization,
          breadcrumbs([
            { name: 'Home', path: '/' },
            { name: categoryLabel(cat), path: categoryPath(cat.slug) },
            { name: game.title, path: gamePath(game.id) },
          ]),
          videoGame(game, { image: shareImage('games', game.id) ?? defaultImage, dateModified: gameDate(game.id) }),
          faqPage(gameFaqs(game)),
        ]}
      />
      <GameDetailPage gameId={game.id} />
    </>
  );
}
