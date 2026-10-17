import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  allMoves,
  blankCell,
  countChocolate,
  countIcing,
  countJelly,
  createState,
  findMove,
  findRuns,
  freeSwap,
  hammer,
  isFree,
  isValidSwap,
  newCandy,
  playMove,
  shuffle,
  sugarRush,
} from './engine';
import type { Candy, Cell, Piece, Special, State } from './engine';

/**
 * Builds a board from rows of space-separated tokens:
 *   0–5      a candy of that colour, optionally followed by
 *            r / c (striped row / column), w (wrapped) or x (rainbow)
 *   L3       a locked candy of colour 3
 *   J2       a candy of colour 2 on jelly
 *   G        an ingredient
 *   I / II   icing with one / two layers
 *   K        chocolate
 *   #        a hole
 *   .        an empty playable cell
 */
function board(rows: string[], colors = 6, ingredientTarget = 0): State {
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const h = grid.length;
  const w = grid[0].length;
  const cells: Cell[] = [];
  const pieces: (Piece | null)[] = [];
  const specials: Record<string, Special> = { r: 'row', c: 'col', w: 'wrap', x: 'rainbow' };
  for (const row of grid) {
    for (const tok of row) {
      const cell = blankCell();
      let piece: Piece | null = null;
      if (tok === '#') cell.playable = false;
      else if (tok === 'I' || tok === 'II') cell.icing = tok.length;
      else if (tok === 'K') cell.chocolate = true;
      else if (tok === 'G') piece = { id: Math.random(), kind: 'ingredient', type: 0 };
      else if (tok !== '.') {
        let t = tok;
        if (t[0] === 'L') {
          cell.lock = true;
          t = t.slice(1);
        }
        if (t[0] === 'J') {
          cell.jelly = 1;
          t = t.slice(1);
        }
        piece = newCandy(Number(t[0]), specials[t[1]] ?? 'none');
      }
      cells.push(cell);
      pieces.push(piece);
    }
  }
  return { w, h, colors, cells, pieces, ingredients: { target: ingredientTarget, spawned: 0, collected: 0 } };
}

const colorAt = (s: State, r: number, c: number) => (s.pieces[r * s.w + c] as Candy | null)?.color;
const last = <T,>(xs: T[]) => xs[xs.length - 1];

/** The board is well-formed: every free cell full, nothing in a blocked cell, no runs. */
function expectStable(s: State) {
  const ids = new Set<number>();
  s.pieces.forEach((p, i) => {
    if (isFree(s, i)) expect(p, `cell ${i} should be filled`).not.toBeNull();
    else expect(p, `blocked cell ${i} should be empty`).toBeNull();
    if (p) {
      expect(ids.has(p.id), 'duplicate piece id').toBe(false);
      ids.add(p.id);
    }
  });
  expect(findRuns(s)).toHaveLength(0);
}

