export const site = {
  siteName: 'GamesPlayLand',
  /** Production origin, no trailing slash. Used for canonical URLs and the sitemap. */
  siteUrl: 'https://gamesplayland.online',
  tagline: 'Play instantly. No downloads.',
  /** Home page H1 — keeps the tagline but leads with what people search for. */
  heroTitle: 'Play free online games instantly. No downloads.',
  description:
    'Play free online games in your browser: puzzle, arcade, card, board, word and sports games. No downloads, no sign-up, and they work on mobile and offline.',
  /** Social share image, relative to the site root. */
  ogImage: '/og-image.png',
  // Storage keys keep the original prefix so existing players keep their data.
  storagePrefix: 'browserArcade',
  dbName: 'BrowserArcadeDB',
  dbVersion: 1,
  repositoryUrl: '',
  /**
   * Search engine ownership tokens. Paste the content value of each
   * verification meta tag here; empty values are left out of the page.
   */
  verification: {
    google: '',
    bing: '',
    yandex: '',
  },
  /**
   * IndexNow key (Bing, Yandex, Seznam, Naver – Bing results also feed ChatGPT
   * search and Copilot). The build publishes /<key>.txt to prove ownership.
   */
  indexNowKey: 'ad2a080a448bb330f00359072e697d17',
  /** Google Analytics 4 measurement ID. The tag itself lives in index.html. */
  gaMeasurementId: 'G-9Z9RT2YH5X',
  theme: {
    defaultTheme: 'system' as const,
    brand: '#6366f1',
  },
} as const;

export const CURRENT_DATA_VERSION = 1;
