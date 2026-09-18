# Project Status

_Last updated: 2026-09-18_

## Summary

| Area | Status |
| --- | --- |
| Platform (Phase 1) | ✅ complete |
| Games playable | 20 of 253 catalogued |
| Current phase | Phase 3 — reach 50 games (Phase 2 complete) |

Games are only marked complete when they genuinely launch and play. Everything
else appears in the catalog as **Planned** and cannot be started.

## Work split

Two agents are working on this repository. See `COORDINATION.md` for the full
agreement and the running handoff log.

- **ChatGPT** owns gameplay: `src/games/<game-id>/**` and `src/games/registry.ts`.
- **Claude** owns the platform: pages, navigation, search, catalog presentation,
  themes, accessibility, global CSS, storage and save data, statistics, coins,
  daily challenges, the shared game SDK, `src/games/_shared/**`, PWA/offline,
  build tooling, and this document.

---

## Platform features

| Feature | Status |
| --- | --- |
| Vite + React + TypeScript (strict) project | ✅ |
| Routing (hash router for static hosting) | ✅ |
| Design system (CSS variables, dark/light/system) | ✅ |
| Home page (featured, recent, continue, popular, categories) | ✅ |
| All Games page (filters + sorting) | ✅ |
| Categories + per-category pages | ✅ |
| Instant client-side search | ✅ |
| Favorites | ✅ |
| Game detail page (instructions, controls, stats, achievements, related) | ✅ |
| Achievements page | ✅ |
| Statistics page | ✅ |
| Settings page (audio, gameplay, appearance, data, resets) | ✅ |
| Privacy + About pages | ✅ |
| localStorage layer with in-memory fallback | ✅ |
| IndexedDB service with versioned migrations | ✅ |
| StorageService abstraction | ✅ |
| Statistics tracking (per game + global) | ✅ |
| Achievement system (24 global + per-game) | ✅ |
| Coin system + cosmetics unlocking | ✅ |
| Daily challenge (deterministic, local) | ✅ |
| Export / import save data with validation | ✅ |
| Game SDK: GameShell, loop, input manager, particles, collision | ✅ |
| Shared card, word, board and sports utilities | ✅ |
| Responsive canvas with devicePixelRatio handling | ✅ |
| PWA (manifest, service worker, generated icons) | ✅ |
| Error boundary per game | ✅ |
| Storage-failure handling | ✅ |
| Reset options with confirmation | ✅ |
| Production build verified | ✅ |

### Tests

220 passing across 25 files: storage, seeded randomness, the game loop, the game shell and every registered game engine.

---

## Games

### Phase 2 — first 20 games

- [x] Snake
- [x] Tic-Tac-Toe
- [x] Connect Four
- [x] Number Merge 2048
- [x] Minesweeper
- [x] Sudoku
- [x] Block Drop
- [x] Pong
- [x] Brick Breaker
- [x] Memory Match
- [x] Hangman
- [x] Word Search
- [x] Klondike Solitaire
- [x] Blackjack
- [x] Basketball Shot
- [x] Penalty Shootout
- [x] Reaction Timer
- [x] Aim Trainer
- [x] Water Sort
- [x] Simon Memory

### Later phases

Phases 3–7 raise the playable count to 50, 100, 150, 200 and finally the whole
catalog. The full planned list lives in `src/data/plannedGames.ts` and is
rendered in the app under each category.

---

## Architecture decisions

1. **Hash routing.** `HashRouter` means deep links work on GitHub Pages,
   Cloudflare Pages, Netlify, Vercel and plain file hosting with no rewrite
   rules or 404 fallbacks.
2. **`base: './'`.** The build is path-independent, so it can be served from a
   sub-directory such as `user.github.io/repo/`.
3. **Registry supersedes planned entries.** `plannedGames.ts` lists the whole
   roadmap; `games/registry.ts` lists what is actually implemented. The catalog
   drops a planned entry as soon as a real game with that id is registered, so
   the two can never disagree.
4. **The shell owns lifecycle, games own gameplay.** `GameShell` handles pause,
   restart, fullscreen, session timing, statistics, achievements and the result
   screen. This keeps each game small and makes the behaviour consistent.
5. **No React state in game loops.** High-frequency values live in refs and
   engine objects; React renders menus, HUD and overlays only.
6. **Loops stop, not idle.** `GameLoop` cancels its animation frame when paused
   or when `visibilityState` is `hidden`, so nothing runs off-screen. A loop
   rebuilt by a resize inherits the current pause state.
7. **One funnel for played time.** `addPlayTime` is the only function that
   accumulates play time, for both the per-game record and the profile total.
   `recordGameComplete` stores its `durationMs` on the score-history entry only,
   so a shell that reports both cannot double-count.
8. **Serialised statistics writes.** Every read-modify-write on a statistics
   record goes through a per-game promise queue, so concurrent updates from a
   round ending and a play-time flush cannot discard each other.
9. **Storage degrades, never throws.** Every IndexedDB call resolves to `null`
   when storage is unavailable, and `localStorage` falls back to memory.
   Private-browsing users can still play.
10. **Audio is synthesised.** All effects are generated with the Web Audio API,
    so no audio files ship and there are no licensing questions.
11. **Icons are generated locally.** `scripts/generate-icons.mjs` writes real
    PNGs with a hand-rolled encoder, keeping every asset original and offline.
12. **Shared sports physics.** `_shared/sports/physics.ts` holds projectile
    integration, point/wall/floor bounces and an oscillating power meter.
    Basketball Shot and Penalty Shootout use it; later sports games should too.

---

## Catalog notes

The brief listed 260 titles, seven of which were exact duplicates of another
entry under a different heading (Sky Hopper, Tower Defense, Number Merge,
Picross, Classic Solitaire, Twenty-One and Mastermind Challenge). Those are
catalogued once each, giving **253 distinct games**.

---

## Known issues

- **Thin tests on the newer games.** Aim Trainer, Memory Match, Hangman, Simon
  Memory, Water Sort, Pong, Brick Breaker, Block Drop, Word Search, Blackjack and
  Klondike have 2–4 engine tests each. They need rule tests on par with Snake or
  Minesweeper.
- **Canvas arcade games are a lighter tier.** Pong, Brick Breaker and Block Drop
  run on the shared `_shared/arcade/CanvasRunner`. Brick Breaker and Block Drop
  ignore the difficulty setting, and none of the three saves progress. They are
  playable but not yet polished to the Phase 2 standard. Their animation was not
  confirmed in the browser: the preview pane produced no animation frames. All three
  load and render, and their engine tests pass.
- **Code style.** Several of those game folders are written in a compressed,
  one-line-per-function style. Run `npm run format` and split the long lines
  before extending them.
- React Router v7 future-flag warnings in the console (harmless).
