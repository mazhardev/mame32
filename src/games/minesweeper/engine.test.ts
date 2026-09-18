import { describe, expect, it } from 'vitest';
import { MinesweeperEngine, PRESETS } from './engine';

const small = { cols: 5, rows: 5, mines: 3 };

function engineWithMines(mines: number[], config = small) {
  const engine = new MinesweeperEngine(config);
  // Bypass first-click placement so tests can control the layout exactly.
  engine.status = 'playing';
  for (const i of mines) engine.cells[i].mine = true;
  for (let i = 0; i < engine.cells.length; i++) {
    if (engine.cells[i].mine) continue;
    engine.cells[i].adjacent = engine.neighbours(i).filter((n) => engine.cells[n].mine).length;
  }
  return engine;
}

describe('board setup', () => {
  it('creates the right number of cells', () => {
    const engine = new MinesweeperEngine(PRESETS.easy);
    expect(engine.cells).toHaveLength(81);
    expect(engine.status).toBe('ready');
  });

  it('never places a mine on the first click or its neighbours', () => {
    for (let trial = 0; trial < 30; trial++) {
      const engine = new MinesweeperEngine(PRESETS.easy);
      const safe = engine.index(4, 4);
      engine.placeMines(safe);
      expect(engine.cells[safe].mine).toBe(false);
      for (const n of engine.neighbours(safe)) expect(engine.cells[n].mine).toBe(false);
    }
  });

  it('places exactly the configured number of mines', () => {
    const engine = new MinesweeperEngine(PRESETS.normal);
    engine.placeMines(0);
    expect(engine.cells.filter((c) => c.mine)).toHaveLength(PRESETS.normal.mines);
  });

  it('computes adjacency counts that match the mine layout', () => {
    const engine = new MinesweeperEngine(PRESETS.easy);
    engine.placeMines(40);
    for (let i = 0; i < engine.cells.length; i++) {
      if (engine.cells[i].mine) continue;
      const actual = engine.neighbours(i).filter((n) => engine.cells[n].mine).length;
      expect(engine.cells[i].adjacent).toBe(actual);
    }
  });

  it('counts corner neighbours correctly', () => {
    const engine = new MinesweeperEngine(small);
    expect(engine.neighbours(0)).toHaveLength(3);
    expect(engine.neighbours(engine.index(2, 2))).toHaveLength(8);
  });
});

describe('revealing', () => {
  it('flood fills through empty regions', () => {
    // Mines packed into the bottom row leave the top of the board open.
    const engine = engineWithMines([20, 21, 22]);
    const result = engine.reveal(engine.index(0, 0));
    expect(result.exploded).toBe(false);
    expect(result.revealed).toBeGreaterThan(1);
  });

  it('stops flood fill at numbered cells', () => {
    const engine = engineWithMines([12]);
    engine.reveal(engine.index(0, 0));
    // The cell next to the mine is revealed but its own neighbours are not expanded.
    expect(engine.cells[engine.index(1, 1)].state).toBe('revealed');
    expect(engine.cells[engine.index(1, 1)].adjacent).toBe(1);
  });

  it('does not reveal a flagged cell', () => {
    const engine = engineWithMines([24]);
    engine.toggleFlag(0);
    engine.reveal(0);
    expect(engine.cells[0].state).toBe('flagged');
  });

  it('ends the game when a mine is revealed', () => {
    const engine = engineWithMines([12]);
    const result = engine.reveal(12);
    expect(result.exploded).toBe(true);
    expect(engine.status).toBe('lost');
    expect(engine.explodedIndex).toBe(12);
  });

  it('reveals every mine after a loss', () => {
    const engine = engineWithMines([5, 12, 18]);
    engine.reveal(12);
    for (const i of [5, 12, 18]) expect(engine.cells[i].state).toBe('revealed');
  });

  it('ignores clicks after the game is over', () => {
    const engine = engineWithMines([12]);
    engine.reveal(12);
    const before = engine.revealed;
    engine.reveal(0);
    expect(engine.revealed).toBe(before);
  });
});

describe('flagging', () => {
  it('cycles hidden, flagged, question, hidden', () => {
    const engine = engineWithMines([12]);
    expect(engine.toggleFlag(0)).toBe('flagged');
    expect(engine.flags).toBe(1);
    expect(engine.toggleFlag(0)).toBe('question');
    expect(engine.flags).toBe(0);
    expect(engine.toggleFlag(0)).toBe('hidden');
  });

  it('will not flag a revealed cell', () => {
    const engine = engineWithMines([24]);
    engine.reveal(0);
    expect(engine.toggleFlag(0)).toBeNull();
  });

  it('tracks the remaining mine count', () => {
    const engine = engineWithMines([12, 13, 14]);
    expect(engine.minesRemaining).toBe(3);
    engine.toggleFlag(0);
    expect(engine.minesRemaining).toBe(2);
  });
});

describe('chording', () => {
  it('opens neighbours when the flag count matches', () => {
    const engine = engineWithMines([12]);
    const target = engine.index(1, 1);
    engine.reveal(target);
    engine.toggleFlag(12);
    const result = engine.chord(target);
    expect(result.exploded).toBe(false);
    expect(result.revealed).toBeGreaterThan(0);
  });

  it('does nothing when the flag count is wrong', () => {
    const engine = engineWithMines([12]);
    const target = engine.index(1, 1);
    engine.reveal(target);
    expect(engine.chord(target).revealed).toBe(0);
  });

  it('detonates when a flag is in the wrong place', () => {
    const engine = engineWithMines([12]);
    // (3,3) touches the mine at (2,2); flagging (4,4) satisfies the count wrongly.
    const target = engine.index(3, 3);
    engine.reveal(target);
    engine.toggleFlag(engine.index(4, 4));
    expect(engine.chord(target).exploded).toBe(true);
    expect(engine.status).toBe('lost');
  });

  it('ignores chording on a blank or hidden cell', () => {
    const engine = engineWithMines([24]);
    expect(engine.chord(0).revealed).toBe(0);
  });
});

describe('winning', () => {
  it('wins once every safe cell is revealed', () => {
    const engine = engineWithMines([24]);
    for (let i = 0; i < engine.cells.length; i++) {
      if (!engine.cells[i].mine) engine.reveal(i);
    }
    expect(engine.status).toBe('won');
  });

  it('auto-flags remaining mines on a win', () => {
    const engine = engineWithMines([24]);
    for (let i = 0; i < engine.cells.length; i++) {
      if (!engine.cells[i].mine) engine.reveal(i);
    }
    expect(engine.cells[24].state).toBe('flagged');
  });

  it('does not win while safe cells remain hidden', () => {
    // A mine next to the corner stops the flood fill after a single cell.
    const engine = engineWithMines([6]);
    engine.reveal(0);
    expect(engine.revealed).toBe(1);
    expect(engine.status).toBe('playing');
  });
});