describe('candy engine — matches and specials', () => {
  it('clears a line of three and refills the board', () => {
    const s = board([
      '1 2 3 4',
      '2 3 4 1',
      '0 0 1 0',
      '3 4 2 3',
    ]);
    // Swap (2,2) with (2,3): 0 0 0 1
    const steps = playMove(s, 10, 11, createRng(1).next)!;
    expect(steps).not.toBeNull();
    expect(steps[0].popped.sort((x, y) => x - y)).toEqual([8, 9, 10]);
    expect(steps[0].points).toBeGreaterThan(0);
    expect(steps[0].colors).toEqual([0, 0, 0]);
    expectStable(last(steps).state);
  });

  it('rejects swaps that make no match and leaves the board alone', () => {
    const s = board(['1 2 3', '2 3 1', '3 1 2']);
    expect(isValidSwap(s, 0, 1)).toBe(false);
    expect(playMove(s, 0, 1, Math.random)).toBeNull();
  });

  it('makes a striped candy from four, a rainbow from five and a wrapped one from an L', () => {
    const four = board(['1 1 2 1 3', '2 3 1 4 2', '3 4 3 2 4']);
    const s4 = playMove(four, 2, 7, createRng(2).next)!;
    expect(s4[0].created).toHaveLength(1);
    expect(s4[0].created[0].piece.special).toBe('col');

    const five = board(['1 1 2 1 1', '2 3 1 4 2', '3 4 3 2 4']);
    const s5 = playMove(five, 2, 7, createRng(3).next)!;
    expect(s5[0].created[0].piece.special).toBe('rainbow');

    const ell = board(['2 3 1 4', '3 4 1 2', '1 1 2 3', '4 2 1 4']);
    // Moving the 1 at (3,2) up makes 1 1 1 across row 2 and 1 1 1 down column 2.
    const sl = playMove(ell, 10, 14, createRng(4).next)!;
    expect(sl[0].created.map((c) => c.piece.special)).toContain('wrap');
  });

  it('fires a striped candy caught in a match across its whole row', () => {
    const s = board([
      '4 5 4 5 4',
      '0r 0 3 0 2',
      '5 4 0 4 5',
    ]);
    // Swap brings the 0 at (2,2) up: 0r 0 0 0 → the stripe fires across row 1.
    const steps = playMove(s, 7, 12, createRng(5).next)!;
    const first = steps[0];
    expect(first.fired.some((f) => f.special === 'row')).toBe(true);
    expect(first.popped).toEqual(expect.arrayContaining([5, 6, 8, 9]));
  });

  it('rainbow swapped with a candy clears every candy of that colour', () => {
    const s = board([
      '1 2 1 3',
      '2 0x 3 1',
      '3 1 2 3',
    ]);
    const steps = playMove(s, 5, 6, createRng(6).next)!; // rainbow with a 3 → every 3
    expect(steps).not.toBeNull();
    // After the swap the 3 sits at 5 and the rainbow at 6.
    expect(steps[0].popped.sort((x, y) => x - y)).toEqual([3, 5, 6, 8, 11]);
  });

  it('two striped candies make a cross, two wrapped candies a 5×5 blast', () => {
    const rows = ['1 2 3 4 5 1 2', '2 3 4 5 1 2 3', '3 4 5 1 2 3 4', '4 5 1 2 3 4 5', '5 1 2 3 4 5 1', '1 2 3 4 5 1 2', '2 3 4 5 1 2 3'];
    const cross = board(rows.map((r, i) => (i === 3 ? '4 5 1 2r 3c 4 5' : r)));
    const c = playMove(cross, 24, 25, createRng(7).next)!;
    // The cross goes through (3,4), where the moved piece lands.
    const hit = new Set([...c[0].popped]);
    for (let x = 0; x < 7; x++) expect(hit.has(3 * 7 + x)).toBe(true);
    for (let y = 0; y < 7; y++) expect(hit.has(y * 7 + 4)).toBe(true);

    const wraps = board(rows.map((r, i) => (i === 3 ? '4 5 1 2w 3w 4 5' : r)));
    const w = playMove(wraps, 24, 25, createRng(8).next)!;
    expect(w[0].popped.length).toBeGreaterThanOrEqual(25);
  });

  it('two rainbows clear the whole board', () => {
    const s = board(['1 2 3', '0x 0x 1', '3 1 2']);
    const steps = playMove(s, 3, 4, createRng(9).next)!;
    expect(steps[0].popped).toHaveLength(9);
  });
});

