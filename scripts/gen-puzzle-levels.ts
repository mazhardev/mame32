/**
 * Generates original level packs for Unblock Puzzle and Sokoban.
 *
 * Unblock: random block layouts are explored completely; the position
 * furthest (in moves) from any solved position becomes the level, so every
 * level starts as hard as its layout allows. Distances are exact (BFS).
 *
 * Sokoban: boxes start on the goals and are pulled around at random by a
 * reverse-playing keeper, which guarantees solvability; a push-optimal BFS
 * then measures each candidate and the most demanding ones are kept.
 *
 * Run: npx vite-node --config vitest.config.ts scripts/gen-puzzle-levels.ts [unblock] [sokoban]
 */
import { writeFileSync } from 'node:fs';
import { createRng } from '../src/utils/random';
import type { Piece } from '../src/games/unblock-puzzle/engine';
import { EXIT_ROW, SIZE, cellsOf, serialize, solve } from '../src/games/unblock-puzzle/engine';
import { parseLevel, serializeLevel, solvePushes } from '../src/games/sokoban/engine';
import type { Level, State } from '../src/games/sokoban/engine';

const rng = createRng('gamesplayland-puzzle-levels-v1');

/* ------------------------------------------------------------------ unblock */

function randomLayout(count: number): Piece[] | null {
  const pieces: Piece[] = [{ row: EXIT_ROW, col: rng.int(0, 3), len: 2, horizontal: true }];
  const taken = new Set(cellsOf(pieces[0]));
  let tries = 0;
  while (pieces.length < count + 1 && tries++ < 400) {
    const len = rng.bool(0.66) ? 2 : 3;
    const horizontal = rng.bool();
    const row = horizontal ? rng.int(0, SIZE) : rng.int(0, SIZE - len + 1);
    const col = horizontal ? rng.int(0, SIZE - len + 1) : rng.int(0, SIZE);
    // A horizontal block on the exit row could never get out of the way.
    if (horizontal && row === EXIT_ROW) continue;
    const p = { row, col, len, horizontal };
    const cells = cellsOf(p);
    if (cells.some((c) => taken.has(c))) continue;
    cells.forEach((c) => taken.add(c));
    pieces.push(p);
  }
  return pieces.length === count + 1 ? pieces : null;
}

/**
 * Fast state space for one layout: each piece's fixed line and length are
 * constant, so a state is just the moving coordinate of every piece.
 */
function explorer(layout: Piece[]) {
  const fixed = layout.map((p) => (p.horizontal ? p.row : p.col));
  const lens = layout.map((p) => p.len);
  const horiz = layout.map((p) => p.horizontal);
  const encode = (s: Uint8Array) => {
    let k = 0;
    for (let i = 0; i < s.length; i++) k = k * 6 + s[i];
    return k;
  };
  const cell = (k: number, v: number, i: number) => (horiz[k] ? fixed[k] * SIZE + v + i : (v + i) * SIZE + fixed[k]);
  const occ = new Int8Array(SIZE * SIZE);
  const neighbours = (s: Uint8Array): Uint8Array[] => {
    occ.fill(-1);
    for (let k = 0; k < s.length; k++) for (let i = 0; i < lens[k]; i++) occ[cell(k, s[k], i)] = k;
    const out: Uint8Array[] = [];
    for (let k = 0; k < s.length; k++) {
      for (let v = s[k] - 1; v >= 0 && occ[cell(k, v, 0)] === -1; v--) {
        const t = s.slice();
        t[k] = v;
        out.push(t);
      }
      for (let v = s[k] + 1; v + lens[k] <= SIZE && occ[cell(k, v + lens[k] - 1, 0)] === -1; v++) {
        const t = s.slice();
        t[k] = v;
        out.push(t);
      }
    }
    return out;
  };
  const solved = (s: Uint8Array) => s[0] + lens[0] === SIZE;
  const toPieces = (s: Uint8Array): Piece[] =>
    layout.map((p, k) => (p.horizontal ? { ...p, col: s[k] } : { ...p, row: s[k] }));
  const start = Uint8Array.from(layout.map((p) => (p.horizontal ? p.col : p.row)));
  return { encode, neighbours, solved, toPieces, start };
}

/**
 * The hardest start in the layout's state space: explore every reachable
 * position, then run a breadth-first search outwards from all solved
 * positions at once; the last layer is furthest from any solution.
 */
