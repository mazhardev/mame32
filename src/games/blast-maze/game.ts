import type { DifficultySetting } from '@/types';
import type { SoundName } from '@/services/audio';
import { baseState } from '../_shared/arcade/kit';
import type { Input } from '../_shared/arcade/kit';
import { burst, updateSparks } from '../_shared/arcade/draw';
import { cpuControl } from './ai';
import type { Control } from './ai';
import { COLS, DX, DY, FLOOR, H, ROWS, SOFT, T, W, WALL, blast, cell, idx, mid, slide, stepToward, tileX } from './maze';
import { AREAS, CORNERS, ITEM_KINDS, PER_AREA, STAGES, buildBattle, buildStage, stagePlan } from './stages';
import type { EnemyKind, ItemKind } from './stages';
import {
  CRUMBLE_T,
  FLAME_T,
  FUSE,
  MAX_BOMBS,
  MAX_FIRE,
  MAX_SPEED,
  REMOTE_T,
  activeBombs,
  blockedFor,
  bombAt,
  overlapsTile,
  speedOf,
} from './world';
import type { Bomb, Bomber, Boss, Enemy, Mode, State } from './world';

/** Blast Maze rules: adventure stages and battle rounds share one engine. */

export const DIFFICULTY: Record<DifficultySetting, { lives: number; enemySpeed: number; bossHp: number }> = {
  easy: { lives: 5, enemySpeed: 0.85, bossHp: 0.75 },
  normal: { lives: 3, enemySpeed: 1, bossHp: 1 },
  hard: { lives: 3, enemySpeed: 1.15, bossHp: 1.3 },
};

export const ENEMY: Record<EnemyKind, { speed: number; points: number; ghost: boolean; smart: boolean }> = {
  puffle: { speed: 26, points: 100, ghost: false, smart: false },
  bouncer: { speed: 38, points: 200, ghost: false, smart: false },
  ghostie: { speed: 30, points: 400, ghost: true, smart: false },
  chaser: { speed: 40, points: 800, ghost: false, smart: true },
  zapper: { speed: 60, points: 1000, ghost: false, smart: false },
  splitter: { speed: 34, points: 500, ghost: false, smart: false },
  mini: { speed: 36, points: 100, ghost: false, smart: false },
  hurry: { speed: 52, points: 100, ghost: true, smart: true },
};

const RANK: EnemyKind[] = ['puffle', 'bouncer', 'ghostie', 'splitter', 'chaser', 'zapper'];
const BOSS_HP = [6, 8, 8, 10, 14];
const ROUNDS_TO_WIN = 3;
const BATTLE_TIME = 120;

const sound = (s: State, n: SoundName) => {
  if (!s.events.includes(n)) s.events.push(n);
};

function pop(s: State, x: number, y: number, text: string) {
  s.pops.push({ x, y, t: 1, text });
}

function addScore(s: State, n: number, x?: number, y?: number) {
  if (s.mode !== 'adventure') return;
  s.score += n;
  if (x !== undefined && y !== undefined) pop(s, x, y, String(n));
  while (s.score >= s.nextLife) {
    s.nextLife += 40000;
    s.lives++;
    sound(s, 'powerup');
    pop(s, W / 2, H / 2, '1UP');
  }
}

function newBomber(id: number, c: number, r: number, cpu: boolean): Bomber {
  return {
    id,
    x: mid(c),
    y: mid(r),
    dir: 2,
    moving: false,
    bombs: 1,
    fire: cpu ? 2 : 1,
    speed: 0,
    remote: false,
    kick: false,
    pass: false,
    bombPass: false,
    vest: 0,
    alive: true,
    deadT: 0,
    cpu,
    anim: 0,
    wins: 0,
    kills: 0,
    ai: { think: 0, goalDir: -1, bombCool: 0.5, tile: -1 },
  };
}

function newEnemy(kind: EnemyKind, c: number, r: number): Enemy {
  return { kind, x: mid(c), y: mid(r), tc: c, tr: r, dir: 2, alive: true, deadT: 0, anim: Math.random() * 6 };
}

