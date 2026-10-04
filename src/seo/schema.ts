import { site } from '@/config/site';
import { getCategory } from '@/data/categories';
import { absoluteUrl, gamePath } from '@/utils/seo';
import type { GameDefinition } from '@/types';
import { isTwoPlayer } from './content';
import type { Faq } from './content';

/**
 * schema.org structured data for every page type. Rendered as JSON-LD by
 * <JsonLd> in the route files, so crawlers get it in the static HTML.
 */

export interface Crumb {
  name: string;
  path: string;
}

export const organization = {
  '@type': 'Organization',
  '@id': `${site.siteUrl}/#organization`,
  name: site.siteName,
  url: `${site.siteUrl}/`,
  logo: `${site.siteUrl}/icon-512.png`,
};

export function website() {
  return {
    '@type': 'WebSite',
    '@id': `${site.siteUrl}/#website`,
    name: site.siteName,
    url: `${site.siteUrl}/`,
    description: site.description,
    inLanguage: 'en',
    publisher: { '@id': organization['@id'] },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${site.siteUrl}/games/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbs(items: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqPage(faqs: Faq[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function gameList(games: GameDefinition[], name?: string) {
  return {
    '@type': 'ItemList',
    ...(name ? { name } : {}),
    numberOfItems: games.length,
    itemListElement: games.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(gamePath(g.id)),
      name: g.title,
    })),
  };
}

export function collectionPage(name: string, path: string, games: GameDefinition[], description?: string) {
  return {
    '@type': 'CollectionPage',
    name,
    url: absoluteUrl(path),
    ...(description ? { description } : {}),
    mainEntity: gameList(games),
  };
}

export function videoGame(g: GameDefinition, opts: { image: string; dateModified?: string }) {
  const url = absoluteUrl(gamePath(g.id));
  const cat = getCategory(g.category);
  return {
    '@type': 'VideoGame',
    '@id': `${url}#game`,
    name: g.title,
    url,
    description: g.fullDescription,
    image: opts.image,
    genre: [cat.name, ...g.tags.slice(0, 3)],
    keywords: g.tags.join(', '),
    gamePlatform: ['Web browser', 'Mobile web browser'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    playMode: isTwoPlayer(g) ? ['SinglePlayer', 'MultiPlayer'] : 'SinglePlayer',
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: isTwoPlayer(g) ? 2 : 1 },
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    potentialAction: { '@type': 'PlayAction', target: url },
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    publisher: { '@id': organization['@id'] },
    author: { '@id': organization['@id'] },
  };
}
