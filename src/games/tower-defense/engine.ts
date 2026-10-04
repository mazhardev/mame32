import type { DifficultySetting } from '@/types';

/**
 * Tower defense rules: enemies follow a fixed path across a tile grid; you
 * build towers on the grass beside it. Towers shoot the enemy furthest along
 * the path within range. Armour subtracts from every hit, so cannons and
 * lasers matter against tanks.
 */
export const COLS = 12;
export const ROWS = 8;
export const TILE = 40;

export type TowerKind = 'arrow' | 'cannon' | 'frost' | 'laser';
export type EnemyKind = 'grunt' | 'runner' | 'tank' | 'boss';

export interface TowerSpec {
  name: string;
  cost: number;
  upgrades: [number, number];
  range: number;
  damage: [number, number, number];
  rate: number;
  splash?: number;
  slow?: [number, number, number];
  color: string;
}

export const TOWERS: Record<TowerKind, TowerSpec> = {
  arrow: {
    name: 'Arrow',
    cost: 50,
    upgrades: [40, 70],
    range: 2.6,
    damage: [10, 18, 30],
    rate: 1.4,
    color: '#a16207',
  },
  cannon: {
    name: 'Cannon',
    cost: 100,
    upgrades: [80, 130],
    range: 2.2,
    damage: [26, 45, 72],
    rate: 0.6,
    splash: 0.9,
    color: '#475569',
  },
  frost: {
    name: 'Frost',
    cost: 80,
    upgrades: [60, 100],
    range: 2.0,
    damage: [4, 7, 11],
    rate: 1,
    slow: [0.4, 0.5, 0.6],
    color: '#0ea5e9',
  },
  laser: {
    name: 'Laser',
    cost: 200,
    upgrades: [150, 250],
    range: 3.5,
    damage: [42, 72, 125],
    rate: 0.8,
    color: '#db2777',
  },
};

export const ENEMIES: Record<
  EnemyKind,
  { hp: number; speed: number; armour: number; gold: number; color: string; r: number }
> = {
  grunt: { hp: 40, speed: 1.1, armour: 0, gold: 5, color: '#16a34a', r: 9 },
  runner: { hp: 24, speed: 2, armour: 0, gold: 4, color: '#f59e0b', r: 7 },
  tank: { hp: 140, speed: 0.65, armour: 5, gold: 12, color: '#6b7280', r: 12 },
  boss: { hp: 900, speed: 0.5, armour: 7, gold: 80, color: '#7c3aed', r: 16 },
};

export const MAPS: [number, number][][] = [
  [
    [-1, 1],
    [3, 1],
    [3, 5],
    [7, 5],
    [7, 2],
    [10, 2],
    [10, 6],
    [12, 6],
  ],
  [
    [-1, 6],
    [2, 6],
    [2, 1],
    [5, 1],
    [5, 6],
    [9, 6],
    [9, 1],
    [12, 1],
  ],
  [
    [5, -1],
    [5, 2],
    [1, 2],
    [1, 6],
    [6, 6],
    [6, 4],
    [10, 4],
    [10, 8],
  ],
];

export interface Tower {
  kind: TowerKind;
  c: number;
  r: number;
  level: number;
  cooldown: number;
  spent: number;
  /** Last shot, for drawing. */
  shotAt: { x: number; y: number; t: number } | null;
}

export interface Enemy {
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  /** Distance travelled along the path (px). */
  dist: number;
  slow: number;
  slowT: number;
}

export interface Shell {
  x: number;
  y: number;
  tx: number;
  ty: number;
  dmg: number;
  splash: number;
  t: number;
}

export interface Tuning {
  gold: number;
  hpGrowth: number;
  waves: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { gold: 260, hpGrowth: 0.13, waves: 15 },
  normal: { gold: 220, hpGrowth: 0.18, waves: 20 },
  hard: { gold: 190, hpGrowth: 0.205, waves: 20 },
};

