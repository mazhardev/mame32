export const site = {
  siteName: 'Browser Arcade',
  tagline: 'Play instantly. No downloads.',
  description:
    'Classic, puzzle, arcade, strategy and casual games that run directly in your browser.',
  storagePrefix: 'browserArcade',
  dbName: 'BrowserArcadeDB',
  dbVersion: 1,
  repositoryUrl: '',
  theme: {
    defaultTheme: 'system' as const,
    brand: '#6366f1',
  },
} as const;

export const CURRENT_DATA_VERSION = 1;
