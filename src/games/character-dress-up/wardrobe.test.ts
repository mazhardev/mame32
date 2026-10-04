import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  ITEMS,
  SLOTS,
  THEME_IDS,
  defaultLook,
  itemsFor,
  makeRequests,
  randomLook,
  rateLook,
} from './wardrobe';
import type { Look, Theme } from './wardrobe';

function bestLook(theme: Theme): Look {
  const look = defaultLook();
  for (const slot of SLOTS)
    look.items[slot] = itemsFor(slot).find((i) => i.themes.includes(theme))!.id;
  return look;
}

describe('character dress-up wardrobe', () => {
  it('has unique ids and a matching item for every theme in every slot', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const theme of THEME_IDS)
      for (const slot of SLOTS)
        expect(itemsFor(slot).some((i) => i.themes.includes(theme))).toBe(true);
  });

  it('a perfectly themed look with the wished colour scores 100 and three stars', () => {
    for (const theme of THEME_IDS) {
      const look = bestLook(theme);
      look.colors.top = 'blue';
      expect(rateLook(look, { theme, color: 'blue' })).toMatchObject({
        score: 100,
        stars: 3,
        wish: true,
      });
      expect(rateLook(look, { theme, color: null }).score).toBe(100);
      expect(rateLook(look, { theme, color: 'pink' }).score).toBe(90);
    }
  });

  it('plain clothes score modestly and wrong-occasion clothes score nothing', () => {
    const plain = rateLook(defaultLook(), { theme: 'beach', color: null });
    expect(plain.score).toBe(33);
    expect(Object.values(plain.slots).every((s) => s === 'plain')).toBe(true);
    const snowAtBeach = rateLook(bestLook('snow'), { theme: 'beach', color: null });
    expect(snowAtBeach.score).toBe(0);
    expect(snowAtBeach.stars).toBe(0);
  });

  it('a colour wish is not met by an empty slot', () => {
    const look = defaultLook();
    look.colors = { hat: 'green', top: 'white', bottom: 'blue', shoes: 'black', extra: 'green' };
    expect(rateLook(look, { theme: 'party', color: 'green' }).wish).toBe(false);
    look.items.extra = 'bowtie';
    expect(rateLook(look, { theme: 'party', color: 'green' }).wish).toBe(true);
  });

  it('builds five distinct clients with wishes only above easy', () => {
    const easy = makeRequests('easy', createRng(1).next);
    expect(new Set(easy.map((r) => r.theme)).size).toBe(5);
    expect(easy.every((r) => r.color === null)).toBe(true);
    const hard = makeRequests('hard', createRng(1).next);
    expect(hard.every((r) => r.color && r.color !== 'white' && r.color !== 'black')).toBe(true);
  });

  it('random looks only use valid items', () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const look = randomLook(rng.next);
      for (const slot of SLOTS) expect(itemsFor(slot).map((x) => x.id)).toContain(look.items[slot]);
    }
  });
});
