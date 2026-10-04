/**
 * Runs after `next build` (static export to out/): generates the offline
 * service worker. It precaches the app shell, scripts, styles and every
 * pre-rendered page, and caches the small route payloads Next.js fetches on
 * client-side navigation as they are used, so previously opened games keep
 * working offline.
 */
import { readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { generateSW } from 'workbox-build';

/**
 * Next.js names client navigation payloads like
 * `games/chess/__next.games.$d$gameId.__PAGE__.txt`. On Windows its static
 * export builds those names from OS paths and writes nested folders
 * (`__next.games\$d$gameId\__PAGE__.txt`) instead, which the browser never
 * requests. Flatten them so a local Windows build matches a Linux (CI) one.
 */
function flattenSegmentFolders(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (!entry.name.startsWith('__next.')) {
      flattenSegmentFolders(full);
      continue;
    }
    const files = [];
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else files.push(p);
      }
    };
    walk(full);
    for (const file of files) {
      const flat = `${entry.name}.${relative(full, file).split(sep).join('.')}`;
      renameSync(file, join(dir, flat));
    }
    if (statSync(full).isDirectory()) rmSync(full, { recursive: true, force: true });
  }
}

flattenSegmentFolders('out');

const { count, size, warnings } = await generateSW({
  globDirectory: 'out',
  swDest: 'out/sw.js',
  globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
  // Share images are for crawlers and link previews, not offline play.
  globIgnores: ['og/**', 'sw.js', 'workbox-*.js'],
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  // Pages are served as /path/ but stored as /path/index.html.
  directoryIndex: 'index.html',
  // Every page is static, so a query string (?q=…, ?_rsc=…, ?utm_…) never
  // changes the file: match the cached copy regardless.
  ignoreURLParametersMatching: [/.*/],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  // No navigateFallback: a page this worker has not precached (for example
  // one added by a newer deploy) must come from the network, not a 404.
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: { cacheName: 'pages', networkTimeoutSeconds: 4, expiration: { maxEntries: 100 } },
    },
    {
      urlPattern: ({ url }) => url.pathname.endsWith('.txt') && url.searchParams.has('_rsc'),
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-route-payloads', expiration: { maxEntries: 400 } },
    },
  ],
});

for (const w of warnings) console.warn(`service worker: ${w}`);
console.log(`service worker: precached ${count} files (${(size / 1024 / 1024).toFixed(1)} MB)`);
