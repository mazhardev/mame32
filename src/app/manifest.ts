import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

export const dynamic = 'force-static';

/** Web app manifest: makes the site installable as an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.siteName} – Free Online Games`,
    short_name: site.siteName,
    description: 'Classic, puzzle, arcade, strategy and casual games that run directly in your browser.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: site.theme.brand,
    background_color: '#0b0d14',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
