import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { site } from '@/config/site';
import {
  activeCollections,
  collectionDescription,
  collectionGames,
  collectionPath,
  getCollection,
} from '@/data/collections';
import { getPlayableGames } from '@/data/gameCatalog';
import { pageMetadata } from '@/seo/metadata';
import { breadcrumbs, collectionPage, faqPage, organization } from '@/seo/schema';
import { shareImage } from '@/seo/server';
import { collectionTitle } from '@/utils/seo';
import CollectionPage from '@/views/CollectionPage';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return activeCollections(getPlayableGames()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = getCollection((await params).slug);
  if (!collection) return {};
  const games = collectionGames(collection, getPlayableGames());
  return pageMetadata({
    path: collectionPath(collection.slug),
    title: collectionTitle(collection.title),
    description: collectionDescription(collection, games.length),
    image: shareImage('collections', collection.slug),
    imageAlt: `${collection.name} on ${site.siteName}`,
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();
  const games = collectionGames(collection, getPlayableGames());
  return (
    <>
      <JsonLd
        graph={[
          organization,
          breadcrumbs([
            { name: 'Home', path: '/' },
            { name: 'All games', path: '/games/' },
            { name: collection.name, path: collectionPath(collection.slug) },
          ]),
          collectionPage(
            collection.heading,
            collectionPath(collection.slug),
            games,
            collectionDescription(collection, games.length),
          ),
          faqPage(collection.faqs),
        ]}
      />
      <CollectionPage slug={collection.slug} />
    </>
  );
}
