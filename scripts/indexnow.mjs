/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver) which pages
 * changed, so they recrawl within minutes instead of days. Bing's index also
 * powers ChatGPT search, Copilot and DuckDuckGo results.
 *
 * Runs in CI after a deploy: reads the live sitemap, submits pages whose
 * lastmod is recent, and exits 0 on any failure so a deploy never fails
 * because a search engine was unreachable.
 *
 *   node scripts/indexnow.mjs            # pages changed in the last 2 days
 *   node scripts/indexnow.mjs --all      # every page in the sitemap
 */
import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('../src/config/site.ts', import.meta.url), 'utf8');
const siteUrl = /siteUrl:\s*'([^']+)'/.exec(config)?.[1];
const key = /indexNowKey:\s*'([^']*)'/.exec(config)?.[1];
const all = process.argv.includes('--all');

async function main() {
  if (!siteUrl || !key) {
    console.log('indexnow: no siteUrl or indexNowKey in src/config/site.ts; skipping');
    return;
  }
  const keyLocation = `${siteUrl}/${key}.txt`;
  const keyRes = await fetch(keyLocation);
  if (!keyRes.ok || (await keyRes.text()).trim() !== key) {
    console.log(`indexnow: ${keyLocation} is not live yet; skipping`);
    return;
  }

  const sitemap = await (await fetch(`${siteUrl}/sitemap.xml`)).text();
  const cutoff = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)]
    .filter(([, , lastmod]) => all || !lastmod || lastmod >= cutoff)
    .map(([, loc]) => loc);
  if (urls.length === 0) {
    console.log('indexnow: no recently changed pages');
    return;
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(siteUrl).host, key, keyLocation, urlList: urls.slice(0, 10_000) }),
  });
  console.log(`indexnow: submitted ${urls.length} URLs, HTTP ${res.status}`);
}

main().catch((err) => console.log(`indexnow: ${err instanceof Error ? err.message : err}`));
