# SEO and AI-search guide

This file covers how GamesPlayLand is set up for search engines and AI assistants: what the code already does, and the steps that only the site owner can take.

## What the build does automatically

`npm run build` runs `scripts/prerender.ts` after Vite. For every public URL it writes a real HTML file. Crawlers that don't run JavaScript (most AI crawlers, social previews) get the full content. Google, which does run JavaScript, sees the same text in the React app.

| Page type | URL | Targets searches like |
| --- | --- | --- |
| Home | `/` | "play free online games", "free games no download" |
| Game (151) | `/games/<id>/` | "play chess online vs computer", "snake game", "sudoku online free" |
| Category (13) | `/categories/<slug>/` | "puzzle games", "card games online" |
| Collection (11) | `/collections/<slug>/` | "2 player games", "games against computer", "offline games", "mobile games", "games for kids", "math games", "solitaire games" |
| Topic hub (20) | `/collections/<slug>/` | "chess and checkers games", "memory games", "tower defense games", "ludo and carrom online" |

Every page gets:

- **A unique title** of 60 characters or less, and a meta description of 160 characters or less. Titles follow real query shapes: "Chess – Play Free vs Computer or 2 Player". Tests in `src/utils/seo.test.ts` enforce the lengths and uniqueness.
- **A canonical URL** (trailing slash), Open Graph and Twitter tags.
- **Its own share image** (1200×630) for every game, category and collection, in `public/og/`. Link previews on WhatsApp, X, Facebook, Discord and Slack show it, and the sitemap lists it for Google Images. Pages without one fall back to `/og-image.png`.
- **JSON-LD structured data**: `WebSite` + `SearchAction` (sitelinks search box), `Organization`, `BreadcrumbList`, `CollectionPage` + `ItemList`, `VideoGame` (with `PlayAction`, player counts and `dateModified`), and `FAQPage`.
- **A visible FAQ** that matches the FAQ structured data. Search engines ignore FAQ markup that is not shown on the page, so the React pages render the same questions from `src/seo/content.ts`.
- **Internal links** that build topical depth: see [Internal linking](#internal-linking).

Site-wide files:

- `sitemap.xml` lists all indexable pages. `lastmod` comes from the last git commit that touched each game, so search engines can trust it. CI checks out the full history for this reason.
- `robots.txt` allows all crawlers and names the major search and AI crawlers explicitly: Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot and others.
- `llms.txt` is a short map of the site for AI assistants ([llmstxt.org](https://llmstxt.org)).
- `llms-full.txt` holds the rules, controls and tips for every game in one file. An assistant can answer "how do I play X / where can I play X online" from a single fetch.
- `/<indexNowKey>.txt` proves ownership for **IndexNow**. After each deploy, the `indexnow` CI job submits recently changed URLs to Bing and Yandex. Bing's index also powers ChatGPT search, Copilot and DuckDuckGo.

Personal pages (`/favorites/`, `/settings/`, `/statistics/`, `/achievements/`), empty categories and planned games are `noindex`.

## Internal linking

The site is organised as pillars, hubs and games, so search engines see a few deep topics instead of many thin pages:

- **Pillars** are the 13 category pages. Each links to its topic hubs, its games and three related categories (`related` in `src/data/categories.ts`).
- **Topic hubs** are collections of `kind: 'cluster'`. Their games, parent category and related hubs live in `src/data/topicIndex.ts`; their page copy (title, description, intro, FAQ) lives in `src/data/clusters.ts`. A hub needs at least four playable games. A hub may list games from several categories: Chess and Checkers joins Chess (Board), Chess Puzzle (Puzzle) and Chess Tactics (Brain Games).
- **Ways to play** (2 player, vs computer, quick, kids…) stay `kind: 'intent'`. Mobile and Offline hold nearly every game, so they are `kind: 'feature'` and are never linked from game pages.
- **Game pages** show a breadcrumb through their hub (Games · Puzzle · Chess & Checkers · Chess Puzzle), a "Part of …" line, six related games, a "What games are like …?" FAQ with links, and their hubs and ways to play.
- **Related games** come from one index built for the whole catalog (`getRelatedGames` in `src/data/gameCatalog.ts`): hand-picked games first, then the game's hub, then its category, then two from other categories. Ties go to games with the fewest links, and a repair pass gives every game at least four inbound links. Topics with fewer than four games (cricket, typing, parking, football, snake) are listed in `src/data/smallTopics.ts` so their games always link to each other.
- **Links inside copy** use `[text](game:<id>)`, `[text](hub:<slug>)` and `[text](cat:<slug>)` in intros, descriptions and FAQ answers (`src/seo/links.ts`). Every game description ends with a sentence linking to a related game or hub. Pages render them as links, the prerenderer as `<a>`s, and structured data and share images get the plain text.
- **The home page and footer** link every category and the hubs in `FEATURED_TOPICS` (`src/data/topicIndex.ts`). Swap in the hubs that earn the most Search Console impressions.

`src/data/linking.test.ts` keeps this true: every game has at least four inbound related links, every hub has enough games and real related hubs, every link in copy points to a real, indexable page, and internal links end in `/` (the canonical form).

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

Then add the game's id to a hub in `src/data/topicIndex.ts` (see [Internal linking](#internal-linking)).

To add a ways-to-play collection, add an entry to `src/data/collections.ts` with its own intro and FAQ. To add a topic hub, add its games to `src/data/topicIndex.ts` and its copy to `src/data/clusters.ts`. Either goes live once at least four playable games match; run `npm run og-images` for its share image.