/** Interior tiles from the outside ring inwards, clockwise — the order sudden death fills them. */
function spiralOrder(): number[] {
  const out: number[] = [];
  let top = 1;
  let left = 1;
  let bottom = ROWS - 2;
  let right = COLS - 2;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(idx(c, top));
    for (let r = top + 1; r <= bottom; r++) out.push(idx(right, r));
    if (top < bottom) for (let c = right - 1; c >= left; c--) out.push(idx(c, bottom));
    if (left < right) for (let r = bottom - 1; r > top; r--) out.push(idx(left, r));
    top++;
    left++;
    bottom--;
    right--;
  }
  return out;
}

function resetWorld(s: State) {
  s.bombs = [];
  s.flames = [];
  s.burning = new Uint8Array(COLS * ROWS);
  s.pressure = new Uint8Array(COLS * ROWS);
  s.drops = [];
  s.crumbles = [];
  s.enemies = [];
  s.boss = null;
  s.pops = [];
  s.sparks = [];
  s.booms = {};
  s.hurried = false;
  s.penaltyT = 0;
  s.spiralT = 0;
  s.endT = -1;
}

/** Loads an adventure stage, keeping the player's power-ups. */
export function loadStage(s: State, index: number) {
  const plan = stagePlan(index);
  const layout = buildStage(plan);
  resetWorld(s);
  s.plan = plan;
  s.stage = index;
  s.reached = Math.max(s.reached, index);
  s.grid = layout.grid;
  s.hidden = layout.hidden;
  s.exit = layout.exit >= 0 ? { i: layout.exit, revealed: false, open: false, safe: 0 } : null;
  s.enemies = layout.enemies.map((e) => newEnemy(e.kind, e.c, e.r));
  const p = s.bombers[0];
  p.x = mid(1);
  p.y = mid(1);
  p.dir = 2;
  p.alive = true;
  p.deadT = 0;
  if (plan.boss !== null) {
    const hp = Math.round(BOSS_HP[plan.boss] * DIFFICULTY[s.difficulty].bossHp);
    s.boss = { kind: plan.boss, x: mid(COLS - 4), y: mid(ROWS - 4), vx: -30, vy: -20, hp, maxHp: hp, invuln: 1.5, t: 0, spawn: 4, vis: 1, state: 0, alive: true, deadT: 0 };
    s.exit = { i: idx(7, 6), revealed: false, open: false, safe: 0 };
  }
  s.clock = plan.time;
  s.phase = 'intro';
  s.phaseT = 1.8;
}

export function startRound(s: State, random: () => number) {
  const layout = buildBattle(random);
  resetWorld(s);
  s.grid = layout.grid;
  s.hidden = layout.hidden;
  s.exit = null;
  s.round++;
  s.bombers.forEach((b, i) => {
    const [c, r] = CORNERS[i];
    Object.assign(b, newBomber(b.id, c, r, b.cpu), { wins: b.wins, kills: b.kills });
  });
  s.clock = BATTLE_TIME;
  s.spiral = spiralOrder();
  s.roundWinner = -1;
  s.phase = 'intro';
  s.phaseT = 1.8;
}

export function create(difficulty: DifficultySetting, random: () => number, mode: Mode = 'adventure', startStage = 0): State {
  const s = {
    ...baseState(),
    mode,
    difficulty,
    stage: startStage,
    plan: stagePlan(startStage),
    bombers: mode === 'battle' ? [0, 1, 2, 3].map((i) => newBomber(i, CORNERS[i][0], CORNERS[i][1], i > 0)) : [newBomber(0, 1, 1, false)],
    lives: DIFFICULTY[difficulty].lives,
    boomId: 0,
    shake: 0,
    round: 0,
    spiral: [],
    roundWinner: -1,
    endT: -1,
    won: false,
    reached: startStage,
    nextLife: 20000,
    stats: { bestChain: 0, bosses: 0, cleared: 0, deaths: 0, maxFire: 1, roundsWon: 0, matchWon: false },
  } as unknown as State;
  resetWorld(s);
  if (mode === 'battle') startRound(s, random);
  else loadStage(s, startStage);
  return s;
}

/* ------------------------------------------------------------- bombers */

