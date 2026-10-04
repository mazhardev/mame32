import type { Metadata } from 'next';
import { site } from '@/config/site';
import { pageMetadata } from '@/seo/metadata';
import { withBrand } from '@/utils/seo';
import StatisticsPage from '@/views/StatisticsPage';

// Personal page: it must load directly, but stays out of search results.
export const metadata: Metadata = pageMetadata({
  path: '/statistics/',
  title: withBrand('Statistics'),
  description: `Your statistics on ${site.siteName}, stored locally in your browser.`,
  noindex: true,
});

export default function Page() {
  return <StatisticsPage />;
}
