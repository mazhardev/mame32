import type { Metadata } from 'next';
import { site } from '@/config/site';
import { pageMetadata } from '@/seo/metadata';
import { withBrand } from '@/utils/seo';
import AchievementsPage from '@/views/AchievementsPage';

// Personal page: it must load directly, but stays out of search results.
export const metadata: Metadata = pageMetadata({
  path: '/achievements/',
  title: withBrand('Achievements'),
  description: `Your achievements on ${site.siteName}, stored locally in your browser.`,
  noindex: true,
});

export default function Page() {
  return <AchievementsPage />;
}