function humanControl(b: Bomber, input: Input): Control {
  const keys = ['up', 'right', 'down', 'left'] as const;
  const dirs: number[] = [];
  for (let d = 0; d < 4; d++) if (input.pressed.has(keys[d])) dirs.push(d);
  // Turning takes priority over going straight, so corners are easy to take.
  for (let d = 0; d < 4; d++) if (input.held.has(keys[d]) && !dirs.includes(d) && d % 2 !== b.dir % 2) dirs.push(d);
  for (let d = 0; d < 4; d++) if (input.held.has(keys[d]) && !dirs.includes(d)) dirs.push(d);
  return { dirs, bomb: input.pressed.has('action'), detonate: input.pressed.has('action2') };
}

function placeBomb(s: State, b: Bomber): boolean {
  const c = tileX(b.x);
  const r = tileX(b.y);
  if (activeBombs(s, b.id) >= b.bombs || bombAt(s, c, r) || cell(s.grid, c, r) !== FLOOR) return false;
  const pass = s.bombers.filter((o) => o.alive && overlapsTile(o, c, r)).map((o) => o.id);
  s.bombs.push({ c, r, x: mid(c), y: mid(r), t: b.remote ? REMOTE_T : FUSE, fire: b.fire, owner: b.id, remote: b.remote, pass, kick: -1 });
  sound(s, 'blip');
  return true;
}

function moveBomber(s: State, b: Bomber, ctl: Control, dt: number) {
  const dist = speedOf(b) * dt;
  const blocked = blockedFor(s, b);
  b.moving = false;
  for (const d of ctl.dirs) {
    if (slide(b, DX[d], DY[d], dist, blocked)) {
      b.dir = d;
      b.moving = true;
      break;
    }
  }
  if (!b.moving && ctl.dirs.length) {
    const d = ctl.dirs[0];
    b.dir = d;
    // Kick a bomb sitting right in front.
    const c = tileX(b.x);
    const r = tileX(b.y);
    const bomb = bombAt(s, c + DX[d], r + DY[d]);
    if (b.kick && bomb && bomb.kick < 0 && Math.abs(b.x - mid(c)) < 2 && Math.abs(b.y - mid(r)) < 2) {
      bomb.kick = d;
      sound(s, 'hit');
    } else if (b.cpu) {
      // Bots ease back to the middle of their tile so they can turn.
      const c2 = mid(c);
      const r2 = mid(r);
      if (Math.abs(b.x - c2) > 0.01) slide(b, Math.sign(c2 - b.x), 0, Math.min(dist, Math.abs(c2 - b.x)), blocked);
      else if (Math.abs(b.y - r2) > 0.01) slide(b, 0, Math.sign(r2 - b.y), Math.min(dist, Math.abs(r2 - b.y)), blocked);
    }
  }
  if (b.moving) b.anim += dt * 10;
}

function killBomber(s: State, b: Bomber) {
  if (!b.alive || b.vest > 0) return;
  b.alive = false;
  b.deadT = 1.2;
  sound(s, 'failure');
  burst(s.sparks, b.x, b.y, '#fde047', 14, 90);
  if (s.mode === 'adventure') {
    s.phase = 'dying';
    s.phaseT = 2.2;
    s.stats.deaths++;
  }
}

function collect(s: State, b: Bomber, kind: ItemKind) {
  switch (kind) {
    case 'bomb':
      b.bombs = Math.min(MAX_BOMBS, b.bombs + 1);
      break;
    case 'fire':
      b.fire = Math.min(MAX_FIRE, b.fire + 1);
      break;
    case 'speed':
      b.speed = Math.min(MAX_SPEED, b.speed + 1);
      break;
    case 'remote':
      b.remote = true;
      break;
    case 'kick':
      b.kick = true;
      break;
    case 'pass':
      b.pass = true;
      break;
    case 'bombpass':
      b.bombPass = true;
      break;
    case 'vest':
      b.vest = 15;
      break;
    case 'life':
      s.lives++;
      break;
  }
  if (b.id === 0) {
    s.stats.maxFire = Math.max(s.stats.maxFire, b.fire);
    addScore(s, 1000, b.x, b.y - 6);
  }
  sound(s, 'powerup');
}

/* --------------------------------------------------------------- bombs */

