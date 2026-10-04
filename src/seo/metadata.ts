import type { Metadata } from 'next';
import { site } from '@/config/site';
import { absoluteUrl } from '@/utils/seo';

interface PageMetaInput {
  path: string;
  /** Complete title, brand included (see utils/seo.ts). */
  title: string;
  description: string;
  /** Personal pages (settings, favorites) load directly but stay out of search. */
  noindex?: boolean;
  /** Absolute share-image URL; defaults to the site-wide image. */
  image?: string;
  imageAlt?: string;
}

/** Title, description, canonical URL and social tags for one page. */
export function pageMetadata({ path, title, description, noindex, image, imageAlt }: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const img = image ?? `${site.siteUrl}${site.ogImage}`;
  const alt = image ? (imageAlt ?? title) : `${site.siteName} – free online games you can play instantly`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'website',
      siteName: site.siteName,
      locale: 'en_US',
      url,
      title,
      description,
      images: [{ url: img, width: 1200, height: 630, alt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [img] },
  };
}