function hardest(layout: Piece[]): { pieces: Piece[]; moves: number } | null {
  const x = explorer(layout);
  const states = new Map<number, Uint8Array>([[x.encode(x.start), x.start]]);
  const queue = [x.start];
  for (let qi = 0; qi < queue.length; qi++) {
    for (const t of x.neighbours(queue[qi])) {
      const k = x.encode(t);
      if (states.has(k)) continue;
      if (states.size > 60_000) return null;
      states.set(k, t);
      queue.push(t);
    }
  }
  let frontier = [...states.values()].filter(x.solved);
  if (!frontier.length) return null;
  const seen = new Set(frontier.map(x.encode));
  let d = 0;
  let last = frontier;
  while (frontier.length) {
    last = frontier;
    const next: Uint8Array[] = [];
    for (const s of frontier)
      for (const t of x.neighbours(s)) {
        const k = x.encode(t);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(t);
      }
    frontier = next;
    if (next.length) d++;
  }
  // d is the exact number of moves needed to slide the key block to the exit.
  return { pieces: x.toPieces(last[rng.int(0, last.length)]), moves: d };
}

function unblockPacks() {
  const bands = {
    easy: { min: 4, max: 9, want: 20 },
    normal: { min: 10, max: 16, want: 20 },
    hard: { min: 17, max: 99, want: 20 },
  };
  const packs: Record<string, { level: string; moves: number }[]> = { easy: [], normal: [], hard: [] };
  const seen = new Set<string>();
  let attempts = 0;
  while (Object.entries(bands).some(([k, b]) => packs[k].length < b.want) && attempts++ < 40_000) {
    // Once the easier packs are full, only dense layouts are worth trying.
    const easyFull = packs.easy.length >= bands.easy.want && packs.normal.length >= bands.normal.want;
    const layout = randomLayout(easyFull ? rng.int(10, 14) : rng.int(7, 13));
    if (!layout) continue;
    const res = hardest(layout);
    if (!res) continue;
    const level = serialize(res.pieces);
    if (seen.has(level)) continue;
    // Cross-check with the in-game solver so the stored minimum is exact.
    const check = solve(res.pieces);
    if (!check || check.length !== res.moves) throw new Error(`Solver mismatch on ${level}`);
    for (const [name, band] of Object.entries(bands)) {
      if (res.moves >= band.min && res.moves <= band.max && packs[name].length < band.want) {
        packs[name].push({ level, moves: res.moves });
        seen.add(level);
        break;
      }
    }
    if (attempts % 100 === 0) console.log('unblock', attempts, Object.values(packs).map((p) => p.length));
  }
  for (const p of Object.values(packs)) p.sort((a, b) => a.moves - b.moves);
  return packs;
}

/* ------------------------------------------------------------------ sokoban */

function makeRoom(w: number, h: number): Set<number> {
  const walls = new Set<number>();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) walls.add(y * w + x);
  // Interior wall blocks: a few single cells and short bars.
  const blocks = rng.int(2, 5);
  for (let b = 0; b < blocks; b++) {
    const x = rng.int(1, w - 1);
    const y = rng.int(1, h - 1);
    const horizontal = rng.bool();
    const len = rng.int(1, 3);
    for (let i = 0; i < len; i++) {
      const cx = horizontal ? x + i : x;
      const cy = horizontal ? y : y + i;
      if (cx < w - 1 && cy < h - 1) walls.add(cy * w + cx);
    }
  }
  return walls;
}

function floodFloor(w: number, h: number, walls: Set<number>, from: number): Set<number> {
  const seen = new Set([from]);
  const stack = [from];
  while (stack.length) {
    const c = stack.pop()!;
    for (const d of [-w, w, -1, 1]) {
      const n = c + d;
      if (n < 0 || n >= w * h || walls.has(n) || seen.has(n)) continue;
      seen.add(n);
      stack.push(n);
    }
  }
  return seen;
}

function reachableFrom(w: number, h: number, walls: Set<number>, boxes: number[], from: number): Set<number> {
  const blocked = new Set(boxes);
  const seen = new Set([from]);
  const stack = [from];
  while (stack.length) {
    const c = stack.pop()!;
    for (const d of [-w, w, -1, 1]) {
      const n = c + d;
      if (n < 0 || n >= w * h || walls.has(n) || blocked.has(n) || seen.has(n)) continue;
      seen.add(n);
      stack.push(n);
    }
  }
  return seen;
}