function explode(s: State, bomb: Bomb) {
  s.bombs = s.bombs.filter((b) => b !== bomb);
  const boom = ++s.boomId;
  s.booms[boom] = 0;
  const tiles = blast(s.grid, bomb.c, bomb.r, bomb.fire, (c, r) => !!bombAt(s, c, r));
  for (const t of tiles) {
    const i = idx(t.c, t.r);
    if (s.grid[i] === SOFT) {
      s.grid[i] = FLOOR;
      s.crumbles.push({ c: t.c, r: t.r, t: CRUMBLE_T });
      if (bomb.owner === 0) addScore(s, 10);
      if (s.hidden[i] >= 0) {
        s.drops.push({ c: t.c, r: t.r, kind: ITEM_KINDS[s.hidden[i]], safe: FLAME_T + 0.1 });
        s.hidden[i] = -1;
      }
      if (s.exit && s.exit.i === i && !s.exit.revealed) {
        s.exit.revealed = true;
        s.exit.safe = FLAME_T + 0.1;
      }
    }
    const other = bombAt(s, t.c, t.r);
    if (other) other.t = Math.min(other.t, 0.06);
    s.flames.push({ c: t.c, r: t.r, t: FLAME_T, dir: t.dir, end: t.end, owner: bomb.owner, boom });
  }
  s.shake = Math.min(1, s.shake + 0.35);
  sound(s, 'explosion');
}

function updateBombs(s: State, dt: number) {
  for (const b of s.bombs) {
    b.pass = b.pass.filter((id) => {
      const o = s.bombers.find((x) => x.id === id);
      return !!o && o.alive && overlapsTile(o, b.c, b.r);
    });
    if (b.kick >= 0) {
      const occupied = (c: number, r: number) =>
        cell(s.grid, c, r) !== FLOOR ||
        s.bombs.some((o) => o !== b && o.c === c && o.r === r) ||
        s.enemies.some((e) => e.alive && tileX(e.x) === c && tileX(e.y) === r) ||
        s.bombers.some((o) => o.alive && tileX(o.x) === c && tileX(o.y) === r && !b.pass.includes(o.id));
      const moved = slide(b, DX[b.kick], DY[b.kick], 130 * dt, occupied);
      b.c = tileX(b.x);
      b.r = tileX(b.y);
      if (!moved) {
        b.kick = -1;
        b.x = mid(b.c);
        b.y = mid(b.r);
      }
    }
    b.t -= dt;
  }
  for (let guard = 0; guard < 50; guard++) {
    const due = s.bombs.find((b) => b.t <= 0);
    if (!due) break;
    explode(s, due);
  }
}

function detonate(s: State, b: Bomber) {
  const mine = s.bombs.filter((x) => x.owner === b.id && x.remote);
  if (mine.length) mine[0].t = 0;
}

/* -------------------------------------------------------------- flames */

