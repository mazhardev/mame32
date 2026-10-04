import { GAME_REGISTRY } from '@/games/registry';
import { gameFaqs, homeFaqs, isTwoPlayer } from '@/seo/content';
import { collectionTitle } from '@/utils/seo';
import {
  COLLECTIONS,
  MIN_COLLECTION_SIZE,
  activeCollections,
  collectionDescription,
  collectionGames,
  collectionsForGame,
} from './collections';

describe('collections', () => {
  it('has unique URL-safe slugs', () => {
    const slugs = COLLECTIONS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('keeps every collection big enough to be worth indexing', () => {
    for (const c of COLLECTIONS) {
      expect(collectionGames(c, GAME_REGISTRY).length, c.slug).toBeGreaterThanOrEqual(MIN_COLLECTION_SIZE);
    }
    expect(activeCollections(GAME_REGISTRY)).toHaveLength(COLLECTIONS.length);
  });

  it('fits titles (with brand) and descriptions in a search result', () => {
    for (const c of COLLECTIONS) {
      const count = collectionGames(c, GAME_REGISTRY).length;
      expect(collectionTitle(c.title), c.slug).toMatch(/\| /);
      expect(collectionTitle(c.title).length, c.slug).toBeLessThanOrEqual(60);
      const desc = collectionDescription(c, count);
      expect(desc).not.toContain('{count}');
      expect(desc.length, c.slug).toBeLessThanOrEqual(160);
    }
  });

  it('only lists playable games', () => {
    const planned = { ...GAME_REGISTRY[0], id: 'planned-x', status: 'planned' as const };
    for (const c of COLLECTIONS) {
      expect(collectionGames(c, [...GAME_REGISTRY, planned]).some((g) => g.id === 'planned-x')).toBe(false);
    }
  });

  it('lists two-player games that really have a local two-player mode', () => {
    const twoPlayer = COLLECTIONS.find((c) => c.slug === '2-player-games')!;
    const ids = collectionGames(twoPlayer, GAME_REGISTRY).map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(['chess', 'checkers', 'connect-four', 'tic-tac-toe']));
    expect(ids).not.toContain('snake');
  });

  it('links a game page to its collections but not to the catch-all offline page', () => {
    const chess = GAME_REGISTRY.find((g) => g.id === 'chess')!;
    const slugs = collectionsForGame(chess, GAME_REGISTRY).map((c) => c.slug);
    expect(slugs).toContain('2-player-games');
    expect(slugs).not.toContain('offline-games');
  });
});

describe('faq content', () => {
  it('asks the two-player question only for two-player games', () => {
    for (const game of GAME_REGISTRY) {
      const asks = gameFaqs(game).some((f) => f.q.startsWith('Can two people play'));
      expect(asks, game.id).toBe(isTwoPlayer(game));
    }
  });

  it('never produces empty questions or answers', () => {
    const all = [...homeFaqs(GAME_REGISTRY.length), ...GAME_REGISTRY.flatMap(gameFaqs), ...COLLECTIONS.flatMap((c) => c.faqs)];
    for (const f of all) {
      expect(f.q.trim()).not.toBe('');
      expect(f.a.trim().length).toBeGreaterThan(10);
    }
  });
});
