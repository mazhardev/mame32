import { at } from './paths';
import { fire, segments, shooterPos, step, swap } from './engine';
import type { State } from './engine';

/**
 * A computer player for the tests: it looks for a run of two or more of
 * the colour it holds (or the spare one) that it can see, preferring runs
 * nearest the pit, and fires at it. `skill` is how often it takes the best
 * shot rather than a random one.
 */
function visible(s: State, j: number): boolean {
  const [sx, sy] = shooterPos(s);
  const [tx, ty] = at(s.track, s.chain[j].s);
  const len = Math.hypot(tx - sx, ty - sy);
  for (let k = 0; k < s.chain.length; k++) {
    if (k === j || s.chain[k].s < 0) continue;
    const [mx, my] = at(s.track, s.chain[k].s);
    // Distance from the line of fire, only for marbles nearer than the target.
    const u = ((mx - sx) * (tx - sx) + (my - sy) * (ty - sy)) / (len * len);
    if (u <= 0 || u >= 1) continue;
    const px = sx + (tx - sx) * u;
    const py = sy + (ty - sy) * u;
    if (Math.hypot(mx - px, my - py) < 14) return false;
  }
  return true;
}

function runAt(s: State, j: number): number {
  const ch = s.chain;
  const c = ch[j].c;
  let n = 1;
  for (let k = j - 1; k >= 0 && ch[k].c === c && ch[k].s - ch[k + 1].s <= 16.5; k--) n++;
  for (let k = j + 1; k < ch.length && ch[k].c === c && ch[k - 1].s - ch[k].s <= 16.5; k++) n++;
  return n;
}

function bestTarget(s: State, color: number): { j: number; value: number } | null {
  let best: { j: number; value: number } | null = null;
  for (let j = 0; j < s.chain.length; j++) {
    const m = s.chain[j];
    if (m.c !== color || m.s < 10 || m.s > s.track.length - 4) continue;
    const run = runAt(s, j);
    const value = (run >= 2 ? 1000 : 0) + m.s / 10;
    if ((!best || value > best.value) && visible(s, j)) best = { j, value };
  }
  return best;
}

export function botTurn(s: State, skill: number, rand: () => number) {
  if (s.cool > 0 || s.shots.length || !s.chain.length) return;
  let pick = bestTarget(s, s.load);
  const alt = bestTarget(s, s.next);
  if (alt && (!pick || alt.value > pick.value + 500)) {
    swap(s);
    pick = alt;
  }
  if (!pick || rand() > skill) {
    const seg = segments(s.chain);
    const j = seg.length ? Math.floor(rand() * s.chain.length) : 0;
    pick = { j, value: 0 };
  }
  const m = s.chain[pick.j];
  // Lead the target a little: it keeps rolling while the shot flies.
  const [sx, sy] = shooterPos(s);
  const [tx, ty] = at(s.track, m.s);
  const lead = (Math.hypot(tx - sx, ty - sy) / 720) * s.speed;
  const [ax, ay] = at(s.track, m.s + lead);
  s.aim = Math.atan2(ay - sy, ax - sx);
  fire(s);
}

/** Plays from the current level until the game ends or `levels` levels are won. */
export function botPlay(s: State, skill: number, rand: () => number, levels = 1, maxSecs = 900): void {
  const start = s.stats.levelsWon;
  for (let t = 0; t < maxSecs && !s.over && s.stats.levelsWon - start < levels; t += 1 / 60) {
    botTurn(s, skill, rand);
    step(s, 1 / 60);
  }
}
