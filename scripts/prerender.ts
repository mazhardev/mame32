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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/config/site';
import { GAME_REGISTRY } from '../src/games/registry';
import { CATEGORIES, getCategory } from '../src/data/categories';
import { PLANNED_GAMES } from '../src/data/plannedGames';
import type { GameDefinition } from '../src/types';
import {
  absoluteUrl,
  categoryDescription,
  categoryPath,
  categoryTitle,
  gameDescription,
  gamePath,
  gameTitle,
  homeTitle,
  withBrand,
} from '../src/utils/seo';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const template = readFileSync(resolve(dist, 'index.html'), 'utf8');
const today = new Date().toISOString().slice(0, 10);
const ogImage = `${site.siteUrl}${site.ogImage}`;

const games = [...GAME_REGISTRY].sort((a, b) => a.title.localeCompare(b.title));
const implementedIds = new Set(games.map((g) => g.id));
const planned = PLANNED_GAMES.filter((g) => !implementedIds.has(g.id));

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

const categoryOf = (g: GameDefinition) => getCategory(g.category);
const playableIn = (id: string) => games.filter((g) => g.category === id);

interface Faq {
  q: string;
  a: string;
}

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
<footer class="site-footer"><div class="container footer-grid"><div><strong>${esc(site.siteName)}</strong><div>${games.length} free games · everything runs in your browser.</div></div><nav class="footer-links" aria-label="Footer"><a href="/games/">All Games</a><a href="/categories/">Categories</a><a href="/privacy/">Privacy</a><a href="/about/">About</a></nav></div></footer>
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
}

function setTag(html: string, pattern: RegExp, replacement: string): string {
  if (!pattern.test(html)) throw new Error(`prerender: template is missing ${pattern}`);
  return html.replace(pattern, () => replacement);
}

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
  const schema = page.schema?.length
    ? jsonLd({ '@context': 'https://schema.org', '@graph': page.schema })
    : '';
  html = setTag(html, /<!--seo-jsonld-->/, schema);
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
const homeFaqs: Faq[] = [
  {
    q: `What is ${site.siteName}?`,
    a: `${site.siteName} is a free online games website. Every game runs directly in your web browser: puzzle games like Sudoku and Minesweeper, arcade classics like Snake, card games like Klondike Solitaire and Blackjack, board games like Connect Four and Tic-Tac-Toe, word games and sports games.`,
  },
  {
    q: 'Are the games free?',
    a: 'Yes. Every game is completely free to play. There are no purchases, and casino-style card games use virtual points only.',
  },
  {
    q: 'Do I need to download anything or create an account?',
    a: 'No. Games start instantly in your browser. There is no download, no installation and no sign-up.',
  },
  {
    q: 'Do the games work on phones and tablets?',
    a: 'Yes. The site works in mobile browsers, and games that need it have large touch controls. You can also play on desktop with a keyboard and mouse.',
  },
  {
    q: 'Can I play offline?',
    a: `Yes. ${site.siteName} can be installed as an app, and games you have already opened keep working without an internet connection.`,
  },
  {
    q: 'Where are my scores and progress saved?',
    a: 'High scores, achievements, statistics and saved games are stored locally in your own browser. Nothing is sent to a server. You can export a backup from Settings.',
  },
];

pages.push({
  path: '/',
  title: homeTitle(),
  description: site.description,
  body: `<section class="hero"><h1>${esc(site.heroTitle)}</h1><p>${esc(site.description)}</p><p><a class="btn btn-primary btn-lg" href="/games/">Browse ${games.length} free games</a></p></section>
<section><h2>Play free online games</h2><ul>${games.map(gameLink).join('')}</ul></section>
<section><h2>Game categories</h2><ul>${CATEGORIES.filter((c) => playableIn(c.id).length > 0)
    .map(
      (c) =>
        `<li><a href="${categoryPath(c.slug)}">${esc(c.name)} games</a> – ${esc(c.description)} (${playableIn(c.id).length} playable)</li>`,
    )
    .join('')}</ul></section>
${faqHtml(homeFaqs)}`,
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
    faqSchema(homeFaqs),
  ],
});

