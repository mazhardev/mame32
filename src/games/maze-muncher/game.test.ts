import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { COLS, MAZE, PLAYER_START, ROWS, TUNNEL_ROW, walkable } from './maze';
import { advance, canStep, cellKey, chooseGhostDir, create, pos, spec } from './game';
import type { Dir, State } from './game';

const rng = () => 0.4;
const DIRS: Dir[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/** A game that is already past the READY pause, with the ghosts parked in the house. */
function quiet(): State {
  const s = create('normal');
  s.readyT = 0;
  for (const g of s.ghosts) {
    g.mode = 'house';
    g.release = 999;
  }
  return s;
}

describe('maze muncher maze', () => {
  it('has rows of equal width and is mirror-symmetric', () => {
    for (const row of MAZE) {
      expect(row).toHaveLength(COLS);
      expect(row.replace('P', '.')).toBe([...row.replace('P', '.')].reverse().join(''));
    }
  });

  it('lets the muncher reach every dot and has no dead ends', () => {
    const seen = new Set<number>([cellKey(PLAYER_START.x, PLAYER_START.y)]);
    const queue: [number, number][] = [[PLAYER_START.x, PLAYER_START.y]];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      const open = DIRS.filter((d) => canStep(x, y, d));
      expect(open.length, `dead end at ${x},${y}`).toBeGreaterThanOrEqual(2);
      for (const d of open) {
        const nx = (x + d[0] + COLS) % COLS;
        const k = cellKey(nx, y + d[1]);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push([nx, y + d[1]]);
        }
      }
    }
    const s = create('normal');
    for (const k of [...s.dots, ...s.pellets]) expect(seen.has(k)).toBe(true);
    expect(s.pellets.size).toBe(4);
  });
});

describe('maze muncher movement', () => {
  it('moves along the corridor eating dots', () => {
    const s = quiet();
    simulate(spec, s, 0.5, emptyInput(), rng);
    expect(s.player.tx).toBeLessThan(PLAYER_START.x);
    expect(s.score).toBeGreaterThanOrEqual(20);
    expect(s.dots.has(cellKey(PLAYER_START.x - 1, PLAYER_START.y))).toBe(false);
  });

  it('stops at walls instead of passing through them', () => {
    const s = quiet();
    simulate(spec, s, 3, emptyInput(), rng);
    // Heading left from the start, the corridor ends in a wall at x = 4.
    expect(walkable(s.player.tx - 1, s.player.ty)).toBe(false);
    expect(s.player.p).toBe(0);
  });

  it('remembers a turn and takes it at the next junction', () => {
    const s = quiet();
    simulate(spec, s, 1.5, inputWith(['up']), rng);
    expect(s.player.ty).toBeLessThan(PLAYER_START.y);
  });

  it('reverses instantly between tiles', () => {
    const s = quiet();
    simulate(spec, s, 0.1, emptyInput(), rng);
    const [x0] = pos(s.player);
    simulate(spec, s, 0.1, inputWith(['right']), rng);
    expect(pos(s.player)[0]).toBeGreaterThan(x0);
  });

  it('wraps around through the side tunnel', () => {
    const m = { tx: 0, ty: TUNNEL_ROW, dir: [-1, 0] as Dir, p: 0 };
    advance(m, 1.5, () => [-1, 0]);
    expect(m.tx).toBe(COLS - 1);
    expect(pos(m)[0]).toBeCloseTo(COLS - 1.5);
  });
});

describe('maze muncher ghosts', () => {
  it('releases ghosts from the house into the maze', () => {
    const s = create('normal');
    s.readyT = 0;
    // Keep the muncher out of harm's way.
    s.lives = 99;
    simulate(spec, s, 12, emptyInput(), rng);
    expect(s.ghosts.filter((g) => g.mode === 'active' || g.mode === 'frightened').length).toBeGreaterThanOrEqual(3);
  });

  it('only ever steps onto walkable tiles', () => {
    const s = create('hard');
    s.readyT = 0;
    s.lives = 999;
    for (let i = 0; i < 1200; i++) {
      simulate(spec, s, 1 / 60, emptyInput(), Math.random);
      for (const g of s.ghosts) {
        const ch = MAZE[g.ty][g.tx];
        expect('#'.includes(ch)).toBe(false);
        if (g.mode === 'active' || g.mode === 'frightened') expect(ch === 'H').toBe(false);
      }
    }
  });

  it('costs a life when an active ghost catches the muncher, then ends the game', () => {
    const s = quiet();
    const g = s.ghosts[0];
    Object.assign(g, { mode: 'active', tx: PLAYER_START.x - 1, ty: PLAYER_START.y, dir: [1, 0], p: 0 });
    s.lives = 1;
    simulate(spec, s, 0.2, emptyInput(), rng);
    expect(s.lives).toBe(0);
    simulate(spec, s, 2, emptyInput(), rng);
    expect(s.over).toBe(true);
  });

  it('frightens ghosts with a power pellet and lets the muncher eat them', () => {
    const s = quiet();
    // Put a pellet right in front of the muncher.
    s.pellets.add(cellKey(PLAYER_START.x - 1, PLAYER_START.y));
    const g = s.ghosts[0];
    Object.assign(g, { mode: 'active', tx: 1, ty: 1, dir: [1, 0], p: 0 });
    simulate(spec, s, 0.2, emptyInput(), rng);
    expect(g.mode).toBe('frightened');
    // Scared ghosts turn around; this one wanders straight into the muncher.
    const [px, py] = pos(s.player);
    Object.assign(g, { tx: Math.round(px) - 1, ty: py, dir: [1, 0], p: 0 });
    simulate(spec, s, 0.3, emptyInput(), rng);
    expect(s.ghostsEaten).toBe(1);
    expect(s.score).toBeGreaterThanOrEqual(250);
    expect(g.mode).toBe('eyes');
    expect(s.lives).toBe(3);
    // The eyes fly home and the ghost comes back out.
    simulate(spec, s, 6, emptyInput(), rng);
    expect(g.mode === 'active' || g.mode === 'frightened').toBe(true);
  });

  it('sends eaten ghosts home from anywhere in the maze', () => {
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        if (!walkable(x, y)) continue;
        const s = quiet();
        const g = s.ghosts[1];
        Object.assign(g, { mode: 'eyes', tx: x, ty: y, dir: [0, 1], p: 0 });
        let steps = 0;
        while (g.mode === 'eyes' && steps < 120) {
          const d = chooseGhostDir(s, g, 1, rng);
          g.dir = d;
          g.tx = (g.tx + d[0] + COLS) % COLS;
          g.ty += d[1];
          if (g.tx === 9 && g.ty === 9) g.mode = 'leaving';
          steps++;
        }
        expect(g.mode, `eyes stuck from ${x},${y}`).toBe('leaving');
      }
  });
});

describe('maze muncher levels', () => {
  it('starts the next level when every dot is eaten', () => {
    const s = quiet();
    s.dots.clear();
    s.pellets.clear();
    s.pellets.add(cellKey(PLAYER_START.x - 1, PLAYER_START.y));
    simulate(spec, s, 0.4, emptyInput(), rng);
    expect(s.level).toBe(2);
    expect(s.dots.size).toBeGreaterThan(100);
    expect(s.score).toBeGreaterThanOrEqual(1050);
  });
});