function updateFlames(s: State, dt: number) {
  s.burning.fill(0);
  for (const f of s.flames) {
    f.t -= dt;
    if (f.t > 0) s.burning[idx(f.c, f.r)] = 1;
  }
  s.flames = s.flames.filter((f) => f.t > 0);
  for (const c of s.crumbles) c.t -= dt;
  s.crumbles = s.crumbles.filter((c) => c.t > 0);

  const burningAt = (c: number, r: number) => s.burning[idx(c, r)] === 1;
  const flameAt = (c: number, r: number) => s.flames.find((f) => f.c === c && f.r === r && f.t > 0);

  // Bombs caught in fire go off.
  for (const b of s.bombs) if (burningAt(b.c, b.r)) b.t = Math.min(b.t, 0.06);

  for (const d of s.drops) d.safe -= dt;
  const burnt = s.drops.filter((d) => d.safe <= 0 && burningAt(d.c, d.r));
  for (const d of burnt) burst(s.sparks, mid(d.c), mid(d.r), '#f472b6', 8, 70);
  s.drops = s.drops.filter((d) => !burnt.includes(d));

  // Blasting the open exit lets more monsters out.
  if (s.exit && s.exit.revealed) {
    s.exit.safe -= dt;
    const c = s.exit.i % COLS;
    const r = Math.floor(s.exit.i / COLS);
    if (s.exit.safe <= 0 && burningAt(c, r) && s.penaltyT <= 0 && s.mode === 'adventure' && s.plan.boss === null) {
      s.penaltyT = 4;
      const kind = s.plan.enemies.reduce<EnemyKind>((a, k) => (RANK.indexOf(k) > RANK.indexOf(a) ? k : a), 'puffle');
      for (let k = 0; k < 3; k++) s.enemies.push(newEnemy(kind, c, r));
      s.exit.open = false;
      pop(s, mid(c), mid(r) - 8, 'Uh-oh!');
      sound(s, 'whoosh');
    }
  }

  for (const b of s.bombers) {
    if (!b.alive) continue;
    // Forgiving: only the middle of a bomber counts, so stepping out of a tile is enough.
    for (const [ox, oy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
      if (burningAt(tileX(b.x + ox), tileX(b.y + oy))) {
        const f = flameAt(tileX(b.x + ox), tileX(b.y + oy));
        if (b.vest <= 0 && f && f.owner >= 0 && f.owner !== b.id && s.mode === 'battle') {
          const killer = s.bombers.find((o) => o.id === f.owner);
          if (killer) killer.kills++;
        }
        killBomber(s, b);
        break;
      }
    }
  }

  for (const e of s.enemies) {
    if (!e.alive) continue;
    const f = flameAt(tileX(e.x), tileX(e.y));
    if (!f) continue;
    e.alive = false;
    e.deadT = 0.7;
    const k = ++s.booms[f.boom];
    s.stats.bestChain = Math.max(s.stats.bestChain, k);
    addScore(s, Math.min(12800, ENEMY[e.kind].points * 2 ** (k - 1)), e.x, e.y - 6);
    sound(s, 'hit');
    if (e.kind === 'splitter') for (let n = 0; n < 2; n++) s.enemies.push(newEnemy('mini', tileX(e.x), tileX(e.y)));
  }

  const boss = s.boss;
  if (boss && boss.alive && boss.invuln <= 0 && boss.vis > 0.5) {
    const hit = s.flames.find((f) => f.owner !== -1 && Math.abs(mid(f.c) - boss.x) < T / 2 + 12 && Math.abs(mid(f.r) - boss.y) < T / 2 + 12);
    if (hit) hurtBoss(s, boss);
  }
}

/* ------------------------------------------------------------- enemies */

function enemyBlocked(s: State, e: Enemy, c: number, r: number): boolean {
  const v = cell(s.grid, c, r);
  if (v === WALL) return true;
  if (v === SOFT && !ENEMY[e.kind].ghost) return true;
  return !!bombAt(s, c, r);
}

function chooseNext(s: State, e: Enemy, random: () => number) {
  const opts = [0, 1, 2, 3].filter((d) => !enemyBlocked(s, e, e.tc + DX[d], e.tr + DY[d]));
  if (!opts.length) return;
  const p = s.bombers[0];
  let d = -1;
  if (ENEMY[e.kind].smart && p.alive && random() < 0.85) {
    const step = stepToward(e.tc, e.tr, idx(tileX(p.x), tileX(p.y)), (c, r) => enemyBlocked(s, e, c, r));
    if (opts.includes(step)) d = step;
  }
  if (d < 0) {
    if (opts.includes(e.dir) && random() < 0.72) d = e.dir;
    else {
      const fresh = opts.filter((o) => o !== (e.dir + 2) % 4);
      const pool = fresh.length ? fresh : opts;
      d = pool[Math.floor(random() * pool.length)];
    }
  }
  e.dir = d;
  e.tc += DX[d];
  e.tr += DY[d];
}

function updateEnemies(s: State, dt: number, random: () => number) {
  const speed = DIFFICULTY[s.difficulty].enemySpeed;
  for (const e of s.enemies) {
    if (!e.alive) {
      e.deadT -= dt;
      continue;
    }
    e.anim += dt * 6;
    // A bomb dropped in the way: turn back.
    if (enemyBlocked(s, e, e.tc, e.tr) && (tileX(e.x) !== e.tc || tileX(e.y) !== e.tr)) {
      e.tc = tileX(e.x);
      e.tr = tileX(e.y);
      e.dir = (e.dir + 2) % 4;
    }
    const dx = mid(e.tc) - e.x;
    const dy = mid(e.tr) - e.y;
    const dist = Math.hypot(dx, dy);
    const step = ENEMY[e.kind].speed * speed * dt;
    if (dist <= step) {
      e.x = mid(e.tc);
      e.y = mid(e.tr);
      chooseNext(s, e, random);
    } else {
      e.x += (dx / dist) * step;
      e.y += (dy / dist) * step;
    }
  }
  s.enemies = s.enemies.filter((e) => e.alive || e.deadT > 0);
  const p = s.bombers[0];
  if (p.alive && p.vest <= 0) {
    for (const e of s.enemies) {
      if (e.alive && Math.abs(e.x - p.x) < 10 && Math.abs(e.y - p.y) < 10) {
        killBomber(s, p);
        break;
      }
    }
  }
}

/* ---------------------------------------------------------------- boss */

function hurtBoss(s: State, boss: Boss) {
  boss.hp--;
  boss.invuln = 1;
  sound(s, 'hit');
  burst(s.sparks, boss.x, boss.y, '#fde047', 12, 120);
  if (boss.hp <= 0) {
    boss.alive = false;
    boss.deadT = 2;
    s.stats.bosses++;
    addScore(s, 10000 * (boss.kind + 1), boss.x, boss.y - 14);
    sound(s, 'explosion');
    s.shake = 1;
    for (const e of s.enemies) if (e.alive) {
      e.alive = false;
      e.deadT = 0.7;
    }
  }
}

function spawnMinion(s: State, kind: EnemyKind, boss: Boss) {
  if (s.enemies.filter((e) => e.alive).length >= 5) return;
  let c = tileX(boss.x);
  let r = tileX(boss.y);
  if (cell(s.grid, c, r) !== FLOOR) {
    c += c % 2 === 0 ? 1 : 0;
    r += r % 2 === 0 ? 1 : 0;
  }
  if (cell(s.grid, c, r) === FLOOR) s.enemies.push(newEnemy(kind, c, r));
}

function updateBoss(s: State, dt: number, random: () => number) {
  const boss = s.boss!;
  if (!boss.alive) {
    boss.deadT -= dt;
    if (Math.random() < dt * 12) burst(s.sparks, boss.x + (Math.random() - 0.5) * 30, boss.y + (Math.random() - 0.5) * 30, '#fb923c', 6, 80);
    return;
  }
  boss.t += dt;
  boss.invuln = Math.max(0, boss.invuln - dt);
  boss.spawn -= dt;
  const p = s.bombers[0];
  const rage = boss.hp <= boss.maxHp / 2 ? 1.3 : 1;
  const sp = DIFFICULTY[s.difficulty].enemySpeed * rage;
  const toward = (speed: number) => {
    const dx = p.x - boss.x;
    const dy = p.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    boss.vx += ((dx / d) * speed - boss.vx) * Math.min(1, dt * 2);
    boss.vy += ((dy / d) * speed - boss.vy) * Math.min(1, dt * 2);
  };
  const dropBomb = (fire: number) => {
    const c = tileX(boss.x);
    const r = tileX(boss.y);
    if (cell(s.grid, c, r) === FLOOR && !bombAt(s, c, r)) s.bombs.push({ c, r, x: mid(c), y: mid(r), t: FUSE, fire, owner: -1, remote: false, pass: [], kick: -1 });
  };
  switch (boss.kind) {
    case 0: // King Puffle: lumbers after you and calls its children.
      toward(22 * sp);
      if (boss.spawn <= 0) {
        boss.spawn = 6;
        spawnMinion(s, 'puffle', boss);
        spawnMinion(s, 'puffle', boss);
      }
      break;
    case 1: // Sandwing: sweeps the arena, then dives at you.
      if (boss.state === 0) {
        boss.vx = (boss.vx >= 0 ? 1 : -1) * 50 * sp;
        boss.vy = Math.sin(boss.t * 2) * 30;
        if (boss.spawn <= 0) {
          boss.state = 1;
          boss.spawn = 1.3;
          sound(s, 'whoosh');
        }
      } else {
        toward(95 * sp);
        if (boss.spawn <= 0) {
          boss.state = 0;
          boss.spawn = 4.5;
          spawnMinion(s, 'bouncer', boss);
        }
      }
      break;
    case 2: // Phantom Lord: vanishes, reappears near you.
      if (boss.state === 0) {
        toward(18 * sp);
        boss.vis = Math.min(1, boss.vis + dt * 2);
        if (boss.spawn <= 0) {
          boss.state = 1;
          boss.spawn = 1.4;
        }
      } else {
        boss.vis = Math.max(0, boss.vis - dt * 2);
        boss.vx = 0;
        boss.vy = 0;
        if (boss.spawn <= 0) {
          const a = random() * Math.PI * 2;
          boss.x = p.x + Math.cos(a) * 64;
          boss.y = p.y + Math.sin(a) * 64;
          boss.state = 0;
          boss.spawn = 4.5;
          if (random() < 0.6) spawnMinion(s, 'ghostie', boss);
        }
      }
      break;
    case 3: // Gearhead: bounces around the walls dropping bombs.
      if (Math.abs(boss.vx) < 1) boss.vx = 40;
      if (Math.abs(boss.vy) < 1) boss.vy = 32;
      boss.vx = Math.sign(boss.vx) * 42 * sp;
      boss.vy = Math.sign(boss.vy) * 34 * sp;
      if (boss.spawn <= 0) {
        boss.spawn = 3;
        dropBomb(3);
      }
      break;
    default: // Dread Reactor: everything at once.
      toward(26 * sp);
      if (boss.spawn <= 0) {
        boss.spawn = 4;
        boss.state = (boss.state + 1) % 3;
        if (boss.state === 0) spawnMinion(s, 'zapper', boss);
        else dropBomb(4);
      }
  }
  boss.x += boss.vx * dt;
  boss.y += boss.vy * dt;
  const lo = T + 12;
  if (boss.x < lo || boss.x > W - lo) {
    boss.x = Math.max(lo, Math.min(W - lo, boss.x));
    boss.vx = -boss.vx;
  }
  if (boss.y < lo || boss.y > H - lo) {
    boss.y = Math.max(lo, Math.min(H - lo, boss.y));
    boss.vy = -boss.vy;
  }
  if (p.alive && boss.vis > 0.5 && Math.abs(p.x - boss.x) < 18 && Math.abs(p.y - boss.y) < 18) killBomber(s, p);
}

/* ---------------------------------------------------------- the world */

function stepWorld(s: State, dt: number, input: Input, random: () => number) {
  s.clock = Math.max(0, s.clock - dt);
  s.penaltyT = Math.max(0, s.penaltyT - dt);
  for (const b of s.bombers) {
    if (!b.alive) {
      b.deadT -= dt;
      continue;
    }
    b.vest = Math.max(0, b.vest - dt);
    const ctl = b.cpu ? cpuControl(s, b, dt, random) : humanControl(b, input);
    if (ctl.bomb) placeBomb(s, b);
    if (ctl.detonate && b.remote) detonate(s, b);
    moveBomber(s, b, ctl, dt);
    const d = s.drops.find((x) => x.safe <= 0 && x.c === tileX(b.x) && x.r === tileX(b.y));
    if (d) {
      s.drops = s.drops.filter((x) => x !== d);
      collect(s, b, d.kind);
    }
  }
  updateBombs(s, dt);
  updateFlames(s, dt);
  if (s.mode === 'adventure') {
    updateEnemies(s, dt, random);
    if (s.boss) updateBoss(s, dt, random);
  }
}

function hurryUp(s: State, random: () => number) {
  s.hurried = true;
  sound(s, 'whoosh');
  pop(s, W / 2, H / 2, 'Hurry up!');
  const p = s.bombers[0];
  const spots: [number, number][] = [];
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) if (cell(s.grid, c, r) !== WALL && Math.abs(c - tileX(p.x)) + Math.abs(r - tileX(p.y)) > 8) spots.push([c, r]);
  for (let k = 0; k < 4 && spots.length; k++) {
    const [c, r] = spots.splice(Math.floor(random() * spots.length), 1)[0];
    s.enemies.push(newEnemy('hurry', c, r));
  }
}

