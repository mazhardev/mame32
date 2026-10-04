import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePreferences } from '@/hooks/usePlatform';

/** Applies the theme and reduced-motion preferences to the document root. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs] = usePreferences();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = prefs.theme === 'system' ? (media.matches ? 'dark' : 'light') : prefs.theme;
      root.setAttribute('data-theme', resolved);
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', resolved === 'dark' ? '#0b0d14' : '#f5f6fa');
    };

    apply();
    if (prefs.theme === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
  }, [prefs.theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-reduced-motion', String(prefs.reducedMotion));
  }, [prefs.reducedMotion]);

  return <>{children}</>;
}
