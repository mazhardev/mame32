/**
 * Finds a winning sequence of shots for every Slingshot Siege level.
 *
 *   npx vite-node scripts/solve-slingshot.ts [first-last] [--out file.json]
 *   npx vite-node scripts/solve-slingshot.ts --merge a.json b.json
 *
 * The physics run in fixed steps, so a level replays identically from the
 * same shots. For each level the solver scans a grid of launch angles and
 * speeds (and, for the special stones, when to tap), keeps the most
 * destructive few shots and searches on from each of them. A win only
 * counts as the level's par if it is robust: most of the shots a degree or
 * a fraction of a metre per second either side win too, so a careful player
 * can match it. The results are written to
 * src/games/slingshot-siege/solutions.ts; the tests replay them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { MAX_ANGLE, MAX_SPEED, MIN_ANGLE, MIN_SPEED, create, playOut, playShot } from '../src/games/slingshot-siege/game';
import type { Shot } from '../src/games/slingshot-siege/game';
import { LEVEL_COUNT, level } from '../src/games/slingshot-siege/levels';
import type { Ammo } from '../src/games/slingshot-siege/levels';
import { enemiesLeft } from '../src/games/slingshot-siege/physics';
import { SOLUTIONS } from '../src/games/slingshot-siege/solutions';

const FILE = path.resolve('src/games/slingshot-siege/solutions.ts');
const BRANCH = 4;

interface Outcome {
  shots: Shot[];
  won: boolean;
  kills: number;
  score: number;
}

function play(index: number, shots: Shot[]): Outcome {
  const s = create('normal', index);
  const start = enemiesLeft(s.phys);
  for (const shot of shots) {
    if (s.over || s.phase !== 'aim') break;
    playShot(s, shot);
  }
  if (s.phase === 'lost' || s.phase === 'clear' || s.phase === 'bonus') playOut(s);
  const left = enemiesLeft(s.phys);
  return { shots, won: left === 0, kills: start - left, score: s.score };
}

const value = (o: Outcome) => o.kills * 100000 + o.score;

const DEG = 180 / Math.PI;
/** Only shots a player can actually make: the sling's angle and speed limits. */
const possible = (s: Shot) => s.v >= MIN_SPEED && s.v <= MAX_SPEED && s.a >= MIN_ANGLE * DEG && s.a <= MAX_ANGLE * DEG;

function range(a: number, b: number, step: number): number[] {
  const out: number[] = [];
  for (let x = a; x <= b + 1e-9; x += step) out.push(Math.round(x * 100) / 100);
  return out;
}

function taps(ammo: Ammo): (number | undefined)[] {
  if (ammo === 'triple' || ammo === 'zoomer') return [undefined, 25, 40, 55, 70];
  if (ammo === 'kaboom') return [undefined, 45, 65, 85];
  return [undefined];
}

/** Most of the neighbouring shots a player could make win as well. */
function robust(index: number, prefix: Shot[], shot: Shot): boolean {
  const near: Shot[] = [
    { ...shot, a: shot.a - 1 },
    { ...shot, a: shot.a + 1 },
    { ...shot, v: shot.v - 0.3 },
    { ...shot, v: shot.v + 0.3 },
  ].filter(possible);
  return near.filter((n) => play(index, [...prefix, n]).won).length >= Math.ceil(near.length * 0.75);
}

function scan(index: number, prefix: Shot[], ammo: Ammo, fine: boolean): Outcome[] {
  const out: Outcome[] = [];
  const angles = range(-5, 75, 5);
  const speeds = fine ? range(9, 23, 1) : range(9, 23, 1.5);
  for (const tap of taps(ammo))
    for (const a of angles)
      for (const v of speeds) out.push(play(index, [...prefix, tap === undefined ? { a, v } : { a, v, tap }]));
  // Refine around the most destructive shots.
  const best = [...out].sort((x, y) => value(y) - value(x)).slice(0, 8);
  for (const o of best) {
    const base = o.shots[o.shots.length - 1];
    for (const da of [-2.5, -1.25, 1.25, 2.5])
      for (const dv of [-0.5, 0, 0.5]) {
        const shot = { ...base, a: base.a + da, v: base.v + dv };
        if (possible(shot)) out.push(play(index, [...prefix, shot]));
      }
  }
  return out;
}

