import { useEffect } from 'react';
import { site } from '@/config/site';

interface Props {
  title?: string;
  description?: string;
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const [name, key] = selector.includes('property')
      ? ['property', selector.split('"')[1]]
      : ['name', selector.split('"')[1]];
    el.setAttribute(name, key);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/** Keeps document title and social metadata in sync for each route. */
export function PageMeta({ title, description }: Props) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${site.siteName}` : `${site.siteName} — ${site.tagline}`;
    document.title = fullTitle;
    const desc = description ?? site.description;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', desc);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, [title, description]);

  return null;
}