function sokobanCandidate(boxes: number, long = false): { text: string; pushes: number } | null {
  const w = rng.int(7, 10);
  const h = rng.int(6, 9);
  const walls = makeRoom(w, h);
  const floor = [...Array(w * h).keys()].filter((i) => !walls.has(i));
  const start = floor[rng.int(0, floor.length)];
  const region = floodFloor(w, h, walls, start);
  if (region.size < boxes * 5 + 8) return null;
  // Everything outside the reachable region becomes wall.
  for (const i of floor) if (!region.has(i)) walls.add(i);
  const cells = [...region];
  const goals = new Set<number>();
  while (goals.size < boxes) goals.add(cells[rng.int(0, cells.length)]);
  const level: Level = { w, h, walls, goals };
  const boxPos = [...goals];
  let player = cells[rng.int(0, cells.length)];
  if (goals.has(player)) return null;
  // Reverse play: repeatedly walk the keeper to a box and pull it a few
  // squares. Every pull can be undone by a push, so the result is solvable.
  const free = (c: number) => region.has(c) && !boxPos.includes(c);
  const pulls = long ? rng.int(18, 36) : rng.int(8, 20);
  for (let n = 0; n < pulls; n++) {
    const bi = rng.int(0, boxPos.length);
    const box = boxPos[bi];
    const canReach = reachableFrom(w, h, walls, boxPos, player);
    const dirs = [-w, w, -1, 1].filter((d) => free(box + d) && free(box + 2 * d) && canReach.has(box + d));
    if (!dirs.length) continue;
    const d = dirs[rng.int(0, dirs.length)];
    let keeper = box + d;
    let at = box;
    for (let k = rng.int(1, 4); k > 0 && free(keeper + d); k--) {
      at = keeper;
      keeper += d;
    }
    boxPos[bi] = at;
    player = keeper;
  }
  // Hard rooms may leave one box already home; others must all move.
  const home = boxPos.filter((b) => goals.has(b)).length;
  if (home > (long ? 1 : 0)) return null;
  const state: State = { player, boxes: boxPos.sort((a, b) => a - b) };
  const pushes = solvePushes(level, state, 250_000);
  if (pushes === null) return null;
  // Trim the outer ring of solid wall for display.
  const text = serializeLevel(level, state);
  return { text: trim(text), pushes };
}

function trim(text: string): string {
  const rows = text.split('\n');
  const parsed = parseLevel(text);
  const { w, h } = parsed.level;
  // Keep only walls touching the interior, drawn as '#', others as spaces.
  const interior = floodFloor(w, h, parsed.level.walls, parsed.state.player);
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] ?? ' ';
      if (ch !== '#') {
        row += ch;
        continue;
      }
      let touches = false;
      for (const dy of [-1, 0, 1])
        for (const dx of [-1, 0, 1]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && interior.has(ny * w + nx)) touches = true;
        }
      row += touches ? '#' : ' ';
    }
    out.push(row.replace(/\s+$/, ''));
  }
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  const indent = Math.min(...out.filter((r) => r.trim()).map((r) => r.length - r.trimStart().length));
  return out.map((r) => r.slice(indent)).join('\n');
}

function sokobanPacks() {
  const specs = {
    easy: { boxes: 2, min: 5, want: 15 },
    normal: { boxes: 3, min: 9, want: 15 },
    hard: { boxes: 0, min: 15, want: 15 },
  };
  const packs: Record<string, { text: string; pushes: number }[]> = { easy: [], normal: [], hard: [] };
  for (const [name, spec] of Object.entries(specs)) {
    let attempts = 0;
    while (packs[name].length < spec.want && attempts++ < 20_000) {
      // Keep the best of a few candidates so levels are not trivial.
      let best: { text: string; pushes: number } | null = null;
      for (let t = 0; t < 6; t++) {
        // Hard mixes 3- and 4-box rooms with long reverse walks.
        const c = spec.boxes ? sokobanCandidate(spec.boxes) : sokobanCandidate(rng.bool(0.5) ? 4 : 3, true);
        if (c && c.pushes >= spec.min && (!best || c.pushes > best.pushes)) best = c;
      }
      if (best && !packs[name].some((p) => p.text === best!.text)) packs[name].push(best);
      if (attempts % 50 === 0) console.log('sokoban', name, attempts, packs[name].length);
    }
    packs[name].sort((a, b) => a.pushes - b.pushes);
  }
  return packs;
}

/* ------------------------------------------------------------------ output */

const only = process.argv.slice(2);
const want = (name: string) => !only.length || only.includes(name);

if (want('unblock')) {
  const unblock = unblockPacks();
  writeFileSync(
    'src/games/unblock-puzzle/levels.ts',
    `// Generated by scripts/gen-puzzle-levels.ts. Original layouts; "moves" is the exact minimum.
export interface UnblockLevel {
  level: string;
  moves: number;
}

export const LEVEL_PACKS: Record<'easy' | 'normal' | 'hard', UnblockLevel[]> = ${JSON.stringify(unblock, null, 2)};
`,
  );
  console.log('unblock done', Object.fromEntries(Object.entries(unblock).map(([k, v]) => [k, v.map((l) => l.moves)])));
}

if (want('sokoban')) {
  const sokoban = sokobanPacks();
  writeFileSync(
    'src/games/sokoban/levels.ts',
    `// Generated by scripts/gen-puzzle-levels.ts. Original rooms; "pushes" is the exact minimum.
export interface SokobanLevel {
  text: string;
  pushes: number;
}

export const LEVEL_PACKS: Record<'easy' | 'normal' | 'hard', SokobanLevel[]> = ${JSON.stringify(sokoban, null, 2)};
`,
  );
  console.log('sokoban done', Object.fromEntries(Object.entries(sokoban).map(([k, v]) => [k, v.map((l) => l.pushes)])));
}
