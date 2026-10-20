import type { DifficultySetting } from '@/types';
import { COLS, DX, DY, ROWS, SOFT, WALL, blast, cell, idx, inside, mid, tileX } from './maze';
import { FLAME_T, FUSE, activeBombs, blockedFor, bombAt, speedOf } from './world';
import type { Bomber, State } from './world';

/**
 * Computer bombers for battle mode.
 *
 * Every frame a bot works out when each tile will next catch fire (the
 * "danger map", following chain reactions). If its own tile is in danger it
 * runs for the nearest tile it can reach before the fire does. Otherwise it
 * heads for power-ups, rivals and blocks worth blasting, and only drops a
 * bomb when it has already found a way out of its blast.
 */
export interface Control {
  dirs: number[];
  bomb: boolean;
  detonate: boolean;
}

export interface DangerMap {
  /** Seconds until a tile is next set alight (Infinity when no bomb reaches it). */
  danger: Float32Array;
  /** Seconds a tile keeps burning from flames already alight. */
  burn: Float32Array;
}

const SKILL: Record<DifficultySetting, { think: number; aggression: number; trap: number; slack: number }> = {
  easy: { think: 0.45, aggression: 0.12, trap: 0.2, slack: 0.35 },
  normal: { think: 0.25, aggression: 0.35, trap: 0.6, slack: 0.2 },
  hard: { think: 0.1, aggression: 0.8, trap: 1, slack: 0.12 },
};

export function dangerMap(s: State, extra?: { c: number; r: number; fire: number; t: number }): DangerMap {
  const danger = new Float32Array(COLS * ROWS).fill(Infinity);
  const burn = new Float32Array(COLS * ROWS);
  for (const f of s.flames) burn[idx(f.c, f.r)] = Math.max(burn[idx(f.c, f.r)], f.t);
  const bombs = s.bombs.map((b) => ({ c: b.c, r: b.r, fire: b.fire, t: b.remote ? Math.min(b.t, 1.2) : b.t }));
  if (extra) bombs.push({ ...extra });
  const at = (c: number, r: number) => bombs.some((b) => b.c === c && b.r === r);
  const reach = bombs.map((b) => blast(s.grid, b.c, b.r, b.fire, at));
  // A bomb caught in another's blast goes off with it.
  for (let pass = 0, changed = true; changed && pass < 12; pass++) {
    changed = false;
    for (let i = 0; i < bombs.length; i++) {
      for (const tile of reach[i]) {
        for (let j = 0; j < bombs.length; j++) {
          if (bombs[j].c === tile.c && bombs[j].r === tile.r && bombs[j].t > bombs[i].t) {
            bombs[j].t = bombs[i].t;
            changed = true;
          }
        }
      }
    }
  }
  for (let i = 0; i < bombs.length; i++) for (const tile of reach[i]) danger[idx(tile.c, tile.r)] = Math.min(danger[idx(tile.c, tile.r)], bombs[i].t);
  return { danger, burn };
}

const safeTile = (m: DangerMap, i: number, at: number) => m.danger[i] === Infinity && (m.burn[i] === 0 || m.burn[i] < at - 0.25);

/**
 * A tile can be crossed if no fire is there while the bomber is in it. `at`
 * is when its middle reaches the tile; its body starts to overlap the tile a
 * little before that.
 */
function passable(m: DangerMap, i: number, at: number, step: number, slack: number): boolean {
  const enter = at - 0.2 * step - slack;
  if (m.burn[i] > 0 && m.burn[i] > enter) return false;
  const d = m.danger[i];
  return d === Infinity || at + step + slack < d || enter > d + FLAME_T;
}

interface Search {
  /** First direction taken to reach each tile (-1 for the start), or -2 if unreached. */
  first: Int8Array;
  dist: Int16Array;
  order: number[];
}

/**
 * Breadth-first search from the bomber's tile. In `strict` mode (choosing
 * where to go when not in danger) any tile a bomb will reach counts as
 * blocked; otherwise a tile only needs to be clear of fire while passing.
 */
