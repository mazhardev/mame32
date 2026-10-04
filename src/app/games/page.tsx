import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { site } from '@/config/site';
import { getPlayableGames } from '@/data/gameCatalog';
import { pageMetadata } from '@/seo/metadata';
import { breadcrumbs, collectionPage, organization } from '@/seo/schema';
import { withBrand } from '@/utils/seo';
import AllGamesPage from '@/views/AllGamesPage';

const count = getPlayableGames().length;

export const metadata: Metadata = pageMetadata({
  path: '/games/',
  title: withBrand('All Free Online Games'),
  description: `Browse all ${count} free online games on ${site.siteName}. Filter by category, difficulty and controls, then play instantly in your browser with no download.`,
});

export default function Page() {
  return (
    <>
      <JsonLd
        graph={[
          organization,
          breadcrumbs([
            { name: 'Home', path: '/' },
            { name: 'All games', path: '/games/' },
          ]),
          collectionPage('All free online games', '/games/', getPlayableGames()),
        ]}
      />
      <AllGamesPage />
    </>
  );
}
