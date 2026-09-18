import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { site } from '@/config/site';
import { absoluteUrl, homeTitle, withBrand } from '@/utils/seo';

interface Props {
  /** Short page name; the brand is appended. */
  title?: string;
  /** Complete title, used as-is (game pages build their own). */
  fullTitle?: string;
  description?: string;
  /** Personal or empty pages (settings, favorites, not found) stay out of search. */
  noindex?: boolean;
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Keeps the document head in sync on client-side navigation. The first load
 * already has matching tags from the prerendered HTML (scripts/prerender.ts).
 */
export function PageMeta({ title, fullTitle, description, noindex = false }: Props) {
  const { pathname } = useLocation();

  useEffect(() => {
    const resolvedTitle = fullTitle ?? (title ? withBrand(title) : homeTitle());
    const desc = description ?? site.description;
    const url = absoluteUrl(pathname);
    document.title = resolvedTitle;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
    setMeta('property', 'og:title', resolvedTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', resolvedTitle);
    setMeta('name', 'twitter:description', desc);
    setLink('canonical', url);
  }, [title, fullTitle, description, noindex, pathname]);

  return null;
}
