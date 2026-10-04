/**
 * Static prerender for search engines and AI crawlers.
 *
 * Runs after `vite build` (via vite-node, so it can import the real game
 * catalog). For every public route it writes dist/<route>/index.html with the
 * page's own title, description, canonical URL, social tags, JSON-LD and a
 * readable HTML version of the page inside #root. Crawlers that don't run
 * JavaScript get real content; browsers replace it with the React app.
 *
 * It also writes sitemap.xml, robots.txt, llms.txt and the SPA 404.html.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/config/site';
import { GAME_REGISTRY } from '../src/games/registry';
import { CATEGORIES, getCategory } from '../src/data/categories';
import { PLANNED_GAMES } from '../src/data/plannedGames';
import {
  activeCollections,
  collectionDescription,
  collectionGames,
  collectionPath,
  collectionsForGame,
  type CollectionMeta,
} from '../src/data/collections';
import type { GameDefinition } from '../src/types';
import {
  categoryFaqs,
  categoryIntro,
  categoryLabel,
  gameFaqs,
  homeFaqs,
  isTwoPlayer,
  playersLabel,
  type Faq,
} from '../src/seo/content';
import {
  absoluteUrl,
  categoryDescription,
  categoryPath,
  categoryTitle,
  collectionTitle,
  gameDescription,
  gamePath,
  gameTitle,
  homeTitle,
  ogImagePath,
  withBrand,
  type OgImageKind,
} from '../src/utils/seo';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const template = readFileSync(resolve(dist, 'index.html'), 'utf8');
const today = new Date().toISOString().slice(0, 10);
const ogImage = `${site.siteUrl}${site.ogImage}`;

/** The page's own share image from scripts/og-images.ts, if it has been generated. */
function shareImage(kind: OgImageKind, slug: string): string | undefined {
  const path = ogImagePath(kind, slug);
  return existsSync(resolve(dist, `.${path}`)) ? `${site.siteUrl}${path}` : undefined;
}

const games = [...GAME_REGISTRY].sort((a, b) => a.title.localeCompare(b.title));
const implementedIds = new Set(games.map((g) => g.id));
const planned = PLANNED_GAMES.filter((g) => !implementedIds.has(g.id));
const collections = activeCollections(games);

// ------------------------------------------------------- last-modified dates

/**
 * Real per-page modification dates for the sitemap. Search engines ignore
 * lastmod once they notice it is always "today", so each game uses the date of
 * the last commit touching its folder, and every page also moves forward when
 * the shared SEO copy changes. Falls back to today outside a git checkout.
 */