function solve(index: number): { shots: Shot[]; robust: boolean } | null {
  const ammo = level(index).ammo;
  let frontier: Shot[][] = [[]];
  let fallback: Shot[] | null = null;
  for (let depth = 0; depth < ammo.length; depth++) {
    const pool: Outcome[] = [];
    for (const prefix of frontier) {
      const results = scan(index, prefix, ammo[depth], depth === 0);
      const wins = results.filter((r) => r.won).sort((x, y) => y.score - x.score);
      for (const w of wins.slice(0, 12)) {
        if (robust(index, prefix, w.shots[w.shots.length - 1])) return { shots: w.shots, robust: true };
      }
      if (wins.length && !fallback) fallback = wins[0].shots;
      pool.push(...results.filter((r) => !r.won));
    }
    // Carry on from the most destructive shots, avoiding near-duplicates.
    pool.sort((x, y) => value(y) - value(x));
    const next: Shot[][] = [];
    for (const o of pool) {
      const last = o.shots[o.shots.length - 1];
      const similar = next.some((n) => {
        const l = n[n.length - 1];
        return n.length === o.shots.length && Math.abs(l.a - last.a) < 6 && Math.abs(l.v - last.v) < 2;
      });
      if (!similar) next.push(o.shots);
      if (next.length >= BRANCH) break;
    }
    frontier = next;
  }
  return fallback ? { shots: fallback, robust: false } : null;
}

function writeAll(all: (Shot[] | undefined)[]) {
  const rows = all.map((shots, i) => {
    const body = (shots ?? []).map((s) => `{ a: ${s.a}, v: ${s.v}${s.tap !== undefined ? `, tap: ${s.tap}` : ''} }`).join(', ');
    return `  // ${i + 1}. ${level(i).name}\n  [${body}],`;
  });
  const text = `import type { Shot } from './game';

/**
 * Generated by scripts/solve-slingshot.ts: a winning sequence of shots for
 * every level (angle in degrees, speed in m/s, and the step after launch at
 * which to tap for the special move). The number of shots is the level's par.
 */
export const SOLUTIONS: Shot[][] = [
${rows.join('\n')}
];
`;
  writeFileSync(FILE, text);
}

const args = process.argv.slice(2);
if (args[0] === '--merge') {
  const all: (Shot[] | undefined)[] = Array.from({ length: LEVEL_COUNT }, (_, i) => SOLUTIONS[i]);
  for (const f of args.slice(1)) {
    const found = JSON.parse(readFileSync(f, 'utf8')) as Record<string, Shot[]>;
    for (const [k, v] of Object.entries(found)) all[Number(k)] = v;
  }
  writeAll(all);
  console.log('merged into', FILE);
} else {
  const spec = args.find((a) => /^\d+(-\d+)?$/.test(a));
  const outAt = args.indexOf('--out');
  const [first, last] = spec ? spec.split('-').map(Number) : [1, LEVEL_COUNT];
  const found: Record<number, Shot[]> = {};
  for (let i = first - 1; i <= (last ?? first) - 1; i++) {
    const t0 = Date.now();
    const r = solve(i);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    if (!r) console.log(`level ${i + 1} ${level(i).name}: NO SOLUTION (${secs}s)`);
    else {
      found[i] = r.shots;
      console.log(`level ${i + 1} ${level(i).name}: ${r.shots.length} shot(s)${r.robust ? '' : ' (fragile)'} ${JSON.stringify(r.shots)} (${secs}s)`);
    }
    if (outAt >= 0) writeFileSync(args[outAt + 1], JSON.stringify(found));
  }
  if (outAt < 0) {
    const all: (Shot[] | undefined)[] = Array.from({ length: LEVEL_COUNT }, (_, i) => found[i] ?? SOLUTIONS[i]);
    writeAll(all);
  }
}
