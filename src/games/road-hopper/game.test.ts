import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { CELL, create, hop, lane, makeLane, update } from './game';

const rng = () => 0.5;

describe('road hopper', () => {
  it('starts on safe grass', () => {
    for (let r = 0; r <= 2; r++) expect(makeLane(r, rng, 1).kind).toBe('grass');
  });

  it('hops forward and scores new rows only', () => {
    const s = create('normal', rng);
    hop(s, 0, 1, rng);
    expect(s.row).toBe(1);
    expect(s.score).toBe(1);
    hop(s, 0, -1, rng);
    hop(s, 0, 1, rng);
    expect(s.score).toBe(1);
  });

  it('cannot hop into a tree or off the board', () => {
    const s = create('normal', rng);
    const l = lane(s, 1, rng);
    l.kind = 'grass';
    l.trees = [4];
    expect(hop(s, 0, 1, rng)).toBe(false);
    s.x = 0;
    expect(hop(s, -1, 0, rng)).toBe(false);
  });

  it('is squashed by a car in its lane', () => {
    const s = create('normal', rng);
    const l = lane(s, 1, rng);
    Object.assign(l, { kind: 'road', speed: 0, movers: [{ x: 4 * CELL, w: CELL * 1.3 }], trees: [] });
    update(s, 1 / 60, inputWith([], ['up']), rng);
    expect(s.over).toBe(true);
  });

  it('rides a log and falls in the water without one', () => {
    const s = create('normal', rng);
    const l = lane(s, 1, rng);
    Object.assign(l, { kind: 'river', speed: 30, movers: [{ x: 3 * CELL, w: CELL * 3 }], trees: [] });
    update(s, 1 / 60, inputWith([], ['up']), rng);
    for (let i = 0; i < 20; i++) update(s, 1 / 60, emptyInput(), rng);
    expect(s.over).toBe(false);
    expect(s.x).toBeGreaterThan(4 * CELL);
    l.movers = [];
    update(s, 1 / 60, emptyInput(), rng);
    expect(s.over).toBe(true);
  });

  it('is caught if it stays behind for too long', () => {
    const s = create('hard', rng);
    for (let i = 0; i < 60 * 60 && !s.over; i++) update(s, 1 / 60, emptyInput(), rng);
    expect(s.over).toBe(true);
  });
});
