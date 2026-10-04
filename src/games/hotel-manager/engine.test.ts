import { describe, expect, it } from 'vitest';
import {
  NIGHTS,
  TUNING,
  accept,
  botDay,
  buildRoom,
  endDay,
  fits,
  newHotel,
  occupant,
  rating,
  renovate,
  validHotel,
} from './engine';
import type { Hotel, Request } from './engine';

function withRequest(h: Hotel, r: Partial<Request>): Request {
  const req: Request = {
    id: 999,
    guest: 'Test',
    note: '',
    from: h.day,
    to: h.day + 2,
    rate: 80,
    wanted: 'standard',
    ...r,
  };
  h.requests = [req];
  return req;
}

describe('hotel manager', () => {
  it('accepts a booking only into a free room of the right type or better', () => {
    const h = newHotel(1, 'normal');
    const r = withRequest(h, { wanted: 'deluxe' });
    expect(fits(h, 0, r)).toBe(false);
    expect(accept(h, r.id, 3)).toBe(true);
    expect(occupant(h.rooms[3], h.day)?.guest).toBe('Test');
    const clash = withRequest(h, { id: 5, from: h.day + 1, to: h.day + 3, wanted: 'standard' });
    expect(fits(h, 3, clash)).toBe(false);
    expect(fits(h, 0, clash)).toBe(true);
  });

  it('pays for each night, charges wages and upkeep, and reviews on check-out', () => {
    const h = newHotel(1, 'normal');
    const r = withRequest(h, { from: 1, to: 2, rate: 100 });
    accept(h, r.id, 0);
    const before = h.cash;
    const rep = endDay(h, 'normal');
    expect(rep.income).toBe(100);
    expect(h.cash).toBe(before + 100 - rep.costs);
    expect(rep.reviews).toEqual([3.5]);
    expect(h.rooms[0].clean).toBe(false);
    expect(h.rooms[0].bookings).toHaveLength(0);
  });

  it('guests in a dirty room leave a bad review', () => {
    const h = newHotel(1, 'normal');
    h.keepers = 0;
    h.rooms[0].clean = false;
    const r = withRequest(h, { from: 1, to: 2 });
    accept(h, r.id, 0);
    const rep = endDay(h, 'normal');
    expect(rep.dirty).toBe(1);
    expect(rep.reviews[0]).toBeLessThan(2);
  });

  it('housekeepers clean rooms with arrivals first', () => {
    const h = newHotel(1, 'normal');
    h.keepers = 1;
    h.rooms.forEach((room) => (room.clean = false));
    const r = withRequest(h, { from: 1, to: 2 });
    accept(h, r.id, 3);
    const rep = endDay(h, 'normal');
    expect(rep.dirty).toBe(0);
  });

  it('upgraded rooms earn better reviews; building and renovating cost cash', () => {
    const h = newHotel(1, 'normal');
    h.cash = 5000;
    expect(renovate(h, 0)).toBe(true);
    expect(h.rooms[0].type).toBe('deluxe');
    expect(buildRoom(h, 'suite')).toBe(true);
    const r = withRequest(h, { from: 1, to: 2, wanted: 'standard' });
    accept(h, r.id, 0);
    expect(endDay(h, 'normal').reviews[0]).toBeGreaterThan(4);
    expect(validHotel(JSON.parse(JSON.stringify(h)))).toBe(true);
    expect(validHotel({ ...h, rooms: [] })).toBe(false);
  });

  it('a greedy manager reaches the goal on every difficulty', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const h = newHotel(seed, d);
        while (h.day <= NIGHTS) {
          botDay(h);
          endDay(h, d);
        }
        expect(h.cash, `${d} ${seed}`).toBeGreaterThanOrEqual(TUNING[d].goal);
        expect(rating(h)).toBeGreaterThan(3);
      }
  });

  it('a hotel that turns everyone away loses money', () => {
    const h = newHotel(1, 'easy');
    while (h.day <= NIGHTS) endDay(h, 'easy');
    expect(h.cash).toBeLessThan(TUNING.easy.cash);
  });
});
