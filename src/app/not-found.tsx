import type { Metadata } from 'next';
import { site } from '@/config/site';
import { withBrand } from '@/utils/seo';
import NotFoundPage from '@/views/NotFoundPage';

// Served as 404.html: no canonical URL, and kept out of search.
export const metadata: Metadata = {
  title: { absolute: withBrand('Page not found') },
  description: site.description,
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundPage />;
}
