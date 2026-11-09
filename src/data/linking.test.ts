import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_REGISTRY } from '@/games/registry';
import { categoryFaqs, categoryIntro, gameFaqs } from '@/seo/content';
import { linkTargets, parseLinks, plainText } from '@/seo/links';
import { CATEGORIES, getCategory } from './categories';
import { CLUSTERS } from './clusters';
import {
  COLLECTIONS,
  MIN_COLLECTION_SIZE,
  activeClusters,
  activeCollections,
  collectionGames,
  collectionsForCategory,
  collectionsForGame,
  featuredTopics,
  primaryHub,
  relatedCollections,
} from './collections';
import { MIN_INBOUND_RELATED, getRelatedGames, relatedInboundCounts } from './gameCatalog';
import { SMALL_TOPICS } from './smallTopics';
import { FEATURED_TOPICS, TOPICS } from './topicIndex';

const games = GAME_REGISTRY.filter((g) => g.status === 'available');
const gameIds = new Set(games.map((g) => g.id));
const activeSlugs = new Set(activeCollections(games).map((c) => c.slug));
const categorySlugs = new Set(
  CATEGORIES.filter((c) => games.some((g) => g.category === c.id)).map((c) => c.slug),
);

/** Every link in a piece of copy must lead to a real, indexable page. */
function expectValidLinks(text: string, where: string) {
  for (const { kind, target } of linkTargets(text)) {
    const ok =
      kind === 'game'
        ? gameIds.has(target)
        : kind === 'hub'
          ? activeSlugs.has(target)
          : categorySlugs.has(target);
    expect(ok, `${where}: ${kind}:${target}`).toBe(true);
  }
}

describe('related games', () => {
  it('links every playable game from at least four other game pages', () => {
    const inbound = relatedInboundCounts();
    for (const g of games)
      expect(inbound.get(g.id) ?? 0, g.id).toBeGreaterThanOrEqual(MIN_INBOUND_RELATED);
  });

  it('spreads links out instead of piling them on a few games', () => {
    const counts = [...relatedInboundCounts().values()];
    expect(Math.max(...counts)).toBeLessThanOrEqual(14);
  });

  it('gives each game six distinct, playable related games, never itself', () => {
    for (const g of games) {
      const related = getRelatedGames(g);
      expect(related, g.id).toHaveLength(6);
      expect(new Set(related.map((r) => r.id)).size, g.id).toBe(6);
      expect(
        related.some((r) => r.id === g.id),
        g.id,
      ).toBe(false);
      for (const r of related) expect(r.status, `${g.id} → ${r.id}`).toBe('available');
    }
  });

  it('puts a game’s own hub mates first, even across categories', () => {
    const chess = games.find((g) => g.id === 'chess')!;
    const ids = getRelatedGames(chess).map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(['chess-puzzle', 'chess-tactics', 'checkers']));
  });

  it('keeps hand-picked related games first', () => {
    for (const g of games.filter((x) => x.related?.length)) {
      const want = (g.related ?? []).filter((id) => gameIds.has(id));
      expect(
        getRelatedGames(g)
          .slice(0, want.length)
          .map((r) => r.id),
        g.id,
      ).toEqual(want);
    }
  });

  it('links the games of a small topic to each other', () => {
    for (const topic of SMALL_TOPICS) {
      for (const id of topic.ids) {
        expect(gameIds.has(id), `${topic.name}: ${id}`).toBe(true);
        const related = getRelatedGames(games.find((g) => g.id === id)!).map((g) => g.id);
        for (const mate of topic.ids.filter((m) => m !== id))
          expect(related, `${id} → ${mate}`).toContain(mate);
      }
    }
  });
});