function search(s: State, b: Bomber, m: DangerMap, slack: number, extraBlocked = -1, strict = false): Search {
  const blocked = blockedFor(s, b);
  const [c0, r0] = [tileX(b.x), tileX(b.y)];
  const step = T_TILE / speedOf(b);
  const first = new Int8Array(COLS * ROWS).fill(-2);
  const dist = new Int16Array(COLS * ROWS).fill(-1);
  const order: number[] = [];
  const start = idx(c0, r0);
  first[start] = -1;
  dist[start] = 0;
  order.push(start);
  for (let h = 0; h < order.length; h++) {
    const i = order[h];
    const c = i % COLS;
    const r = (i - c) / COLS;
    for (let d = 0; d < 4; d++) {
      const nc = c + DX[d];
      const nr = r + DY[d];
      if (!inside(nc, nr)) continue;
      const n = idx(nc, nr);
      if (dist[n] >= 0 || n === extraBlocked || blocked(nc, nr)) continue;
      const at = (dist[i] + 0.5) * step;
      if (strict ? m.danger[n] !== Infinity || m.burn[n] > 0 : !passable(m, n, at, step, slack)) continue;
      dist[n] = dist[i] + 1;
      first[n] = first[i] === -1 ? d : first[i];
      order.push(n);
    }
  }
  return { first, dist, order };
}

const T_TILE = 16;

/** Direction towards the nearest tile that stays safe, -2 if already safe, -1 if trapped. */
export function escape(s: State, b: Bomber, m: DangerMap, slack: number, extraBlocked = -1): number {
  const step = T_TILE / speedOf(b);
  const here = idx(tileX(b.x), tileX(b.y));
  if (safeTile(m, here, 0)) return -2;
  const sr = search(s, b, m, slack, extraBlocked);
  for (const i of sr.order) if (i !== here && safeTile(m, i, sr.dist[i] * step)) return sr.first[i];
  return -1;
}

function inLine(s: State, c: number, r: number, fire: number, tc: number, tr: number): boolean {
  if (c !== tc && r !== tr) return false;
  const n = Math.abs(c - tc) + Math.abs(r - tr);
  if (n > fire) return false;
  const dx = Math.sign(tc - c);
  const dy = Math.sign(tr - r);
  for (let k = 1; k < n; k++) {
    const v = cell(s.grid, c + dx * k, r + dy * k);
    if (v === WALL || v === SOFT) return false;
  }
  return true;
}

