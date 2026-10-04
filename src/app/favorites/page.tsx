import type { Metadata } from 'next';
import { site } from '@/config/site';
import { pageMetadata } from '@/seo/metadata';
import { withBrand } from '@/utils/seo';
import FavoritesPage from '@/views/FavoritesPage';

// Personal page: it must load directly, but stays out of search results.
export const metadata: Metadata = pageMetadata({
  path: '/favorites/',
  title: withBrand('Favorites'),
  description: `Your favorites on ${site.siteName}, stored locally in your browser.`,
  noindex: true,
});

export default function Page() {
  return <FavoritesPage />;
}