describe('topic hubs', () => {
  it('has copy for every hub in the topic index, and nothing else', () => {
    expect(CLUSTERS.map((c) => c.slug).sort()).toEqual(TOPICS.map((t) => t.slug).sort());
  });

  it('lists only real, playable games, at least enough for a page', () => {
    for (const t of TOPICS) {
      for (const id of t.ids) expect(gameIds.has(id), `${t.slug}: ${id}`).toBe(true);
      expect(new Set(t.ids).size, t.slug).toBe(t.ids.length);
      expect(t.ids.length, t.slug).toBeGreaterThanOrEqual(MIN_COLLECTION_SIZE);
    }
    expect(activeClusters(games)).toHaveLength(TOPICS.length);
  });

  it('belongs to a category that has games', () => {
    for (const t of TOPICS)
      expect(categorySlugs.has(getCategory(t.parent).slug), t.slug).toBe(true);
  });

  it('links to hubs that exist', () => {
    for (const t of TOPICS) {
      for (const slug of t.related) expect(activeSlugs.has(slug), `${t.slug} → ${slug}`).toBe(true);
      const hub = CLUSTERS.find((c) => c.slug === t.slug)!;
      expect(relatedCollections(hub, games).length, t.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it('lists hub games in the hub’s own order', () => {
    const hub = CLUSTERS.find((c) => c.slug === 'chess-and-checkers-games')!;
    expect(collectionGames(hub, games).map((g) => g.id)).toEqual(hub.ids);
  });

  it('features only real hubs on the home page and in the footer', () => {
    expect(featuredTopics(games).map((c) => c.slug)).toEqual(FEATURED_TOPICS);
  });

  it('names one hub as each game’s parent, and lists it first on the game page', () => {
    const chessPuzzle = games.find((g) => g.id === 'chess-puzzle')!;
    expect(primaryHub(chessPuzzle, games)?.slug).toBe('chess-and-checkers-games');
    expect(collectionsForGame(chessPuzzle, games)[0].slug).toBe('chess-and-checkers-games');
    for (const g of games) {
      const slugs = collectionsForGame(g, games).map((c) => c.slug);
      expect(slugs, g.id).not.toContain('mobile-games');
      expect(slugs, g.id).not.toContain('offline-games');
    }
  });

  it('links each category page to its topic hubs', () => {
    const board = collectionsForCategory('board', games).map((c) => c.slug);
    expect(board).toEqual(
      expect.arrayContaining(['chess-and-checkers-games', 'family-board-games']),
    );
    for (const c of CATEGORIES) {
      expect(c.related.length, c.id).toBe(3);
      expect(c.related, c.id).not.toContain(c.id);
    }
  });
});

describe('links in copy', () => {
  it('only point at real, indexable pages', () => {
    for (const c of COLLECTIONS) {
      c.intro.forEach((p, i) => expectValidLinks(p, `${c.slug} intro ${i}`));
      c.faqs.forEach((f) => expectValidLinks(f.a, `${c.slug} faq "${f.q}"`));
    }
    for (const cat of CATEGORIES) {
      const inCat = games.filter((g) => g.category === cat.id);
      categoryIntro(cat).forEach((p, i) => expectValidLinks(p, `${cat.id} intro ${i}`));
      categoryFaqs(cat, inCat).forEach((f) => expectValidLinks(f.a, `${cat.id} faq`));
    }
    for (const g of games) {
      expectValidLinks(g.fullDescription, `${g.id} description`);
      const hub = primaryHub(g, games);
      const faqs = gameFaqs(g, {
        games: getRelatedGames(g),
        hub: hub && { slug: hub.slug, name: hub.name },
      });
      faqs.forEach((f) => expectValidLinks(f.a, `${g.id} faq`));
    }
  });

  it('gives every hub intro at least two links', () => {
    for (const c of CLUSTERS)
      expect(linkTargets(c.intro.join(' ')).length, c.slug).toBeGreaterThanOrEqual(2);
  });

  it('adds a "games like this" answer with links to every game page', () => {
    const chess = games.find((g) => g.id === 'chess')!;
    const faqs = gameFaqs(chess, {
      games: getRelatedGames(chess),
      hub: { slug: 'chess-and-checkers-games', name: 'Chess & Checkers' },
    });
    const like = faqs.find((f) => f.q === 'What games are like Chess?')!;
    expect(linkTargets(like.a).map((t) => t.kind)).toEqual(['game', 'game', 'game', 'hub']);
    expect(plainText(like.a)).toContain('or browse all chess & checkers games.');
  });

  it('parses and strips link markup', () => {
    const text =
      'Play [Chess](game:chess) or see [board games](cat:board) and [memory games](hub:memory-games).';
    expect(
      parseLinks(text)
        .filter((p) => p.href)
        .map((p) => p.href),
    ).toEqual(['/games/chess/', '/categories/board/', '/collections/memory-games/']);
    expect(plainText(text)).toBe('Play Chess or see board games and memory games.');
    expect(parseLinks('No links here.')).toEqual([{ text: 'No links here.' }]);
  });
});

describe('internal link hygiene', () => {
  /** Internal router links in the app's pages and layout. */
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.tsx') ? [path] : [];
    });
  }

  it('links to canonical URLs with a trailing slash', () => {
    const root = resolve(__dirname, '..');
    const files = ['pages', 'layouts', 'components'].flatMap((d) => sourceFiles(join(root, d)));
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/(?:\bto|moreHref)="(\/[^"]*)"/g)) {
        const path = m[1].split(/[?#]/)[0];
        expect(path.endsWith('/'), `${file}: ${m[1]}`).toBe(true);
      }
    }
  });

  it('keeps every game two clicks from home (home → category → game)', () => {
    for (const g of games) expect(categorySlugs.has(getCategory(g.category).slug), g.id).toBe(true);
  });
});
