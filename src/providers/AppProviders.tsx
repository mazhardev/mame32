'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import SiteLayout from '@/layouts/SiteLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { runMigrations } from '@/storage/StorageService';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';

let booted = false;

/** One-time browser start-up: legacy links, data migrations, offline support. */
function useBoot() {
  useEffect(() => {
    if (booted) return;
    booted = true;
    // Earlier builds used hash routing (/#/games/snake). Send those links to
    // the real page so bookmarks and shared links keep working.
    if (window.location.hash.startsWith('#/')) {
      const [path, query] = window.location.hash.slice(1).split('?');
      const slashed = path.endsWith('/') ? path : `${path}/`;
      window.location.replace(query ? `${slashed}?${query}` : slashed);
      return;
    }
    runMigrations();
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      // Generated after `next build` by scripts/postbuild.mjs.
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline support is optional; the site works without it.
      });
    }
  }, []);
}

/** Everything that wraps every page in the browser. */
export function AppProviders({ children }: { children: ReactNode }) {
  useBoot();
  return (
    <ThemeProvider>
      <ToastProvider>
        <SiteLayout>
          <ErrorBoundary title="Something went wrong">{children}</ErrorBoundary>
        </SiteLayout>
      </ToastProvider>
    </ThemeProvider>
  );
}