function gitDates(paths: string[]): Map<string, string> {
  const dates = new Map<string, string>();
  try {
    const out = execFileSync('git', ['log', '--format=%x00%cs', '--name-only', '--', ...paths], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let date = '';
    for (const line of out.split('\n')) {
      if (line.startsWith('\0')) date = line.slice(1);
      else if (line && !dates.has(line)) dates.set(line, date);
    }
  } catch {
    // Not a git checkout (e.g. a tarball build): every page gets today's date.
  }
  return dates;
}

const fileDates = gitDates(['src/games', 'src/seo', 'src/pages', 'src/utils/seo.ts', 'scripts/prerender.ts']);

function latest(...dates: (string | undefined)[]): string {
  const known = dates.filter((d): d is string => !!d).sort();
  return known.length ? known[known.length - 1] : today;
}

function dateOfPrefix(prefix: string): string | undefined {
  let best: string | undefined;
  for (const [file, date] of fileDates) {
    if (file.startsWith(prefix) && (!best || date > best)) best = date;
  }
  return best;
}

const seoDate = latest(
  dateOfPrefix('src/seo/'),
  fileDates.get('src/utils/seo.ts'),
  fileDates.get('scripts/prerender.ts'),
);
const gameDate = new Map(games.map((g) => [g.id, latest(dateOfPrefix(`src/games/${g.id}/`), seoDate)]));
const newestOf = (list: GameDefinition[]) => latest(seoDate, ...list.map((g) => gameDate.get(g.id)));

// ---------------------------------------------------------------- helpers

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** JSON inside <script> must not be able to close the tag. */
function jsonLd(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function list(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

function gameLink(g: GameDefinition): string {
  return `<li><a href="${gamePath(g.id)}">${esc(g.title)}</a> – ${esc(g.shortDescription)}</li>`;
}

function collectionLinks(items: CollectionMeta[]): string {
  return `<ul>${items
    .map((c) => `<li><a href="${collectionPath(c.slug)}">${esc(c.name)}</a></li>`)
    .join('')}</ul>`;
}

function paragraphs(items: string[]): string {
  return items.map((p) => `<p>${esc(p)}</p>`).join('');
}

const categoryOf = (g: GameDefinition) => getCategory(g.category);
const playableIn = (id: string) => games.filter((g) => g.category === id);

function faqHtml(faqs: Faq[]): string {
  return `<section><h2>Frequently asked questions</h2>${faqs
    .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
    .join('')}</section>`;
}

function faqSchema(faqs: Faq[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function breadcrumbs(items: { name: string; path: string }[]) {
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

function breadcrumbHtml(items: { name: string; path: string }[]): string {
  return `<nav class="small muted" aria-label="Breadcrumb">${items
    .map((b, i) =>
      i === items.length - 1 ? esc(b.name) : `<a href="${b.path}">${esc(b.name)}</a> · `,
    )
    .join('')}</nav>`;
}

const organization = {
  '@type': 'Organization',
  '@id': `${site.siteUrl}/#organization`,
  name: site.siteName,
  url: `${site.siteUrl}/`,
  logo: `${site.siteUrl}/icon-512.png`,
};

// ------------------------------------------------------------ page shell

function shell(inner: string): string {
  const nav = [
    ['/', 'Home'],
    ['/games/', 'Games'],
    ['/categories/', 'Categories'],
  ]
    .map(([href, label]) => `<a class="nav-link" href="${href}">${label}</a>`)
    .join('');
  return `<div class="app-shell">
<header class="site-header"><div class="container"><a class="logo" href="/"><span class="logo-mark" aria-hidden="true">🕹</span><span>${esc(site.siteName)}</span></a><nav class="main-nav" aria-label="Main">${nav}</nav></div></header>
<main id="main" class="page"><div class="container stack">${inner}</div></main>
<footer class="site-footer"><div class="container footer-grid"><div><strong>${esc(site.siteName)}</strong><div>${games.length} free games · everything runs in your browser.</div></div><nav class="footer-links" aria-label="Footer"><a href="/games/">All Games</a><a href="/categories/">Categories</a>${collections
    .slice(0, 4)
    .map((c) => `<a href="${collectionPath(c.slug)}">${esc(c.name)}</a>`)
    .join('')}<a href="/privacy/">Privacy</a><a href="/about/">About</a></nav></div></footer>
</div>`;
}

interface Page {
  path: string;
  title: string;
  description: string;
  body: string;
  schema?: object[];
  noindex?: boolean;
  ogType?: string;
  /** 404.html is served for unknown paths; it must not claim a canonical URL. */
  canonical?: boolean;
  /** YYYY-MM-DD for the sitemap; defaults to today. */
  lastmod?: string;
  /** Absolute share-image URL; defaults to the site-wide image. */
  image?: string;
  imageAlt?: string;
}

function setTag(html: string, pattern: RegExp, replacement: string): string {
  if (!pattern.test(html)) throw new Error(`prerender: template is missing ${pattern}`);
  return html.replace(pattern, () => replacement);
}

const verificationTags = (
  [
    ['google-site-verification', site.verification.google],
    ['msvalidate.01', site.verification.bing],
    ['yandex-verification', site.verification.yandex],
  ] as const
)
  .filter(([, value]) => value)
  .map(([name, value]) => `<meta name="${name}" content="${esc(value)}" />`)
  .join('');

function render(page: Page): string {
  const url = absoluteUrl(page.path);
  const title = esc(page.title);
  const desc = esc(page.description);
  const robots = page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  let html = template;
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = setTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${desc}" />`);
  html = setTag(html, /<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${robots}" />`);
  html = setTag(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    page.canonical === false ? '' : `<link rel="canonical" href="${url}" />`,
  );
  html = setTag(html, /<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${page.ogType ?? 'website'}" />`);
  html = setTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`);
  html = setTag(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${desc}" />`);
  html = setTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  html = setTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`);
  html = setTag(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${desc}" />`);
  if (page.image) {
    const alt = esc(page.imageAlt ?? page.title);
    html = setTag(html, /<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${page.image}" />`);
    html = setTag(html, /<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${alt}" />`);
    html = setTag(html, /<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${page.image}" />`);
  }
  const schema = page.schema?.length
    ? jsonLd({ '@context': 'https://schema.org', '@graph': page.schema })
    : '';
  html = setTag(html, /<!--seo-jsonld-->/, verificationTags + schema);
  html = setTag(html, /<!--seo-body-->/, shell(page.body));
  return html;
}

function write(path: string, content: string) {
  const file = resolve(dist, `.${path}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

// ----------------------------------------------------------------- pages

const pages: Page[] = [];

// Home
const homeFaq = homeFaqs(games.length);

pages.push({
  path: '/',
  title: homeTitle(),
  description: site.description,
  body: `<section class="hero"><h1>${esc(site.heroTitle)}</h1><p>${esc(site.description)}</p><p><a class="btn btn-primary btn-lg" href="/games/">Browse ${games.length} free games</a></p></section>
<section><h2>Play free online games</h2><ul>${games.map(gameLink).join('')}</ul></section>
<section><h2>Game categories</h2><ul>${CATEGORIES.filter((c) => playableIn(c.id).length > 0)
    .map(
      (c) =>
        `<li><a href="${categoryPath(c.slug)}">${esc(categoryLabel(c))}</a> – ${esc(c.description)} (${playableIn(c.id).length} playable)</li>`,
    )
    .join('')}</ul></section>
<section><h2>Popular collections</h2>${collectionLinks(collections)}</section>
<section><h2>Play free online games – no download, no sign-up</h2><p>${esc(site.siteName)} has ${games.length} free online games that run straight in your web browser on a computer, tablet or phone. There is nothing to install and no account to create. Games start instantly, save your high scores and progress in your browser, and keep working offline once they have loaded.</p></section>
${faqHtml(homeFaq)}`,
  schema: [
    {
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
    },
    organization,
    {
      '@type': 'ItemList',
      name: 'Free online games',
      itemListElement: games.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absoluteUrl(gamePath(g.id)),
        name: g.title,
      })),
    },
    faqSchema(homeFaq),
  ],
  lastmod: newestOf(games),
});

// All games
pages.push({
  path: '/games/',
  title: withBrand('All Free Online Games'),
  description: `Browse all ${games.length} free online games on ${site.siteName}. Filter by category, difficulty and controls, then play instantly in your browser with no download.`,
  lastmod: newestOf(games),
  body: `${breadcrumbHtml([{ name: 'Home', path: '/' }, { name: 'All games', path: '/games/' }])}
<h1>All free online games</h1>
<p>${games.length} games you can play right now in your browser, with ${planned.length} more on the way.</p>
<section><h2>Collections</h2>${collectionLinks(collections)}</section>
${CATEGORIES.filter((c) => playableIn(c.id).length > 0)
  .map(
    (c) =>
      `<section><h2><a href="${categoryPath(c.slug)}">${esc(categoryLabel(c))}</a></h2><ul>${playableIn(c.id).map(gameLink).join('')}</ul></section>`,
  )
  .join('')}`,
  schema: [
    organization,
    breadcrumbs([
      { name: 'Home', path: '/' },
      { name: 'All games', path: '/games/' },
    ]),
    {
      '@type': 'CollectionPage',
      name: 'All free online games',
      url: absoluteUrl('/games/'),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: games.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: absoluteUrl(gamePath(g.id)),
          name: g.title,
        })),
      },
    },
  ],
});

// Categories index
pages.push({
  path: '/categories/',
  title: withBrand('Game Categories'),
  description:
    'Browse free online games by category: arcade, puzzle, word, board, card, sports, casual and brain games. Every game plays instantly in your browser.',
  body: `${breadcrumbHtml([{ name: 'Home', path: '/' }, { name: 'Categories', path: '/categories/' }])}
<h1>Game categories</h1>
<ul>${CATEGORIES.map((c) => {
    const n = playableIn(c.id).length;
    const label = n > 0 ? `${n} playable` : 'coming soon';
    return `<li><a href="${categoryPath(c.slug)}">${esc(categoryLabel(c))}</a> – ${esc(c.description)} (${label})</li>`;
  }).join('')}</ul>
<section><h2>Popular collections</h2>${collectionLinks(collections)}</section>`,
  lastmod: newestOf(games),
  schema: [
    organization,
    breadcrumbs([
      { name: 'Home', path: '/' },
      { name: 'Categories', path: '/categories/' },
    ]),
  ],
});

// Each category
for (const c of CATEGORIES) {
  const inCat = playableIn(c.id);
  const upcoming = planned.filter((g) => g.category === c.id);
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Categories', path: '/categories/' },
    { name: categoryLabel(c), path: categoryPath(c.slug) },
  ];
  const catFaqs = inCat.length ? categoryFaqs(c, inCat) : [];
  pages.push({
    path: categoryPath(c.slug),
    title: categoryTitle(c.name),
    description: categoryDescription(c.name, c.description, inCat.length),
    noindex: inCat.length === 0,
    body: `${breadcrumbHtml(crumbs)}
<h1>${esc(categoryLabel(c))}</h1>
${inCat.length ? paragraphs(categoryIntro(c)) : `<p>${esc(c.description)}</p>`}
${inCat.length ? `<section><h2>Play ${esc(categoryLabel(c).toLowerCase())} free</h2><ul>${inCat.map(gameLink).join('')}</ul></section>` : ''}
${catFaqs.length ? faqHtml(catFaqs) : ''}
${upcoming.length ? `<section><h2>Coming soon</h2>${list(upcoming.map((g) => g.title))}</section>` : ''}`,
    lastmod: newestOf(inCat),
    image: shareImage('categories', c.slug),
    imageAlt: `${categoryLabel(c)} on ${site.siteName}`,
    schema: [
      organization,
      breadcrumbs(crumbs),
      {
        '@type': 'CollectionPage',
        name: categoryLabel(c),
        url: absoluteUrl(categoryPath(c.slug)),
        description: c.description,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: inCat.map((g, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: absoluteUrl(gamePath(g.id)),
            name: g.title,
          })),
        },
      },
      ...(catFaqs.length ? [faqSchema(catFaqs)] : []),
    ],
  });
}

// Each collection
for (const col of collections) {
  const inCol = collectionGames(col, games);
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'All games', path: '/games/' },
    { name: col.name, path: collectionPath(col.slug) },
  ];
  pages.push({
    path: collectionPath(col.slug),
    title: collectionTitle(col.title),
    description: collectionDescription(col, inCol.length),
    lastmod: newestOf(inCol),
    image: shareImage('collections', col.slug),
    imageAlt: `${col.name} on ${site.siteName}`,
    body: `${breadcrumbHtml(crumbs)}
<h1>${esc(col.heading)}</h1>
${paragraphs(col.intro)}
<section><h2>${inCol.length} free ${esc(col.name.toLowerCase())}</h2><ul>${inCol.map(gameLink).join('')}</ul></section>
${faqHtml(col.faqs)}
<section><h2>More collections</h2>${collectionLinks(collections.filter((o) => o.slug !== col.slug))}</section>`,
    schema: [
      organization,
      breadcrumbs(crumbs),
      {
        '@type': 'CollectionPage',
        name: col.heading,
        url: absoluteUrl(collectionPath(col.slug)),
        description: collectionDescription(col, inCol.length),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: inCol.length,
          itemListElement: inCol.map((g, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: absoluteUrl(gamePath(g.id)),
            name: g.title,
          })),
        },
      },
      faqSchema(col.faqs),
    ],
  });
}

// Each game
for (const g of games) {
  const cat = categoryOf(g);
  const related = games.filter((o) => o.category === g.category && o.id !== g.id).slice(0, 6);
  const fill = related.length < 4 ? games.filter((o) => o.category !== g.category).slice(0, 4 - related.length) : [];
  const faqs = gameFaqs(g);
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: categoryLabel(cat), path: categoryPath(cat.slug) },
    { name: g.title, path: gamePath(g.id) },
  ];
  const ins = g.instructions;
  const controls = [
    g.controls.keyboard?.length ? `<h3>Keyboard</h3>${list(g.controls.keyboard)}` : '',
    g.controls.mouse?.length ? `<h3>Mouse</h3>${list(g.controls.mouse)}` : '',
    g.controls.touch?.length ? `<h3>Touch</h3>${list(g.controls.touch)}` : '',
  ].join('');
  const players = playersLabel(g);
  const gameImage = shareImage('games', g.id);
  const gameCollections = collectionsForGame(g, games);

  pages.push({
    path: gamePath(g.id),
    title: gameTitle(g),
    description: gameDescription(g),
    ogType: 'website',
    body: `${breadcrumbHtml(crumbs)}
<article class="stack">
<h1>${esc(g.title)}</h1>
<p><strong>Play ${esc(g.title)} free online.</strong> ${esc(g.shortDescription)}</p>
<p>${esc(g.fullDescription)}</p>
<ul><li>Category: <a href="${categoryPath(cat.slug)}">${esc(cat.name)}</a></li><li>Difficulty: ${esc(g.difficulty)}</li><li>Players: ${players}</li><li>Typical game: about ${g.estimatedMinutes} minutes</li><li>Works on: desktop${g.supportsTouch ? ', phones and tablets' : ''}</li></ul>
<section><h2>How to play ${esc(g.title)}</h2><p><strong>Objective:</strong> ${esc(ins.objective)}</p><ol>${ins.howToPlay.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
${ins.scoring ? `<h3>Scoring</h3><p>${esc(ins.scoring)}</p>` : ''}
${ins.difficultyNotes ? `<h3>Difficulty levels</h3><p>${esc(ins.difficultyNotes)}</p>` : ''}
${ins.tips?.length ? `<h3>Tips</h3>${list(ins.tips)}` : ''}</section>
${controls ? `<section><h2>Controls</h2>${controls}</section>` : ''}
${g.achievements?.length ? `<section><h2>${esc(g.title)} achievements</h2><ul>${g.achievements.map((a) => `<li><strong>${esc(a.name)}</strong> – ${esc(a.description)}</li>`).join('')}</ul></section>` : ''}
${faqHtml(faqs)}
<section><h2>More games like ${esc(g.title)}</h2><ul>${[...related, ...fill].map(gameLink).join('')}</ul>${gameCollections.length ? collectionLinks(gameCollections) : ''}</section>
</article>`,
    lastmod: gameDate.get(g.id),
    image: gameImage,
    imageAlt: `${g.title} – play free online on ${site.siteName}`,
    schema: [
      organization,
      breadcrumbs(crumbs),
      {
        '@type': 'VideoGame',
        '@id': `${absoluteUrl(gamePath(g.id))}#game`,
        name: g.title,
        url: absoluteUrl(gamePath(g.id)),
        description: g.fullDescription,
        image: gameImage ?? ogImage,
        genre: [cat.name, ...g.tags.slice(0, 3)],
        keywords: g.tags.join(', '),
        gamePlatform: ['Web browser', 'Mobile web browser'],
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        playMode: isTwoPlayer(g) ? ['SinglePlayer', 'MultiPlayer'] : 'SinglePlayer',
        numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: isTwoPlayer(g) ? 2 : 1 },
        dateModified: gameDate.get(g.id),
        potentialAction: { '@type': 'PlayAction', target: absoluteUrl(gamePath(g.id)) },
        inLanguage: 'en',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
        publisher: { '@id': organization['@id'] },
        author: { '@id': organization['@id'] },
      },
      faqSchema(faqs),
    ],
  });
}

// Static info pages
pages.push({
  path: '/about/',
  title: withBrand('About'),
  description: `${site.siteName} is a free online games website. Every game is original, runs entirely in your browser and works on desktop, mobile and offline.`,
  body: `<h1>About ${esc(site.siteName)}</h1>
<p>${esc(site.siteName)} is a collection of free games that run entirely in your web browser. There is nothing to download and no account to create.</p>
<p>All games, graphics and sounds are original. Games that need an opponent use a computer player that runs on your own device, and several games support two players on the same screen.</p>
<p>The site works on phones, tablets and computers, and it can be installed as an app that keeps working offline.</p>
<p><a href="/games/">Browse all games</a> · <a href="/privacy/">Privacy</a></p>`,
  schema: [organization],
  lastmod: latest(fileDates.get('src/pages/AboutPage.tsx'), seoDate),
});

pages.push({
  path: '/privacy/',
  title: withBrand('Privacy'),
  description: `How ${site.siteName} stores your data: game progress, scores, achievements and preferences stay in your own browser. No account is required.`,
  body: `<h1>Privacy</h1>
<p>Game progress, scores, achievements and preferences are stored locally in your browser. This website does not require an account.</p>
<p>This site uses Google Analytics to count visits and popular games. Analytics cookies are set only if you choose Allow; choosing No thanks turns reporting off. You can change this in Settings.</p>
<p>Clearing your browser or site storage may remove scores, progress, achievements, coins and preferences. Use Export Save Data in Settings to keep a backup.</p>`,
  schema: [organization],
  lastmod: latest(fileDates.get('src/pages/PrivacyPage.tsx'), seoDate),
});

// Personal pages: must load directly, but stay out of search results.
for (const [path, name] of [
  ['/favorites/', 'Favorites'],
  ['/achievements/', 'Achievements'],
  ['/statistics/', 'Statistics'],
  ['/settings/', 'Settings'],
] as const) {
  pages.push({
    path,
    title: withBrand(name),
    description: `Your ${name.toLowerCase()} on ${site.siteName}, stored locally in your browser.`,
    noindex: true,
    body: `<h1>${name}</h1><p>Your ${name.toLowerCase()} are stored in this browser. <a href="/games/">Browse games</a>.</p>`,
  });
}

// ----------------------------------------------------------------- write

for (const page of pages) {
  write(page.path === '/' ? '/index.html' : `${page.path}index.html`, render(page));
}

// GitHub Pages serves 404.html (with a 404 status) for unknown paths; the SPA
// then renders the route, e.g. a planned game or the not-found page.
write(
  '/404.html',
  render({
    path: '/404/',
    title: withBrand('Page not found'),
    description: site.description,
    noindex: true,
    canonical: false,
    body: `<h1>Page not found</h1><p>That page does not exist. <a href="/games/">Browse all games</a>.</p>`,
  }),
);

const indexable = pages.filter((p) => !p.noindex);
write(
  '/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${indexable
  .map(
    (p) =>
      `  <url><loc>${absoluteUrl(p.path)}</loc><lastmod>${p.lastmod ?? today}</lastmod>${
        p.image ? `<image:image><image:loc>${p.image}</image:loc></image:image>` : ''
      }</url>`,
  )
  .join('\n')}
</urlset>
`,
);

// Search engines and AI crawlers are explicitly welcome.
const aiAgents = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
  'meta-externalagent',
  'DuckAssistBot',
  'MistralAI-User',
  'Googlebot',
  'GoogleOther',
  'Applebot',
  'Amazonbot',
  'YandexBot',
  'DuckDuckBot',
  'cohere-ai',
];
write(
  '/robots.txt',
  `User-agent: *
Allow: /

${aiAgents.map((a) => `User-agent: ${a}`).join('\n')}
Allow: /

Sitemap: ${site.siteUrl}/sitemap.xml
`,
);

// llms.txt: a plain-language map of the site for AI assistants (llmstxt.org).
const about = `${site.siteName} (${site.siteUrl}) is a free online games website with ${games.length} games. Every game runs in the web browser with no download, no account and no purchases. Games work on desktop and mobile browsers and offline after the first visit. Scores, achievements and saved games are stored only in the player's own browser. All games, graphics and sounds are original. Board games include a computer opponent with Easy, Normal and Hard levels, and many have a two-player mode on one device.`;

write(
  '/llms.txt',
  `# ${site.siteName}

> ${site.description}

${about}

A longer version with rules and controls for every game is at ${site.siteUrl}/llms-full.txt.

## Games

${games.map((g) => `- [${g.title}](${absoluteUrl(gamePath(g.id))}): ${g.shortDescription} Category: ${categoryOf(g).name}. Players: ${playersLabel(g)}. Difficulty: ${g.difficulty}.`).join('\n')}

## Categories

${CATEGORIES.filter((c) => playableIn(c.id).length > 0)
  .map((c) => `- [${categoryLabel(c)}](${absoluteUrl(categoryPath(c.slug))}): ${c.description}`)
  .join('\n')}

## Collections

${collections
  .map((c) => `- [${c.name}](${absoluteUrl(collectionPath(c.slug))}): ${collectionDescription(c, collectionGames(c, games).length)}`)
  .join('\n')}

## Pages

- [All games](${site.siteUrl}/games/): The full catalog with search and filters.
- [About](${site.siteUrl}/about/): What ${site.siteName} is.
- [Privacy](${site.siteUrl}/privacy/): All player data stays in the browser.
`,
);

// llms-full.txt: every game's rules and controls in one plain-text file, so an
// assistant can answer "how do I play X" or "where can I play X online" from a
// single fetch.
function gameMarkdown(g: GameDefinition): string {
  const ins = g.instructions;
  const controls = [
    g.controls.keyboard?.length ? `Keyboard: ${g.controls.keyboard.join('; ')}.` : '',
    g.controls.mouse?.length ? `Mouse: ${g.controls.mouse.join('; ')}.` : '',
    g.controls.touch?.length ? `Touch: ${g.controls.touch.join('; ')}.` : '',
  ].filter(Boolean);
  return [
    `### ${g.title}`,
    '',
    `Play free: ${absoluteUrl(gamePath(g.id))}`,
    `Category: ${categoryOf(g).name}. Players: ${playersLabel(g)}. Difficulty: ${g.difficulty}. Typical game: about ${g.estimatedMinutes} minutes. Works on: desktop${g.supportsTouch ? ', phones and tablets' : ''}.`,
    '',
    g.fullDescription,
    '',
    `Objective: ${ins.objective}`,
    '',
    'How to play:',
    ...ins.howToPlay.map((step, i) => `${i + 1}. ${step}`),
    ...(ins.scoring ? ['', `Scoring: ${ins.scoring}`] : []),
    ...(ins.difficultyNotes ? ['', `Difficulty levels: ${ins.difficultyNotes}`] : []),
    ...(controls.length ? ['', 'Controls:', ...controls.map((c) => `- ${c}`)] : []),
    ...(ins.tips?.length ? ['', 'Tips:', ...ins.tips.map((t) => `- ${t}`)] : []),
  ].join('\n');
}

write(
  '/llms-full.txt',
  `# ${site.siteName} – full game guide

> ${site.description}

${about}

${homeFaq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}

${CATEGORIES.filter((c) => playableIn(c.id).length > 0)
  .map((c) => `## ${categoryLabel(c)}\n\n${categoryIntro(c).join('\n\n')}\n\n${playableIn(c.id).map(gameMarkdown).join('\n\n')}`)
  .join('\n\n')}
`,
);

// IndexNow ownership proof: https://www.indexnow.org/documentation
if (site.indexNowKey) write(`/${site.indexNowKey}.txt`, site.indexNowKey);

console.log(`prerender: ${pages.length} pages, ${indexable.length} in sitemap`);
