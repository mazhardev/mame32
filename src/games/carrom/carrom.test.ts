import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { baseY, chooseShot, clampAim, evaluate, strikerFits } from './ai';
import { BASE, L, POCKETS, R_COIN, R_POCKET, advance, disc, powerFor, settle, speedFor } from './physics';
import type { Disc, PhysEvent } from './physics';
import { COINS, newBoard, onBoard, pocketedCount, resolveShot } from './rules';
import type { Board } from './rules';
import { FRAME, create, update } from './game';

const rng = (seed = 'carrom') => createRng(seed).next;

/** A board with only the given coins on it (the rest pocketed). */
function boardWith(coins: { kind: Disc['kind']; x: number; y: number }[], turn: Board['turn'] = 'white'): Board {
  const b = newBoard();
  for (const d of b.discs) d.on = false;
  for (const c of coins) {
    const d = b.discs.find((x) => x.kind === c.kind && !x.on && !(x as Disc & { used?: boolean }).used)!;
    (d as Disc & { used?: boolean }).used = true;
    d.on = true;
    d.x = c.x;
    d.y = c.y;
  }
  b.turn = turn;
  return b;
}

describe('carrom physics', () => {
  it('slows a sliding disc to a stop by friction', () => {
    const d = disc(1, 'white', 100, 170);
    d.vx = 400;
    const t = settle([d], []);
    expect(d.x).toBeGreaterThan(200);
    expect(d.x).toBeLessThan(L);
    expect(t).toBeLessThan(3);
  });

  it('a heavy striker hitting a coin head-on sends it on faster', () => {
    const st = disc(0, 'striker', 100, 170);
    const c = disc(1, 'white', 140, 170);
    st.vx = 500;
    const ev: PhysEvent[] = [];
    for (let i = 0; i < 40; i++) advance([st, c], 1 / 120, ev);
    expect(ev.some((e) => e.type === 'hit')).toBe(true);
    expect(c.vx).toBeGreaterThan(st.vx);
    expect(st.vx).toBeGreaterThan(0);
  });

  it('bounces off the cushions and drops into pockets', () => {
    const d = disc(1, 'black', 60, 170);
    d.vx = -500;
    const ev: PhysEvent[] = [];
    for (let i = 0; i < 20; i++) advance([d], 1 / 60, ev);
    expect(d.vx).toBeGreaterThanOrEqual(0);
    const p = disc(2, 'white', 40, 40);
    p.vx = -300;
    p.vy = -300;
    const ev2: PhysEvent[] = [];
    settle([p], ev2);
    expect(p.on).toBe(false);
    expect(ev2.find((e) => e.type === 'pocket')?.pocket).toBe(0);
  });

  it('power and launch speed are inverses', () => {
    for (const p of [0.1, 0.4, 0.75, 1]) expect(powerFor(speedFor(p))).toBeCloseTo(p, 5);
  });
});

describe('carrom rules', () => {
  it('starts with nine coins each and the queen in the middle', () => {
    const b = newBoard();
    expect(onBoard(b, 'white')).toBe(COINS);
    expect(onBoard(b, 'black')).toBe(COINS);
    expect(onBoard(b, 'queen')).toBe(1);
    // No two coins overlap.
    for (const a of b.discs) for (const c of b.discs) if (a !== c) expect(Math.hypot(a.x - c.x, a.y - c.y)).toBeGreaterThanOrEqual(2 * R_COIN);
  });

  it('pocketing your own coin keeps the turn; missing passes it', () => {
    const b = newBoard();
    const w = b.discs.find((d) => d.kind === 'white')!;
    w.on = false;
    const r = resolveShot(b, [w], false);
    expect(r.keepTurn).toBe(true);
    expect(b.turn).toBe('white');
    resolveShot(b, [], false);
    expect(b.turn).toBe('black');
  });

  it('pocketing the striker returns the coins and a penalty coin', () => {
    const b = newBoard();
    const [w1, w2] = b.discs.filter((d) => d.kind === 'white');
    w1.on = false; // pocketed earlier
    w2.on = false; // pocketed in the foul shot
    const r = resolveShot(b, [w2], true);
    expect(r.foul).toBe(true);
    expect(onBoard(b, 'white')).toBe(COINS);
    expect(b.turn).toBe('black');
    // With nothing to return, a penalty is owed and paid later.
    const r2 = resolveShot(b, [], true);
    expect(r2.foul).toBe(true);
    expect(b.due.black).toBe(1);
  });

  it('the queen must be covered on the same or next shot', () => {
    const b = newBoard();
    const q = b.discs.find((d) => d.kind === 'queen')!;
    const ws = b.discs.filter((d) => d.kind === 'white');
    ws[0].on = false;
    resolveShot(b, [ws[0]], false);
    q.on = false;
    const r = resolveShot(b, [q], false);
    expect(b.queen).toBe('pending');
    expect(r.keepTurn).toBe(true);
    ws[1].on = false;
    const r2 = resolveShot(b, [ws[1]], false);
    expect(r2.covered).toBe(true);
    expect(b.queen).toBe('white');
  });

  it('an uncovered queen goes back to the centre', () => {
    const b = newBoard();
    const q = b.discs.find((d) => d.kind === 'queen')!;
    const w = b.discs.find((d) => d.kind === 'white')!;
    w.on = false;
    resolveShot(b, [w], false);
    q.on = false;
    resolveShot(b, [q], false);
    resolveShot(b, [], false);
    expect(q.on).toBe(true);
    expect(b.queen).toBe('board');
    expect(b.turn).toBe('black');
  });

  it('the queen cannot be pocketed before your first coin', () => {
    const b = newBoard();
    const q = b.discs.find((d) => d.kind === 'queen')!;
    q.on = false;
    resolveShot(b, [q], false);
    expect(q.on).toBe(true);
  });

  it('your last coin cannot go in before the queen is covered', () => {
    const b = boardWith([
      { kind: 'white', x: 200, y: 200 },
      { kind: 'black', x: 100, y: 100 },
      { kind: 'queen', x: 170, y: 170 },
    ]);
    const w = b.discs.find((d) => d.kind === 'white' && d.on)!;
    w.on = false;
    const r = resolveShot(b, [w], false);
    expect(r.foul).toBe(true);
    expect(w.on).toBe(true);
    expect(b.winner).toBeNull();
  });

  it('clearing your coins with the queen covered wins the board', () => {
    const b = boardWith([
      { kind: 'white', x: 200, y: 200 },
      { kind: 'black', x: 100, y: 100 },
      { kind: 'black', x: 120, y: 100 },
    ]);
    b.queen = 'white';
    const w = b.discs.find((d) => d.kind === 'white' && d.on)!;
    w.on = false;
    resolveShot(b, [w], false);
    expect(b.winner).toBe('white');
    expect(b.points).toBe(2 + 3);
  });
});