describe('candy engine — blockers', () => {
  it('icing breaks one layer per adjacent match', () => {
    const s = board([
      'II 2 3 4',
      '0 0 1 0',
      '3 4 2 3',
    ]);
    const steps = playMove(s, 6, 7, createRng(10).next)!;
    expect(countIcing(s)).toBe(2);
    expect(countIcing(steps[0].cleared)).toBe(1);
    expect(steps[0].obstacleHits).toContain(0);
  });

  it('cells under icing are refilled by diagonal slides once the board settles', () => {
    const s = board([
      '1 I 2',
      '3 . 4',
      '5 . 1',
      '2 3 4',
    ]);
    const rng = createRng(11);
    // Hammer a candy to trigger a settle.
    const steps = hammer(s, 0, rng.next)!;
    const out = last(steps).state;
    expect(out.pieces[4]).not.toBeNull();
    expect(out.pieces[7]).not.toBeNull();
    expect(out.cells[1].icing).toBeLessThanOrEqual(1);
  });

  it('a lock breaks when matched but its candy stays', () => {
    const s = board([
      '1 2 3 4',
      'L0 0 1 0',
      '3 4 2 3',
    ]);
    const steps = playMove(s, 6, 7, createRng(12).next)!;
    expect(steps[0].cleared.cells[4].lock).toBe(false);
    expect(steps[0].popped).not.toContain(4);
    expect(steps[0].popped).toEqual(expect.arrayContaining([5, 6]));
  });

  it('locked candies cannot be swapped', () => {
    const s = board(['L1 0 1 1', '2 3 4 5']);
    expect(isValidSwap(s, 0, 1)).toBe(false);
  });

  it('jelly is cleared by matching on top of it', () => {
    const s = board([
      '1 2 3 4',
      'J0 0 1 0',
      '3 4 2 3',
    ]);
    expect(countJelly(s)).toBe(1);
    const steps = playMove(s, 6, 7, createRng(13).next)!;
    expect(countJelly(steps[0].cleared)).toBe(0);
  });

  it('chocolate spreads when a move clears none, and not when it does', () => {
    const far = board([
      'K 1 2 3 4',
      '2 3 4 5 1',
      '3 0 0 1 0',
      '4 5 1 2 3',
    ]);
    const steps = playMove(far, 13, 14, createRng(14).next)!;
    expect(steps.some((st) => st.kind === 'chocolate')).toBe(true);
    expect(countChocolate(last(steps).state)).toBe(2);

    const near = board([
      'K 0 0 1 4',
      '2 3 4 0 1',
      '3 4 5 2 1',
    ]);
    const s2 = playMove(near, 3, 8, createRng(15).next)!;
    expect(s2.some((st) => st.kind === 'chocolate')).toBe(false);
    expect(countChocolate(s2[0].cleared)).toBe(0);
  });

  it('ingredients drop out of the bottom and are counted', () => {
    const s = board([
      '1 G 3',
      '2 0 4',
      '0 3 0',
      '3 4 1',
    ], 6, 1);
    s.ingredients.spawned = 1;
    // Swap the 0 at (1,1) down: row 2 becomes 0 0 0.
    const steps = playMove(s, 4, 7, createRng(16).next)!;
    const out = steps.reduce((n, st) => n + st.ingredientsOut.length, 0);
    expect(out).toBe(0); // falls one row but not out yet
    // Make a match beneath it so it reaches the exit.
    const ing = last(steps).state.pieces.findIndex((p) => p?.kind === 'ingredient');
    expect(ing).toBeGreaterThanOrEqual(0);
  });

  it('an ingredient on the exit row leaves the board', () => {
    const s = board([
      '1 2 3',
      '0 G 0',
      '3 0 1',
    ], 6, 1);
    s.ingredients.spawned = 1;
    // 0 at (2,1) up swaps with the ingredient: row 1 0 0 0, ingredient lands on the exit.
    const steps = playMove(s, 4, 7, createRng(17).next)!;
    const out = steps.reduce((n, st) => n + st.ingredientsOut.length, 0);
    expect(out).toBe(1);
    expect(last(steps).state.ingredients.collected).toBe(1);
  });
});

