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
 * Run: npx vite-node scripts/gen-puzzle-levels.ts
 */
import { writeFileSync } from 'node:fs';
import { createRng } from '../src/utils/random';
import type { Piece } from '../src/games/unblock-puzzle/engine';
import { EXIT_ROW, SIZE, cellsOf, isSolved, serialize, slide, slideRange } from '../src/games/unblock-puzzle/engine';
import { parseLevel, serializeLevel, solvePushes } from '../src/games/sokoban/engine';
import type { Level, State } from '../src/games/sokoban/engine';

const rng = createRng('gamesplayland-puzzle-levels-v1');

/* ------------------------------------------------------------------ unblock */

function randomLayout(count: number): Piece[] | null {
  const pieces: Piece[] = [{ row: EXIT_ROW, col: rng.int(0, 3), len: 2, horizontal: true }];
  const taken = new Set(cellsOf(pieces[0]));
  let tries = 0;
  while (pieces.length < count + 1 && tries++ < 400) {
    const len = rng.bool(0.72) ? 2 : 3;
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

const coordKey = (ps: Piece[]) => ps.map((p) => (p.horizontal ? p.col : p.row)).join('');

function neighbours(ps: Piece[]): Piece[][] {
  const out: Piece[][] = [];
  for (let k = 0; k < ps.length; k++) {
    const [back, fwd] = slideRange(ps, k);
    for (let by = back; by <= fwd; by++) if (by) out.push(slide(ps, k, by)!);
  }
  return out;
}

/** The hardest start in the layout's state space, with its exact distance. */
function hardest(start: Piece[]): { pieces: Piece[]; moves: number } | null {
  const states = new Map<string, Piece[]>([[coordKey(start), start]]);
  const queue = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    for (const t of neighbours(queue[qi])) {
      const k = coordKey(t);
      if (states.has(k)) continue;
      if (states.size > 150_000) return null;
      states.set(k, t);
      queue.push(t);
    }
  }
  // Multi-source BFS from every solved state gives each state's distance.
  const dist = new Map<string, number>();
  let frontier = [...states.values()].filter(isSolved);
  if (!frontier.length) return null;
  frontier.forEach((s) => dist.set(coordKey(s), 0));
  let d = 0;
  let last = frontier;
  while (frontier.length) {
    last = frontier;
    const next: Piece[][] = [];
    for (const s of frontier)
      for (const t of neighbours(s)) {
        const k = coordKey(t);
        if (dist.has(k)) continue;
        dist.set(k, d + 1);
        next.push(t);
      }
    frontier = next;
    if (next.length) d++;
  }
  // Moving the key block out of the exit counts as the final move.
  const pick = last[rng.int(0, last.length)];
  return { pieces: pick, moves: d + 1 };
}

function unblockPacks() {
  const bands = {
    easy: { min: 5, max: 10, want: 20 },
    normal: { min: 12, max: 20, want: 20 },
    hard: { min: 22, max: 99, want: 20 },
  };
  const packs: Record<string, { level: string; moves: number }[]> = { easy: [], normal: [], hard: [] };
  const seen = new Set<string>();
  let attempts = 0;
  while (Object.entries(bands).some(([k, b]) => packs[k].length < b.want) && attempts++ < 40_000) {
    const layout = randomLayout(rng.int(7, 13));
    if (!layout) continue;
    const res = hardest(layout);
    if (!res) continue;
    const level = serialize(res.pieces);
    if (seen.has(level)) continue;
    for (const [name, band] of Object.entries(bands)) {
      if (res.moves >= band.min && res.moves <= band.max && packs[name].length < band.want) {
        packs[name].push({ level, moves: res.moves });
        seen.add(level);
        break;
      }
    }
    if (attempts % 500 === 0) console.log('unblock', attempts, Object.values(packs).map((p) => p.length));
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

function sokobanCandidate(boxes: number): { text: string; pushes: number } | null {
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
  // Reverse play: walk and pull boxes.
  const steps = rng.int(60, 220);
  for (let s = 0; s < steps; s++) {
    const d = [-w, w, -1, 1][rng.int(0, 4)];
    const to = player + d;
    if (walls.has(to) || boxPos.includes(to)) continue;
    const behind = boxPos.indexOf(player - d);
    if (behind >= 0 && rng.bool(0.55)) boxPos[behind] = player;
    player = to;
  }
  if (boxPos.some((b) => goals.has(b))) return null;
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
      const i = y * w + x;
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
    hard: { boxes: 4, min: 14, want: 15 },
  };
  const packs: Record<string, { text: string; pushes: number }[]> = { easy: [], normal: [], hard: [] };
  for (const [name, spec] of Object.entries(specs)) {
    let attempts = 0;
    while (packs[name].length < spec.want && attempts++ < 20_000) {
      // Keep the best of a few candidates so levels are not trivial.
      let best: { text: string; pushes: number } | null = null;
      for (let t = 0; t < 6; t++) {
        const c = sokobanCandidate(spec.boxes);
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
