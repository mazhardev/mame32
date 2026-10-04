# SEO and AI-search guide

This file covers how GamesPlayLand is set up for search engines and AI assistants: what the code already does, and the steps that only the site owner can take.

## What the build does automatically

The site is built with Next.js (App Router) as a static export. `npm run build` pre-renders every public URL to a real HTML file in `out/` that contains the complete page: headings, descriptions, how-to-play, controls, FAQs and links. Crawlers that don't run JavaScript (most AI crawlers, social previews) get exactly what visitors see, and browsers hydrate the same markup instead of replacing it. Per-page metadata comes from each route's `metadata` / `generateMetadata` (`src/seo/metadata.ts`), structured data from `src/seo/schema.ts`, and `sitemap.xml`, `robots.txt`, `llms.txt` and `llms-full.txt` from metadata routes and route handlers in `src/app/`.

| Page type | URL | Targets searches like |
| --- | --- | --- |
| Home | `/` | "play free online games", "free games no download" |
| Game (253) | `/games/<id>/` | "play chess online vs computer", "snake game", "sudoku online free" |
| Category (13) | `/categories/<slug>/` | "puzzle games", "card games online" |
| Collection (11) | `/collections/<slug>/` | "2 player games", "games against computer", "offline games", "mobile games", "games for kids", "math games", "solitaire games" |

Every page gets:

- **A unique title** of 60 characters or less, and a meta description of 160 characters or less. Titles follow real query shapes: "Chess – Play Free vs Computer or 2 Player". Tests in `src/utils/seo.test.ts` enforce the lengths and uniqueness.
- **A canonical URL** (trailing slash), Open Graph and Twitter tags.
- **Its own share image** (1200×630) for every game, category and collection, in `public/og/`. Link previews on WhatsApp, X, Facebook, Discord and Slack show it, and the sitemap lists it for Google Images. Pages without one fall back to `/og-image.png`.
- **JSON-LD structured data**: `WebSite` + `SearchAction` (sitelinks search box), `Organization`, `BreadcrumbList`, `CollectionPage` + `ItemList`, `VideoGame` (with `PlayAction`, player counts and `dateModified`), and `FAQPage`.
- **A visible FAQ** that matches the FAQ structured data. Search engines ignore FAQ markup that is not shown on the page, so the pages render the same questions from `src/seo/content.ts`.
- **Internal links** between related games, categories and collections, plus footer links to the main landing pages.

Site-wide files:

- `sitemap.xml` lists all indexable pages. `lastmod` comes from the last git commit that touched each game, so search engines can trust it. CI checks out the full history for this reason.
- `robots.txt` allows all crawlers and names the major search and AI crawlers explicitly: Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot and others.
- `llms.txt` is a short map of the site for AI assistants ([llmstxt.org](https://llmstxt.org)).
- `llms-full.txt` holds the rules, controls and tips for every game in one file. An assistant can answer "how do I play X / where can I play X online" from a single fetch.
- `/<indexNowKey>.txt` proves ownership for **IndexNow**. After each deploy, the `indexnow` CI job submits recently changed URLs to Bing and Yandex. Bing's index also powers ChatGPT search, Copilot and DuckDuckGo.

Personal pages (`/favorites/`, `/settings/`, `/statistics/`, `/achievements/`), empty categories and planned games are `noindex`.

## Steps only the site owner can do

These are not code changes, but they matter more than anything in the code.

1. **Google Search Console** – <https://search.google.com/search-console>
   - Add the domain property `gamesplayland.online`. DNS verification is best. To use the HTML-tag method instead, paste the token into `site.verification.google` in `src/config/site.ts` and deploy.
   - Submit `https://gamesplayland.online/sitemap.xml`.
   - Use **URL Inspection → Request indexing** for `/`, `/games/`, and the collection pages.
2. **Bing Webmaster Tools** – <https://www.bing.com/webmasters>
   - Use "Import from Google Search Console" (fastest) or verify with `site.verification.bing`.
   - Submit the sitemap. Bing feeds ChatGPT search, Copilot and DuckDuckGo, so this is the main route into AI answers.
3. **Yandex Webmaster** (optional) – verify with `site.verification.yandex`.
4. **Backlinks.** A new domain will not rank for "play games online" on structure alone: Poki, CrazyGames and others have years of links. Realistic sources:
   - Submit the site to web-game directories, PWA directories and GitHub "awesome" lists for browser and HTML5 games.
   - Post individual games where people ask for them: Reddit (r/WebGames, r/incremental_games, r/chess for the chess AI, r/sudoku), Hacker News "Show HN" (the no-backend, offline-PWA angle is a good story), Product Hunt.
   - Link the site from the GitHub repository's About field and README.
5. **Watch Search Console → Performance** after 2–4 weeks. Game and collection pages usually start ranking for long-tail searches ("connect four 2 player online", "mancala vs computer") long before the home page ranks for broad terms. Expand the collections that get impressions.

## Page speed

Lighthouse (mobile, local preview): home 97, game pages 95–97. SEO scores 100 and layout shift is 0. `.page` has `min-height: 100vh`, so the footer can't jump while a lazy page or game loads; without it, game pages had CLS 0.28 ("poor"). Keep that rule.

## Adding SEO for a new game

Run `npm run og-images` and commit the new image in `public/og/`. This needs a local Chromium, so it isn't part of `npm run build`. Without it, the game just uses the default share image. Nothing else is needed: when a game is registered in `src/games/registry.ts`, the build gives it a page, title, description, FAQ, structured data, sitemap entry, `llms.txt` lines and collection membership automatically. Good `shortDescription`, `fullDescription`, `instructions` and `tags` are what make the page rank, so write them for people, not for keywords.

To add a collection, add an entry to `src/data/collections.ts` with its own intro and FAQ. It goes live once at least four playable games match.
