# GamesPlayLand

Live at **https://gamesplayland.online**. (Earlier builds used the working name "Browser Arcade".)

A production-quality browser gaming portal. Every game runs entirely in the browser — no backend, no database, no accounts, no external APIs. The whole app deploys as a static site.

**Play instantly. No downloads.**

---

## Features

- **Large game catalog** organised into 13 categories, with search, filters and sorting.
- **No backend** — all persistence uses `localStorage` and IndexedDB in the visitor's browser.
- **Local player profile** with a nickname, no registration.
- **High scores, statistics and achievements** tracked per game and globally.
- **Saved progress** for games with progression, surfaced as "Continue Playing".
- **Daily challenge** derived deterministically from the calendar date — no server involved.
- **Coin system** (local, no real-world value) that unlocks cosmetic extras.
- **Export / import save data** as a validated JSON file, since there is no cloud backup.
- **PWA**: installable, offline-capable after first load.
- **Responsive** from 320 px phones to large monitors, with touch controls where relevant.
- **Themes**: dark, light and system, plus a reduced-motion mode.
- **Accessible** navigation: keyboard support, ARIA labelling, visible focus, skip link.

---

## Technology stack

| Concern | Choice |
| --- | --- |
| UI | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| Routing | React Router 6 with real paths, prerendered to static HTML per route |
| Rendering | DOM, Canvas 2D and SVG — no game engine dependency |
| Audio | Web Audio API, all effects synthesised at runtime |
| Storage | `localStorage` + IndexedDB |
| Offline | `vite-plugin-pwa` (Workbox) |
| Tests | Vitest + React Testing Library |

There is no backend of any kind: no Node server, no PHP, no Firebase, Supabase, Mongo, MySQL or Postgres, no auth server and no third-party game API.

---

## Architecture

```
src/
  app/            App shell, router, theme and toast providers
  components/     Reusable UI (cards, search, error boundary)
    game/         GameShell — the runtime every game plugs into
  layouts/        Site chrome (header, footer, drawer)
  pages/          Route components
  games/          One self-contained folder per game
    registry.ts   The single place a finished game is registered
  game-engine/    Shared game SDK: loop, input, particles, shell context
  hooks/          Cross-cutting React hooks
  services/       Audio, daily challenge
  storage/        localStorage, IndexedDB and the StorageService abstraction
  achievements/   Achievement registry and evaluation
  data/           Game catalog, categories, planned games
  utils/          Random/seeding, geometry and collision, formatting
  types/          Shared TypeScript types
  styles/         Design tokens and global CSS
  config/         Site branding and data version
```

### Key ideas

- **`GameDefinition`** is the contract every game satisfies: metadata, controls, instructions, achievements and a lazily imported component.
- **`GameShell`** owns everything that is not gameplay: toolbar, pause/resume, fullscreen, session timing, statistics recording, the result screen and the error boundary. Games talk to it through `useGameShell()`.
- **`StorageService`** is the only module that knows whether data lives in `localStorage` or IndexedDB. Games never touch either directly.
- **Game loops** use `requestAnimationFrame` and stop completely when paused or when the tab is hidden. High-frequency state lives in refs and engine objects, never React state.

---

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm run preview
```

## Testing

```bash
npm test
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## Static deployment

The build output in `dist/` is a plain static site served from the domain root (`base: '/'`).

`npm run build` runs `scripts/prerender.ts` after Vite. It writes a real HTML file for every public route (`/games/snake/index.html`, `/categories/puzzle/index.html`, …). Each file has its own title, description, canonical URL, Open Graph tags, JSON-LD and readable content for crawlers. The script also writes `sitemap.xml`, `robots.txt`, `llms.txt` and a `404.html` SPA fallback. Any host that serves `404.html` for unknown paths needs no rewrite rules. Old `/#/…` links are redirected to real paths on load.

The canonical origin lives in `src/config/site.ts` (`siteUrl`). Change it there if the domain changes, and update `public/CNAME`.

### GitHub Pages

`.github/workflows/deploy.yml` lints, tests, builds and deploys on every push. `public/CNAME` sets the custom domain. In the repository settings, Pages must use **GitHub Actions** as its source.

### Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`

### Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Any other static host works the same way: upload the contents of `dist/`. On Netlify, Cloudflare Pages and Vercel, set the 404 page to `404.html` if it is not picked up automatically.

---

## Data storage

### localStorage

Used for small, frequently read values:

| Key | Contents |
| --- | --- |
| `browserArcade.profile` | Local player profile |
| `browserArcade.preferences` | Sound, theme, difficulty, accessibility |
| `browserArcade.favorites` | Favorited game ids |
| `browserArcade.recentGames` | Recently played list |
| `browserArcade.lastGame` | Last opened game |
| `browserArcade.dailyChallenge` | Today's challenge state |
| `browserArcade.dataVersion` | Schema version for migrations |

### IndexedDB

Database `BrowserArcadeDB`, opened with versioned migrations. Object stores:

`profiles`, `gameProgress`, `highScores`, `scoreHistory`, `achievements`, `statistics`, `gameSettings`, `savedGames`, `replays`, `activityHistory`.

If IndexedDB is unavailable (private browsing, disabled storage, quota exceeded) the app degrades gracefully: it warns in Settings and keeps working without persistence rather than crashing.

### Migrations

`CURRENT_DATA_VERSION` in `src/config/site.ts` is stamped into storage. `runMigrations()` runs at startup and upgrades old data in place. Player data is never silently destroyed.

---

## Offline / PWA behaviour

`vite-plugin-pwa` generates a service worker that precaches the application shell and every built asset. Games are code-split, so a game becomes available offline once you have opened it at least once. There are no runtime network calls.

---

## Data export / import

Settings → **Export save data** downloads a JSON bundle containing the profile, preferences, favorites, high scores, score history, achievements, statistics, progress, saved games and coins, stamped with a `dataVersion` and export timestamp.

**Import save data** validates the file before writing anything:

- it must be a JSON object with a numeric `dataVersion`,
- a version newer than the app supports is rejected,
- every record is checked field by field and unknown keys are dropped,
- nothing from the file is ever executed.

---

## Adding a new game

Everything a game needs lives in its own folder. You should not have to edit unrelated files.

1. **Create the folder** `src/games/<game-id>/` containing:

   ```
   MyGame.tsx        React component (default export)
   engine.ts         Pure game logic, no React
   config.ts         Constants and difficulty tuning
   definition.ts     The GameDefinition
   achievements.ts   Game-specific achievements
   instructions.ts   How to play / controls / tips
   engine.test.ts    Rule tests
   ```

2. **Implement `GameDefinition`** in `definition.ts`:

   ```ts
   import { lazy } from 'react';
   import type { GameDefinition } from '@/types';
   import { achievements } from './achievements';
   import { instructions } from './instructions';

   export const myGame: GameDefinition = {
     id: 'my-game',
     title: 'My Game',
     shortDescription: '…',
     fullDescription: '…',
     category: 'arcade',
     difficulty: 'medium',
     tags: ['arcade', 'reflex'],
     icon: '🎮',
     controls: { keyboard: ['Arrow keys to move'], touch: ['Swipe to move'] },
     supportsTouch: true,
     supportsKeyboard: true,
     multiplayer: 'single',
     estimatedMinutes: 3,
     hasHighScore: true,
     hasAchievements: true,
     status: 'available',
     instructions,
     achievements,
     component: lazy(() => import('./MyGame')),
   };
   ```

3. **Register it** in `src/games/registry.ts` — one import, one array entry. A planned catalog entry with the same id is superseded automatically.

4. **Use the shared APIs** from inside the component:

   ```tsx
   const shell = useGameShell();
   shell.startRound();
   shell.endRound({ score, won: true });
   ```

   and `saveProgress` / `loadProgress` from `StorageService` for progression.

5. **Add tests** for the rules — win/loss detection, board validation, AI move legality.

6. **Add achievements** in `achievements.ts`; they are picked up by the achievement registry automatically.

---

## Copyright

Some games are inspired by classic arcade mechanics, but every name, graphic, sound, level layout and piece of code here is original. No copyrighted assets, characters or branding are used. Casino-style games are simulations using virtual points only — there is no gambling and no purchasing.

---

## Privacy

Game progress, scores, achievements and preferences are stored locally in your browser. This website does not require an account, and game data is never sent anywhere. The live site uses Google Analytics (measurement ID in `src/config/site.ts`, tag in `index.html`) with Consent Mode: analytics cookies are set only after the visitor clicks Allow, and "No thanks" (or Settings → Privacy) turns reporting off entirely. Analytics only reports on the production hostname, never from local development. See the in-app Privacy page.

Clearing browser or site storage will delete your data — export a backup first.