describe('carrom computer player', () => {
  it('always picks a legal, forward shot from a clear spot', () => {
    const b = newBoard();
    b.turn = 'black';
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const s = chooseShot(b, 'black', level, rng(level));
      expect(strikerFits(b.discs, s.x, baseY('black'))).toBe(true);
      expect(Math.sin(s.angle)).toBeGreaterThan(0.1);
      expect(s.power).toBeGreaterThan(0);
    }
  });

  it('on Hard it pockets an easy coin sitting in front of a pocket', () => {
    let made = 0;
    for (let seed = 0; seed < 6; seed++) {
      const [px, py] = POCKETS[2]; // bottom-left, seen from the top baseline
      const b = boardWith(
        [
          { kind: 'black', x: px + 40, y: py - 40 },
          { kind: 'black', x: 250, y: 120 },
          { kind: 'white', x: 230, y: 230 },
          { kind: 'white', x: 120, y: 90 },
        ],
        'black',
      );
      const shot = chooseShot(b, 'black', 'hard', rng(`h${seed}`));
      expect(evaluate(b, 'black', shot)).toBeGreaterThan(5);
      made++;
    }
    expect(made).toBe(6);
  });

  it('clamps aim away from the shooter’s own edge', () => {
    expect(Math.sin(clampAim(Math.PI / 2, 'white'))).toBeLessThan(0);
    expect(Math.sin(clampAim(-Math.PI / 2, 'black'))).toBeGreaterThan(0);
  });
});

describe('carrom game flow', () => {
  it('a keyboard shot moves the striker and hands over the turn', () => {
    const s = create('normal', rng(), 'local');
    update(s, 1 / 60, inputWith(['action']), rng());
    simulate({ update }, s, 0.5, inputWith(['action']), rng());
    expect(s.aim.power).toBeGreaterThan(0.3);
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.phase).toBe('moving');
    simulate({ update }, s, 15, emptyInput(), rng());
    expect(['aim', 'pause']).toContain(s.phase);
  });

  it('a pull-back drag aims and shoots', () => {
    const s = create('normal', rng(), 'local');
    const y = L - BASE + FRAME;
    update(s, 1 / 60, inputWith([], [], { x: 200, y: y - 60, down: true, pressed: true }), rng());
    update(s, 1 / 60, inputWith([], [], { x: 200, y: y + 20, down: true }), rng());
    expect(Math.sin(s.aim.angle)).toBeLessThan(-0.9);
    expect(s.aim.power).toBeGreaterThan(0.5);
    update(s, 1 / 60, inputWith([], [], { x: 200, y: y + 20, down: false, released: true }), rng());
    expect(s.phase).toBe('moving');
  });

  it('computer against computer always finishes a board', () => {
    for (const seed of ['a', 'b', 'c']) {
      const s = create('hard', rng(seed), 'ai');
      // Let the human side be played by the computer too.
      const r = rng(seed + 'x');
      let shots = 0;
      for (let t = 0; t < 20000 && !s.over; t++) {
        if (s.phase === 'aim') {
          const shot = chooseShot(s.board, s.board.turn, 'hard', r);
          s.aim.x = shot.x;
          s.striker.x = shot.x;
          s.aim.angle = shot.angle;
          s.aim.power = shot.power;
          s.aim.charging = true;
          shots++;
        }
        s.time += 1 / 30;
        update(s, 1 / 30, emptyInput(), r);
      }
      expect(s.over).toBe(true);
      expect(s.board.winner).not.toBeNull();
      expect(pocketedCount(s.board, s.board.winner!)).toBe(COINS);
      expect(shots).toBeGreaterThan(3);
    }
  });

  it('pocket positions sit inside the board corners', () => {
    for (const [x, y] of POCKETS) {
      expect(Math.min(x, L - x)).toBe(R_POCKET);
      expect(Math.min(y, L - y)).toBe(R_POCKET);
    }
  });
});
