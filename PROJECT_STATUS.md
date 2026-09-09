# Project Status

_Last updated: 2026-09-09_

## Summary

| Area | Status |
| --- | --- |
| Platform (Phase 1) | ✅ 100% complete |
| Games playable | 0 of 253 catalogued |
| Current phase | Phase 2 — first 20 games |

Games are only marked complete when they genuinely launch and play. Everything
else appears in the catalog as **Planned** and cannot be started.

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
| Responsive canvas with devicePixelRatio handling | ✅ |
| PWA (manifest, service worker, generated icons) | ✅ |
| Error boundary per game | ✅ |
| Storage-failure handling | ✅ |
| Reset options with confirmation | ✅ |
| Test suite (Vitest) | ✅ 27 tests |
| Production build verified | ✅ |

---

## Games

### Phase 2 — first 20 games

- [ ] Snake
- [ ] Block Drop
- [ ] Pong
- [ ] Brick Breaker
- [ ] Minesweeper
- [ ] Sudoku
- [ ] Number Merge 2048
- [ ] Tic-Tac-Toe
- [ ] Connect Four
- [ ] Memory Match
- [ ] Hangman
- [ ] Word Search
- [ ] Klondike Solitaire
- [ ] Blackjack
- [ ] Basketball Shot
- [ ] Penalty Shootout
- [ ] Reaction Timer
- [ ] Aim Trainer
- [ ] Water Sort
- [ ] Simon Memory

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
   or when `visibilityState` is `hidden`, so nothing runs off-screen.
7. **Storage degrades, never throws.** Every IndexedDB call resolves to `null`
   when storage is unavailable, and `localStorage` falls back to memory.
   Private-browsing users can still play.
8. **Audio is synthesised.** All effects are generated with the Web Audio API,
   so no audio files ship and there are no licensing questions.
9. **Icons are generated locally.** `scripts/generate-icons.mjs` writes real
   PNGs with a hand-rolled encoder, keeping every asset original and offline.

---

## Catalog notes

The brief listed 260 titles, seven of which were exact duplicates of another
entry under a different heading (Sky Hopper, Tower Defense, Number Merge,
Picross, Classic Solitaire, Twenty-One and Mastermind Challenge). Those are
catalogued once each, giving **253 distinct games**.

---

## Known issues

None outstanding.