function adventurePlay(s: State, dt: number, input: Input, random: () => number) {
  stepWorld(s, dt, input, random);
  if (s.phase !== 'play') return;
  if (s.clock <= 0 && !s.hurried) hurryUp(s, random);
  const alive = s.enemies.some((e) => e.alive) || (s.boss && s.boss.alive);
  if (s.exit && !alive) {
    if (s.plan.boss !== null && !s.exit.revealed && (!s.boss || s.boss.deadT <= 0)) {
      s.exit.revealed = true;
      s.exit.safe = 0.5;
    }
    if (s.exit.revealed && !s.exit.open) {
      s.exit.open = true;
      sound(s, 'success');
    }
  }
  const p = s.bombers[0];
  if (s.exit?.open && p.alive && idx(tileX(p.x), tileX(p.y)) === s.exit.i && Math.abs(p.x - mid(tileX(p.x))) < 5 && Math.abs(p.y - mid(tileX(p.y))) < 5) {
    s.phase = 'clear';
    s.phaseT = 0;
    sound(s, 'levelComplete');
  }
}

function battlePlay(s: State, dt: number, input: Input, random: () => number) {
  stepWorld(s, dt, input, random);
  // Sudden death: the arena closes in.
  if (s.clock <= 0) {
    s.spiralT -= dt;
    while (s.spiralT <= 0 && s.spiral.length) {
      s.spiralT += 0.16;
      const i = s.spiral.shift()!;
      if (s.grid[i] === WALL) continue;
      s.grid[i] = WALL;
      s.pressure[i] = 1;
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      s.bombs = s.bombs.filter((b) => b.c !== c || b.r !== r);
      s.drops = s.drops.filter((d) => d.c !== c || d.r !== r);
      for (const b of s.bombers) if (b.alive && tileX(b.x) === c && tileX(b.y) === r) {
        b.vest = 0;
        killBomber(s, b);
      }
      sound(s, 'hit');
      break;
    }
  }
  const alive = s.bombers.filter((b) => b.alive);
  if (alive.length <= 1 && s.endT < 0) s.endT = 1.2;
  if (s.endT >= 0) {
    s.endT -= dt;
    if (s.endT <= 0) {
      const still = s.bombers.filter((b) => b.alive);
      s.roundWinner = still.length === 1 ? still[0].id : -1;
      if (still.length === 1) {
        still[0].wins++;
        if (still[0].id === 0) {
          s.stats.roundsWon++;
          sound(s, 'success');
        }
      }
      s.score = s.bombers[0].wins * 1000 + s.bombers[0].kills * 300;
      s.phase = 'roundEnd';
      s.phaseT = 2.6;
    }
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.pops = s.pops.filter((q) => (q.t -= dt) > 0);
  updateSparks(s.sparks, dt, 120);
  s.shake = Math.max(0, s.shake - dt * 3);
  switch (s.phase) {
    case 'intro':
      s.phaseT -= dt;
      if (s.phaseT <= 0) s.phase = 'play';
      return;
    case 'play':
      if (s.mode === 'adventure') adventurePlay(s, dt, input, random);
      else {
        // Once you are out, the rest of the round plays out quickly.
        const reps = s.bombers[0].alive ? 1 : 3;
        for (let k = 0; k < reps && s.phase === 'play'; k++) battlePlay(s, dt, input, random);
      }
      return;
    case 'dying':
      stepWorld(s, dt, input, random);
      s.phase = 'dying';
      s.phaseT -= dt;
      if (s.phaseT <= 0) {
        s.lives--;
        if (s.lives < 0) {
          s.lives = 0;
          s.over = true;
          s.phase = 'done';
          return;
        }
        const p = s.bombers[0];
        // Special abilities are lost with a life; bombs, fire and speed are kept.
        Object.assign(p, { remote: false, kick: false, pass: false, bombPass: false, vest: 2 });
        loadStage(s, s.stage);
      }
      return;
    case 'clear':
      s.phaseT += dt;
      if (s.clock > 0) {
        const n = Math.min(s.clock, dt * 80);
        s.clock -= n;
        addScore(s, Math.round(n * 20));
        return;
      }
      if (s.phaseT > 2.2) {
        s.stats.cleared++;
        if (s.stage + 1 >= STAGES) {
          s.won = true;
          s.over = true;
          s.phase = 'done';
          return;
        }
        loadStage(s, s.stage + 1);
      }
      return;
    case 'roundEnd':
      s.phaseT -= dt;
      if (s.phaseT <= 0) {
        const champ = s.bombers.find((b) => b.wins >= ROUNDS_TO_WIN);
        if (champ) {
          s.won = champ.id === 0;
          s.stats.matchWon = s.won;
          s.over = true;
          s.phase = 'done';
          return;
        }
        startRound(s, random);
      }
      return;
    case 'done':
      return;
  }
}

export { AREAS, PER_AREA, ROUNDS_TO_WIN, STAGES };