export function cpuControl(s: State, b: Bomber, dt: number, random: () => number): Control {
  const skill = SKILL[s.difficulty];
  const ctl: Control = { dirs: [], bomb: false, detonate: false };
  b.ai.think -= dt;
  b.ai.bombCool -= dt;
  const c = tileX(b.x);
  const r = tileX(b.y);
  if (b.ai.tile !== idx(c, r)) {
    b.ai.tile = idx(c, r);
    b.ai.think = Math.min(b.ai.think, 0);
  }
  const m = dangerMap(s);

  // 1. Get out of the way of fire.
  const run = escape(s, b, m, skill.slack);
  if (run >= 0) {
    ctl.dirs = [run];
    return ctl;
  }
  if (run === -1) {
    // Trapped: keep trying the least dangerous neighbour.
    let best = -1;
    let bestT = m.danger[idx(c, r)];
    for (let d = 0; d < 4; d++) {
      const nc = c + DX[d];
      const nr = r + DY[d];
      if (blockedFor(s, b)(nc, nr)) continue;
      if (m.danger[idx(nc, nr)] > bestT) {
        bestT = m.danger[idx(nc, nr)];
        best = d;
      }
    }
    if (best >= 0) ctl.dirs = [best];
    return ctl;
  }

  // Safe tile, but still straddling a tile about to burn: step fully in.
  const centred = Math.abs(b.x - mid(c)) < 3 && Math.abs(b.y - mid(r)) < 3;
  if (!centred) {
    const dx = b.x - mid(c);
    const dy = b.y - mid(r);
    const side = Math.abs(dx) > Math.abs(dy) ? idx(c + Math.sign(dx), r) : idx(c, r + Math.sign(dy));
    if (m.burn[side] > 0 || m.danger[side] < 1.2) {
      ctl.dirs = [Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : dy > 0 ? 0 : 2];
      return ctl;
    }
  }

  const rivals = s.bombers.filter((o) => o.alive && o.id !== b.id);

  // 2. Set off a remote bomb when a rival is in its path and we are clear.
  if (b.remote) {
    for (const bomb of s.bombs) {
      if (bomb.owner !== b.id || !bomb.remote) continue;
      const at = (cc: number, rr: number) => !!bombAt(s, cc, rr);
      const tiles = blast(s.grid, bomb.c, bomb.r, bomb.fire, at);
      const hitsMe = tiles.some((t) => t.c === c && t.r === r);
      const hitsRival = rivals.some((o) => tiles.some((t) => t.c === tileX(o.x) && t.r === tileX(o.y)));
      if (!hitsMe && (hitsRival || random() < dt * 0.3)) ctl.detonate = true;
    }
  }

  // 3. Drop a bomb when it would trap or threaten a rival, or open up blocks —
  //    but only when there is already a way out of the blast.
  if (centred && b.ai.bombCool <= 0 && activeBombs(s, b.id) < b.bombs && !bombAt(s, c, r)) {
    const here = idx(c, r);
    const m2 = dangerMap(s, { c, r, fire: b.fire, t: FUSE });
    const way = escape(s, { ...b, bombPass: false }, m2, skill.slack);
    if (way >= 0) {
      let trap = false;
      let threat = false;
      for (const o of rivals) {
        if (m2.danger[idx(tileX(o.x), tileX(o.y))] === Infinity) continue;
        threat = true;
        if (escape(s, o, m2, 0, here) === -1) trap = true;
      }
      let softs = 0;
      for (let d = 0; d < 4; d++) if (cell(s.grid, c + DX[d], r + DY[d]) === SOFT) softs++;
      const want = (trap && random() < skill.trap) || (threat && random() < skill.aggression * 0.3) || (softs > 0 && b.ai.goalDir === -3);
      if (want) {
        ctl.bomb = true;
        b.ai.bombCool = 0.5;
        b.ai.goalDir = way;
        b.ai.think = 0.6;
        ctl.dirs = [way];
        return ctl;
      }
    }
  }

  // 4. Head for something useful.
  if (b.ai.think <= 0) {
    b.ai.think = skill.think * (0.7 + random() * 0.6);
    const sr = search(s, b, m, skill.slack, -1, true);
    let best = Infinity;
    let goal = -1;
    let bombSpot = false;
    const consider = (i: number, cost: number, spot: boolean) => {
      if (sr.dist[i] < 0) return;
      const v = sr.dist[i] + cost;
      if (v < best) {
        best = v;
        goal = i;
        bombSpot = spot;
      }
    };
    for (const d of s.drops) if (d.safe <= 0) consider(idx(d.c, d.r), -3, false);
    for (const o of rivals) {
      const oc = tileX(o.x);
      const or = tileX(o.y);
      for (const i of sr.order) {
        const ic = i % COLS;
        const ir = (i - ic) / COLS;
        if (inLine(s, ic, ir, b.fire, oc, or)) consider(i, b.bombs > 1 || b.fire > 2 ? 0 : 2, true);
      }
    }
    for (const i of sr.order) {
      const ic = i % COLS;
      const ir = (i - ic) / COLS;
      let softs = 0;
      for (let d = 0; d < 4; d++) if (cell(s.grid, ic + DX[d], ir + DY[d]) === SOFT) softs++;
      if (softs > 0) consider(i, 5 - softs, true);
    }
    if (goal < 0) b.ai.goalDir = -1;
    else if (goal === idx(c, r)) b.ai.goalDir = bombSpot ? -3 : -1;
    else b.ai.goalDir = sr.first[goal];
  }
  if (b.ai.goalDir >= 0) {
    // Do not step into a tile that is about to burn.
    const d = b.ai.goalDir;
    const n = idx(c + DX[d], r + DY[d]);
    if (m.danger[n] === Infinity && m.burn[n] === 0) ctl.dirs = [d];
  } else if (!centred) {
    // Settle into the middle of the tile (needed to drop a bomb or turn).
    const dx = mid(c) - b.x;
    const dy = mid(r) - b.y;
    ctl.dirs = [Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0];
  }
  return ctl;
}
