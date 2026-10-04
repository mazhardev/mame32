import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { site } from '@/config/site';
import { getPlayableGames } from '@/data/gameCatalog';
import { homeFaqs } from '@/seo/content';
import { pageMetadata } from '@/seo/metadata';
import { faqPage, gameList, organization, website } from '@/seo/schema';
import { homeTitle } from '@/utils/seo';
import HomePage from '@/views/HomePage';

export const metadata: Metadata = pageMetadata({ path: '/', title: homeTitle(), description: site.description });

export default function Page() {
  const games = getPlayableGames();
  return (
    <>
      <JsonLd graph={[website(), organization, gameList(games, 'Free online games'), faqPage(homeFaqs(games.length))]} />
      <HomePage />
    </>
  );
}