// All games
pages.push({
  path: '/games/',
  title: withBrand('All Free Online Games'),
  description: `Browse all ${games.length} free online games on ${site.siteName}. Filter by category, difficulty and controls, then play instantly in your browser with no download.`,
  body: `${breadcrumbHtml([{ name: 'Home', path: '/' }, { name: 'All games', path: '/games/' }])}
<h1>All free online games</h1>
<p>${games.length} games you can play right now in your browser, with ${planned.length} more on the way.</p>
${CATEGORIES.filter((c) => playableIn(c.id).length > 0)
  .map(
    (c) =>
      `<section><h2><a href="${categoryPath(c.slug)}">${esc(c.name)} games</a></h2><ul>${playableIn(c.id).map(gameLink).join('')}</ul></section>`,
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
    return `<li><a href="${categoryPath(c.slug)}">${esc(c.name)} games</a> – ${esc(c.description)} (${label})</li>`;
  }).join('')}</ul>`,
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
    { name: `${c.name} games`, path: categoryPath(c.slug) },
  ];
  pages.push({
    path: categoryPath(c.slug),
    title: categoryTitle(c.name),
    description: categoryDescription(c.name, c.description, inCat.length),
    noindex: inCat.length === 0,
    body: `${breadcrumbHtml(crumbs)}
<h1>${esc(c.name)} games</h1>
<p>${esc(c.description)}</p>
${inCat.length ? `<section><h2>Play ${esc(c.name.toLowerCase())} games free</h2><ul>${inCat.map(gameLink).join('')}</ul></section>` : ''}
${upcoming.length ? `<section><h2>Coming soon</h2>${list(upcoming.map((g) => g.title))}</section>` : ''}`,
    schema: [
      organization,
      breadcrumbs(crumbs),
      {
        '@type': 'CollectionPage',
        name: `${c.name} games`,
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
    ],
  });
}

// Each game
function gameFaqs(g: GameDefinition): Faq[] {
  const faqs: Faq[] = [
    {
      q: `Is ${g.title} free to play?`,
      a: `Yes. ${g.title} is completely free on ${site.siteName}, with no download, no sign-up and no purchases.`,
    },
    {
      q: `How do you play ${g.title}?`,
      a: `${g.instructions.objective} ${g.instructions.howToPlay.slice(0, 2).join(' ')}`,
    },
    {
      q: `Can I play ${g.title} on my phone?`,
      a: g.supportsTouch
        ? `Yes. ${g.title} works in mobile browsers on phones and tablets. ${(g.controls.touch ?? []).join('. ')}${g.controls.touch?.length ? '.' : ''}`.trim()
        : `${g.title} is best played on a computer with a keyboard.`,
    },
  ];
  if (g.multiplayer === 'vs-ai') {
    faqs.push({
      q: `Can I play ${g.title} against the computer?`,
      a: `Yes. You play against a computer opponent that runs entirely in your browser, and the difficulty setting changes how strong it is.`,
    });
  }
  if (g.multiplayer === 'local-multiplayer') {
    faqs.push({
      q: `Can two people play ${g.title}?`,
      a: `Yes. ${g.title} supports two players on the same device.`,
    });
  }
  faqs.push({
    q: `Does ${g.title} save my high score?`,
    a: `Yes. Your personal best, statistics and achievements for ${g.title} are saved in your browser automatically.`,
  });
  return faqs;
}

for (const g of games) {
  const cat = categoryOf(g);
  const related = games.filter((o) => o.category === g.category && o.id !== g.id).slice(0, 6);
  const fill = related.length < 4 ? games.filter((o) => o.category !== g.category).slice(0, 4 - related.length) : [];
  const faqs = gameFaqs(g);
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: `${cat.name} games`, path: categoryPath(cat.slug) },
    { name: g.title, path: gamePath(g.id) },
  ];
  const ins = g.instructions;
  const controls = [
    g.controls.keyboard?.length ? `<h3>Keyboard</h3>${list(g.controls.keyboard)}` : '',
    g.controls.mouse?.length ? `<h3>Mouse</h3>${list(g.controls.mouse)}` : '',
    g.controls.touch?.length ? `<h3>Touch</h3>${list(g.controls.touch)}` : '',
  ].join('');
  const players =
    g.multiplayer === 'vs-ai' ? '1 player vs computer' : g.multiplayer === 'local-multiplayer' ? '1–2 players' : '1 player';

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
<section><h2>More games like ${esc(g.title)}</h2><ul>${[...related, ...fill].map(gameLink).join('')}</ul></section>
</article>`,
    schema: [
      organization,
      breadcrumbs(crumbs),
      {
        '@type': 'VideoGame',
        '@id': `${absoluteUrl(gamePath(g.id))}#game`,
        name: g.title,
        url: absoluteUrl(gamePath(g.id)),
        description: g.fullDescription,
        image: ogImage,
        genre: [cat.name, ...g.tags.slice(0, 3)],
        keywords: g.tags.join(', '),
        gamePlatform: ['Web browser', 'Mobile web browser'],
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        playMode: g.multiplayer === 'local-multiplayer' ? ['SinglePlayer', 'MultiPlayer'] : 'SinglePlayer',
        inLanguage: 'en',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
        publisher: { '@id': organization['@id'] },
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${absoluteUrl(p.path)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
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
write(
  '/llms.txt',
  `# ${site.siteName}

> ${site.description}

${site.siteName} (${site.siteUrl}) is a free online games website. Every game runs in the web browser with no download, no account and no purchases. Games work on desktop and mobile browsers and offline after the first visit. Scores, achievements and saved games are stored only in the player's own browser. All games, graphics and sounds are original.

## Games

${games.map((g) => `- [${g.title}](${absoluteUrl(gamePath(g.id))}): ${g.shortDescription} Category: ${categoryOf(g).name}. Difficulty: ${g.difficulty}.`).join('\n')}

## Categories

${CATEGORIES.filter((c) => playableIn(c.id).length > 0)
  .map((c) => `- [${c.name} games](${absoluteUrl(categoryPath(c.slug))}): ${c.description}`)
  .join('\n')}

## Pages

- [All games](${site.siteUrl}/games/): The full catalog with search and filters.
- [About](${site.siteUrl}/about/): What ${site.siteName} is.
- [Privacy](${site.siteUrl}/privacy/): All player data stays in the browser.
`,
);

console.log(`prerender: ${pages.length} pages, ${indexable.length} in sitemap`);
