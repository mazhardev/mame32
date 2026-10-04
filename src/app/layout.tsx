import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { site } from '@/config/site';
import { AppProviders } from '@/providers/AppProviders';
import { homeTitle } from '@/utils/seo';
import '@/styles/global.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl),
  title: { absolute: homeTitle() },
  description: site.description,
  applicationName: site.siteName,
  appleWebApp: { title: site.siteName, capable: true },
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
  manifest: '/manifest.webmanifest',
  verification: {
    google: site.verification.google || undefined,
    yandex: site.verification.yandex || undefined,
    other: site.verification.bing ? { 'msvalidate.01': site.verification.bing } : undefined,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: site.theme.brand,
};

const storageKey = (name: string) => `${site.storagePrefix}.${name}`;

/**
 * Google tag with Consent Mode: no analytics cookies until the visitor
 * agrees, and only the live site reports. Runs before the page hydrates.
 */
const analyticsScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
(function () {
  var id = '${site.gaMeasurementId}';
  var choice = null;
  try { choice = localStorage.getItem('${storageKey('analyticsConsent')}'); } catch (e) {}
  if (!/(^|\\.)gamesplayland\\.online$/.test(location.hostname) || choice === 'denied') window['ga-disable-' + id] = true;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: choice === 'granted' ? 'granted' : 'denied'
  });
  gtag('js', new Date());
  gtag('config', id);
})();`;

/** Applies the saved theme before first paint so pages never flash the wrong colours. */
const themeScript = `
(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('${storageKey('preferences')}') || '{}');
    var theme = prefs.theme || 'system';
    if (theme === 'system') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-reduced-motion', String(!!prefs.reducedMotion));
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${site.gaMeasurementId}`} />
        <script dangerouslySetInnerHTML={{ __html: analyticsScript }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
