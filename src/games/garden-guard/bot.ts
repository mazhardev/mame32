import { COLS, PLANTS, ROWS } from './data';
import type { PlantId } from './data';
import { CELL_W, LAWN_X, canPlant, collectAll, plant, plantAt, step } from './engine';
import type { State } from './engine';

/**
 * A computer gardener for the tests: it plants Sunblooms for income, makes
 * sure every row has shooters in proportion to the pests coming down it,
 * shields rows facing tough pests and uses Pop Berries and Root Mines when a
 * row is in trouble. `think` is how many seconds pass between its decisions.
 */
const has = (s: State, id: PlantId) => s.bank.includes(id);
const shooters = (s: State, row: number) => s.plants.filter((p) => p.row === row && (p.id === 'spitter' || p.id === 'twin' || p.id === 'frost')).length;
const threat = (s: State, row: number) => s.pests.filter((e) => e.row === row).reduce((a, e) => a + e.hp, 0);

function attacker(s: State): PlantId {
  if (has(s, 'twin') && s.sun >= PLANTS.twin.cost) return 'twin';
  if (has(s, 'frost') && s.sun >= PLANTS.frost.cost + 75 && Math.random() < 0.3) return 'frost';
  return 'spitter';
}

/** First free cell in a row from a list of columns, if any. */
function freeCol(s: State, row: number, cols: number[]): number {
  for (const c of cols) if (c >= 0 && c < COLS && !plantAt(s, row, c)) return c;
  return -1;
}

interface Want {
  id: PlantId;
  row: number;
  col: number;
}

/** What the gardener most wants to plant next, affordable or not. */
function wanted(s: State): Want | null {
  const rows = Array.from({ length: ROWS }, (_, r) => r).sort((a, b) => threat(s, b) - threat(s, a));
  const blooms = s.plants.filter((p) => p.id === 'sunbloom').length;
  const ready = (id: PlantId) => has(s, id) && (s.cool[id] ?? 0) <= 0;
  // Emergencies: a strong pest deep in a row.
  for (const e of s.pests) {
    const col = Math.floor((e.x - LAWN_X) / CELL_W);
    const deep = (col >= 0 && col <= 3 && e.hp > 300) || (col >= 0 && col <= 6 && e.hp > 1000);
    if (deep && ready('popberry')) {
      const c = freeCol(s, e.row, [col, col + 1, col - 1]);
      if (c >= 0) return { id: 'popberry', row: e.row, col: c };
    }
  }
  // A mine in the path of anything tough.
  for (const e of s.pests) {
    const col = Math.floor((e.x - LAWN_X) / CELL_W);
    if (e.hp > 500 && col >= 4 && col <= 8 && ready('mine') && !s.plants.some((p) => p.row === e.row && p.id === 'mine')) {
      const c = freeCol(s, e.row, [col - 3, col - 4]);
      if (c >= 1) return { id: 'mine', row: e.row, col: c };
    }
  }
  // Threatened rows need shooters to match.
  for (const r of rows) {
    const need = Math.ceil(threat(s, r) / 280);
    if (threat(s, r) > 0 && shooters(s, r) < need) {
      const c = freeCol(s, r, [2, 3, 4, 5]);
      if (c >= 0) return { id: attacker(s), row: r, col: c };
    }
  }
  const next = (id: PlantId, cols: number[], ok: (r: number) => boolean): Want | null => {
    for (const r of rows) {
      if (!ok(r)) continue;
      const c = freeCol(s, r, cols);
      if (c >= 0) return { id, row: r, col: c };
    }
    return null;
  };
  const tough = s.def.pool.some(([id]) => id === 'armor' || id === 'boss');
  const plan: (() => Want | null)[] = [
    () => (blooms < 4 ? next('sunbloom', [0], () => true) : null),
    () => next(attacker(s), [2, 3, 4], (r) => shooters(s, r) < 1),
    () => (blooms < 9 ? next('sunbloom', [0, 1], () => true) : null),
    () => next(attacker(s), [2, 3, 4, 5], (r) => shooters(s, r) < 2),
    () => (tough && ready('shell') ? next('shell', [7, 6], (r) => !s.plants.some((p) => p.row === r && p.id === 'shell')) : null),
    () => next(attacker(s), [2, 3, 4, 5, 6], (r) => shooters(s, r) < 4),
  ];
  for (const step of plan) {
    const w = step();
    if (w) return w;
  }
  return null;
}

export function botTurn(s: State) {
  collectAll(s);
  if (s.phase !== 'play') return;
  const w = wanted(s);
  // Saves up for what it wants most rather than spending on something cheaper.
  if (w && canPlant(s, w.id, w.row, w.col)) plant(s, w.id, w.row, w.col);
}

/** Plays a level to the end; returns true when won. */
export function botPlay(s: State, think = 0.5, maxSecs = 900): boolean {
  let t = 0;
  for (let time = 0; time < maxSecs && s.phase === 'play'; time += 1 / 30) {
    t += 1 / 30;
    if (t >= think) {
      t = 0;
      botTurn(s);
    }
    step(s, 1 / 30);
  }
  return s.phase === 'won';
}
