import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { site } from '@/config/site';
import { pageMetadata } from '@/seo/metadata';
import { organization } from '@/seo/schema';
import { withBrand } from '@/utils/seo';
import AboutPage from '@/views/AboutPage';

export const metadata: Metadata = pageMetadata({
  path: '/about/',
  title: withBrand('About'),
  description: `${site.siteName} is a free online games website. Every game is original, runs entirely in your browser and works on desktop, mobile and offline.`,
});

export default function Page() {
  return (
    <>
      <JsonLd graph={[organization]} />
      <AboutPage />
    </>
  );
}