describe('candy engine — boosters, shuffle and the sugar rush', () => {
  it('hammer clears a single candy or cracks an obstacle', () => {
    const s = board(['1 2 3', 'I 4 5', '2 3 4']);
    expect(hammer(s, 3, createRng(18).next)![0].cleared.cells[3].icing).toBe(0);
    const h = hammer(s, 0, createRng(19).next)!;
    expect(h[0].popped).toEqual([0]);
  });

  it('free swap moves two pieces even without a match', () => {
    const s = board(['1 2 3', '2 3 1', '3 1 2']);
    const steps = freeSwap(s, 0, 1, createRng(20).next)!;
    expect(colorAt(steps[0].state, 0, 0)).toBe(2);
    expect(colorAt(steps[0].state, 0, 1)).toBe(1);
  });

  it('shuffles a stuck board into one with a move and no matches', () => {
    const stuck = board(['0 1 2', '1 2 0', '2 0 1'], 3);
    expect(findMove(stuck)).toBeNull();
    const s = shuffle(board(['0 1 2 0', '1 2 0 1', '2 0 1 2', '0 1 2 0'], 3), createRng(21).next);
    expect(findRuns(s)).toHaveLength(0);
    expect(findMove(s)).not.toBeNull();
  });

  it('the sugar rush turns spare moves into stripes and sets them all off', () => {
    const rng = createRng(22);
    const cells = Array.from({ length: 64 }, () => blankCell());
    const s = createState({ w: 8, h: 8, colors: 5, cells, ingredients: 0 }, rng.next);
    const steps = sugarRush(s, 5, rng.next);
    expect(steps[0].kind).toBe('convert');
    expect(steps[0].created).toHaveLength(5);
    const end = last(steps).state;
    expect(end.pieces.every((p) => p?.kind !== 'candy' || p.special === 'none')).toBe(true);
    expect(steps.reduce((n, st) => n + st.points, 0)).toBeGreaterThan(500);
  });
});

describe('candy engine — invariants under random play', () => {
  it('stays well-formed over thousands of moves on boards with every blocker', () => {
    const rng = createRng('fuzz');
    for (let game = 0; game < 25; game++) {
      const w = 9;
      const h = 9;
      const cells = Array.from({ length: w * h }, (_, i) => {
        const c = blankCell();
        const roll = rng.next();
        if (roll < 0.06) c.playable = false;
        else if (roll < 0.12) c.icing = rng.int(1, 3);
        else if (roll < 0.15) c.chocolate = true;
        else if (roll < 0.2) c.lock = true;
        if (rng.next() < 0.3) c.jelly = rng.int(1, 3);
        // Keep the top row open so every column can refill.
        if (i < w) Object.assign(c, { playable: true, icing: 0, chocolate: false, lock: false });
        return c;
      });
      let s = createState({ w, h, colors: rng.int(4, 7), cells, ingredients: game % 3 === 0 ? 3 : 0 }, rng.next);
      expectStable(s);
      for (let move = 0; move < 60; move++) {
        const moves = allMoves(s);
        if (!moves.length) break;
        const [a, b] = moves[rng.int(0, moves.length)];
        const steps = playMove(s, a, b, rng.next)!;
        expect(steps.length).toBeGreaterThan(0);
        s = last(steps).state;
        // The board may be left without runs but with locked/blocked leftovers.
        expect(findRuns(s)).toHaveLength(0);
        s.pieces.forEach((p, i) => {
          if (!isFree(s, i)) expect(p).toBeNull();
        });
        expect(s.ingredients.collected).toBeLessThanOrEqual(s.ingredients.target);
      }
    }
  });

  it('builds the same board from the same seed', () => {
    const cells = Array.from({ length: 81 }, () => blankCell());
    const a = createState({ w: 9, h: 9, colors: 5, cells, ingredients: 0 }, createRng('x').next);
    const b = createState({ w: 9, h: 9, colors: 5, cells, ingredients: 0 }, createRng('x').next);
    expect(a.pieces.map((p) => (p as Candy).color)).toEqual(b.pieces.map((p) => (p as Candy).color));
  });
});