export interface TD {
  map: number;
  path: { x: number; y: number }[];
  length: number;
  pathTiles: Set<string>;
  towers: Tower[];
  enemies: Enemy[];
  shells: Shell[];
  gold: number;
  lives: number;
  wave: number;
  /** Enemies still to spawn this wave. */
  queue: EnemyKind[];
  spawnT: number;
  waveActive: boolean;
  kills: number;
  leaked: number;
  tuning: Tuning;
}

export const tileKey = (c: number, r: number) => `${c},${r}`;

export function buildPath(points: [number, number][]) {
  const path = points.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }));
  let length = 0;
  for (let i = 1; i < path.length; i++)
    length += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  const tiles = new Set<string>();
  for (let i = 1; i < points.length; i++) {
    const [c0, r0] = points[i - 1];
    const [c1, r1] = points[i];
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let k = 0; k <= steps; k++)
      tiles.add(tileKey(c0 + Math.sign(c1 - c0) * k, r0 + Math.sign(r1 - r0) * k));
  }
  return { path, length, tiles };
}

export function newTD(difficulty: DifficultySetting, map: number): TD {
  const tuning = TUNING[difficulty];
  const { path, length, tiles } = buildPath(MAPS[map]);
  return {
    map,
    path,
    length,
    pathTiles: tiles,
    towers: [],
    enemies: [],
    shells: [],
    gold: tuning.gold,
    lives: 20,
    wave: 0,
    queue: [],
    spawnT: 0,
    waveActive: false,
    kills: 0,
    leaked: 0,
    tuning,
  };
}

export function positionAt(td: TD, dist: number): { x: number; y: number } {
  let left = dist;
  for (let i = 1; i < td.path.length; i++) {
    const a = td.path[i - 1];
    const b = td.path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg)
      return { x: a.x + ((b.x - a.x) * left) / seg, y: a.y + ((b.y - a.y) * left) / seg };
    left -= seg;
  }
  return td.path[td.path.length - 1];
}

export function canBuild(td: TD, c: number, r: number): boolean {
  return (
    c >= 0 &&
    r >= 0 &&
    c < COLS &&
    r < ROWS &&
    !td.pathTiles.has(tileKey(c, r)) &&
    !td.towers.some((t) => t.c === c && t.r === r)
  );
}

export function build(td: TD, kind: TowerKind, c: number, r: number): boolean {
  const cost = TOWERS[kind].cost;
  if (!canBuild(td, c, r) || td.gold < cost) return false;
  td.gold -= cost;
  td.towers.push({ kind, c, r, level: 1, cooldown: 0, spent: cost, shotAt: null });
  return true;
}

export function upgradeCost(t: Tower): number | null {
  return t.level >= 3 ? null : TOWERS[t.kind].upgrades[t.level - 1];
}

export function upgrade(td: TD, t: Tower): boolean {
  const cost = upgradeCost(t);
  if (cost === null || td.gold < cost) return false;
  td.gold -= cost;
  t.level += 1;
  t.spent += cost;
  return true;
}

export function sell(td: TD, t: Tower): number {
  const refund = Math.floor(t.spent * 0.7);
  td.gold += refund;
  td.towers = td.towers.filter((x) => x !== t);
  return refund;
}

/** The enemies in wave n (1-based). */
export function waveList(n: number, total: number): EnemyKind[] {
  const list: EnemyKind[] = [];
  const count = 8 + n;
  for (let i = 0; i < count; i++) {
    if (n >= 5 && i % 4 === 3) list.push('tank');
    else if (n >= 3 && i % 3 === 1) list.push('runner');
    else list.push('grunt');
  }
  if (n % 10 === 0 || n === total) list.push('boss');
  return list;
}

export function startWave(td: TD): boolean {
  if (td.waveActive || td.wave >= td.tuning.waves) return false;
  td.wave += 1;
  td.queue = waveList(td.wave, td.tuning.waves);
  td.spawnT = 0;
  td.waveActive = true;
  return true;
}

function hit(e: Enemy, dmg: number, armourPierce = false) {
  const armour = armourPierce ? 0 : ENEMIES[e.kind].armour;
  e.hp -= Math.max(1, dmg - armour);
}

