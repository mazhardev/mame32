import { GAME_REGISTRY } from '@/games/registry';
import { CATEGORIES } from '@/data/categories';
import { categoryDescription, categoryTitle, gameDescription, gameTitle, homeTitle } from './seo';

describe('seo titles and descriptions', () => {
  it('fits every game title and description in a search result', () => {
    for (const game of GAME_REGISTRY) {
      expect(gameTitle(game).length, game.id).toBeLessThanOrEqual(60);
      expect(gameDescription(game).length, game.id).toBeLessThanOrEqual(160);
    }
  });

  it('gives every game a unique title', () => {
    const titles = GAME_REGISTRY.map(gameTitle);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('mentions the computer opponent and two-player mode when a game has them', () => {
    const chess = GAME_REGISTRY.find((g) => g.id === 'chess')!;
    expect(gameTitle(chess)).toMatch(/vs Computer or 2 Player/);
    const snake = GAME_REGISTRY.find((g) => g.id === 'snake')!;
    expect(gameTitle(snake)).toMatch(/^Snake Game – Play Free Online/);
  });

  it('does not repeat the opponent when the game name already has it', () => {
    const poker = GAME_REGISTRY.find((g) => g.title.includes('vs Computer'));
    if (poker) expect(gameTitle(poker)).not.toMatch(/vs Computer.*vs Computer/);
  });

  it('leads the home title with the main search phrase', () => {
    expect(homeTitle()).toMatch(/^Play Free Online Games/);
  });

  it('never doubles "Games" in category titles', () => {
    for (const c of CATEGORIES) {
      expect(categoryTitle(c.name)).not.toMatch(/games games/i);
      expect(categoryDescription(c.name, c.description, 3)).not.toMatch(/games games/i);
      expect(categoryDescription(c.name, c.description, 3).length).toBeLessThanOrEqual(160);
    }
  });
});
