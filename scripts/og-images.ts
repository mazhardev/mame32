/**
 * Renders a 1200×630 share image for every game, category and collection into
 * public/og/. Social networks, chat apps and search results show these when a
 * page is shared or listed; a page without one falls back to /og-image.png.
 *
 * This is a development-time step (it needs a local Chromium), not part of
 * `npm run build`. Re-run it after adding games and commit the images:
 *
 *   npm run og-images            # only missing images
 *   npm run og-images -- --force # regenerate everything
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { site } from '../src/config/site';
import { GAME_REGISTRY } from '../src/games/registry';
import { CATEGORIES, getCategory } from '../src/data/categories';
import { activeCollections, collectionGames } from '../src/data/collections';
import { categoryLabel, playersLabel } from '../src/seo/content';
import { ogImagePath } from '../src/utils/seo';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

interface Card {
  file: string;
  icon: string;
  eyebrow: string;
  title: string;
  text: string;
  chips: string[];
  accent: string;
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function html(card: Card): string {
  const titleSize = card.title.length > 22 ? 64 : card.title.length > 14 ? 76 : 88;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;font-family:'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif;background:#0b0d14;color:#fff;overflow:hidden}
.bg{position:absolute;inset:0;background:${card.accent};opacity:.92}
.shade{position:absolute;inset:0;background:linear-gradient(100deg,rgba(11,13,20,.82) 0%,rgba(11,13,20,.55) 58%,rgba(11,13,20,.15) 100%)}
.wrap{position:relative;display:flex;height:100%;padding:64px 72px;gap:56px;align-items:center}
.main{flex:1;display:flex;flex-direction:column;gap:22px;min-width:0}
.eyebrow{font-size:26px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.85}
h1{font-size:${titleSize}px;line-height:1.02;font-weight:800;letter-spacing:-.02em}
p{font-size:30px;line-height:1.35;opacity:.92;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;gap:12px;flex-wrap:wrap}
.chip{font-size:22px;font-weight:600;padding:8px 18px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28)}
.tile{width:320px;height:320px;flex:none;border-radius:64px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.3);display:grid;place-items:center;font-size:190px;box-shadow:0 30px 60px rgba(0,0,0,.35);font-family:'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji',sans-serif}
.brand{position:absolute;left:72px;bottom:44px;display:flex;align-items:center;gap:14px;font-size:28px;font-weight:700}
.brand small{font-weight:500;opacity:.8;font-size:24px}
.mark{width:44px;height:44px;border-radius:12px;background:#6366f1;display:grid;place-items:center;font-size:26px;font-family:'Noto Color Emoji',sans-serif}
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="wrap"><div class="main">
<div class="eyebrow">${esc(card.eyebrow)}</div>
<h1>${esc(card.title)}</h1>
<p>${esc(card.text)}</p>
<div class="chips">${card.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
</div><div class="tile">${esc(card.icon)}</div></div>
<div class="brand"><span class="mark">🕹</span>${esc(site.siteName)} <small>· Play free online, no download</small></div>
</body></html>`;
}

const cards: Card[] = [];

for (const g of GAME_REGISTRY) {
  const cat = getCategory(g.category);
  cards.push({
    file: ogImagePath('games', g.id),
    icon: g.icon,
    eyebrow: `${categoryLabel(cat)} · Free online`,
    title: g.title,
    text: g.shortDescription,
    chips: [
      playersLabel(g).replace(' on one device', '').replace(', or ', ' / '),
      g.supportsTouch ? 'Desktop & mobile' : 'Desktop',
      `~${g.estimatedMinutes} min`,
    ],
    accent: g.accent ?? cat.accent,
  });
}

for (const c of CATEGORIES) {
  const count = GAME_REGISTRY.filter((g) => g.category === c.id).length;
  if (count === 0) continue;
  cards.push({
    file: ogImagePath('categories', c.slug),
    icon: c.icon,
    eyebrow: 'Category',
    title: categoryLabel(c),
    text: c.description,
    chips: [`${count} free games`, 'No download', 'Works offline'],
    accent: c.accent,
  });
}

for (const col of activeCollections(GAME_REGISTRY)) {
  const count = collectionGames(col, GAME_REGISTRY).length;
  cards.push({
    file: ogImagePath('collections', col.slug),
    icon: col.icon,
    eyebrow: 'Collection',
    title: col.name,
    text: col.intro[0],
    chips: [`${count} free games`, 'No download', 'No sign-up'],
    accent: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
  });
}

const todo = cards.filter((c) => force || !existsSync(resolve(root, 'public', `.${c.file}`)));
if (todo.length === 0) {
  console.log('og-images: all images exist (use --force to regenerate)');
} else {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const card of todo) {
    const out = resolve(root, 'public', `.${card.file}`);
    mkdirSync(dirname(out), { recursive: true });
    await page.setContent(html(card), { waitUntil: 'load' });
    await page.screenshot({ path: out, type: 'jpeg', quality: 70 });
  }
  await browser.close();
  console.log(`og-images: wrote ${todo.length} of ${cards.length} images`);
}