export type TdEvent = 'shoot' | 'boom' | 'kill' | 'leak' | 'wave';

/** Advances the battle by dt seconds. */
export function step(td: TD, dt: number, events: TdEvent[] = []): void {
  if (td.waveActive && td.queue.length) {
    td.spawnT -= dt;
    if (td.spawnT <= 0) {
      const kind = td.queue.shift() as EnemyKind;
      const spec = ENEMIES[kind];
      const hp = spec.hp * (1 + td.tuning.hpGrowth * (td.wave - 1));
      td.enemies.push({ kind, hp, maxHp: hp, dist: 0, slow: 0, slowT: 0 });
      td.spawnT = kind === 'runner' ? 0.45 : kind === 'boss' ? 1.6 : 0.8;
    }
  }
  for (const e of td.enemies) {
    const spec = ENEMIES[e.kind];
    if (e.slowT > 0) e.slowT -= dt;
    const slow = e.slowT > 0 ? e.slow : 0;
    e.dist += spec.speed * TILE * (1 - slow) * dt;
  }
  // Leaks.
  for (const e of td.enemies) {
    if (e.dist >= td.length && e.hp > 0) {
      e.hp = 0;
      td.lives -= e.kind === 'boss' ? 5 : 1;
      td.leaked += 1;
      events.push('leak');
      (e as Enemy & { leaked?: boolean }).leaked = true;
    }
  }
  // Towers.
  for (const t of td.towers) {
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    const spec = TOWERS[t.kind];
    const tx = t.c * TILE + TILE / 2;
    const ty = t.r * TILE + TILE / 2;
    const range = spec.range * TILE;
    let target: Enemy | null = null;
    let targetPos = { x: 0, y: 0 };
    for (const e of td.enemies) {
      if (e.hp <= 0) continue;
      const p = positionAt(td, e.dist);
      if (Math.hypot(p.x - tx, p.y - ty) > range) continue;
      if (!target || e.dist > target.dist) {
        target = e;
        targetPos = p;
      }
    }
    if (!target) continue;
    t.cooldown = 1 / spec.rate;
    const dmg = spec.damage[t.level - 1];
    t.shotAt = { ...targetPos, t: 0.12 };
    if (t.kind === 'cannon') {
      td.shells.push({
        x: tx,
        y: ty,
        tx: targetPos.x,
        ty: targetPos.y,
        dmg,
        splash: (spec.splash ?? 0) * TILE,
        t: 0.25,
      });
    } else {
      hit(target, dmg, t.kind === 'laser');
      if (t.kind === 'frost' && spec.slow) {
        target.slow = Math.max(target.slow * (target.slowT > 0 ? 1 : 0), spec.slow[t.level - 1]);
        target.slowT = 1.3;
      }
    }
    events.push('shoot');
  }
  for (const t of td.towers) if (t.shotAt) t.shotAt.t -= dt;
  // Cannon shells land after a short flight and splash.
  for (const s of td.shells) {
    s.t -= dt;
    if (s.t > 0) continue;
    for (const e of td.enemies) {
      if (e.hp <= 0) continue;
      const p = positionAt(td, e.dist);
      if (Math.hypot(p.x - s.tx, p.y - s.ty) <= s.splash) hit(e, s.dmg);
    }
    events.push('boom');
  }
  td.shells = td.shells.filter((s) => s.t > 0);
  // Rewards and clean-up.
  for (const e of td.enemies) {
    if (e.hp <= 0 && !(e as Enemy & { leaked?: boolean }).leaked) {
      td.gold += ENEMIES[e.kind].gold;
      td.kills += 1;
      events.push('kill');
    }
  }
  td.enemies = td.enemies.filter((e) => e.hp > 0);
  if (td.waveActive && td.queue.length === 0 && td.enemies.length === 0) {
    td.waveActive = false;
    td.gold += 20 + td.wave * 4;
    events.push('wave');
  }
}

export const won = (td: TD) => td.wave >= td.tuning.waves && !td.waveActive && td.lives > 0;
export const lost = (td: TD) => td.lives <= 0;
