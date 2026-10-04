import type { DifficultySetting } from '@/types';

/**
 * Army Strategy: turn-based tactics on a small grid against a local AI.
 *
 * Each turn every unit may move and then attack once. Units counter one
 * another (spears stop horses, horses run down archers, archers whittle
 * spears), forests and hills give cover, and catapults hit hard from far away
 * but cannot fire after moving. Win by defeating every enemy unit or by
 * holding the enemy banner for a full turn.
 */
export type Side = 0 | 1;
export type UnitKind = 'spear' | 'archer' | 'horse' | 'catapult';
export type Terrain = 'grass' | 'forest' | 'hill' | 'water' | 'banner0' | 'banner1';

export interface UnitStats {
  name: string;
  icon: string;
  hp: number;
  atk: number;
  move: number;
  min: number;
  max: number;
}

export const UNITS: Record<UnitKind, UnitStats> = {
  spear: { name: 'Spearmen', icon: '🛡️', hp: 12, atk: 5, move: 3, min: 1, max: 1 },
  archer: { name: 'Archers', icon: '🏹', hp: 8, atk: 4, move: 3, min: 2, max: 3 },
  horse: { name: 'Riders', icon: '🐎', hp: 11, atk: 6, move: 5, min: 1, max: 1 },
  catapult: { name: 'Catapult', icon: '🪨', hp: 7, atk: 7, move: 2, min: 3, max: 4 },
};

/** Attacker kind → defender kind → multiplier. */
const BONUS: Partial<Record<UnitKind, Partial<Record<UnitKind, number>>>> = {
  spear: { horse: 1.6 },
  horse: { archer: 1.6, catapult: 1.6 },
  archer: { spear: 1.3 },
};

export const TERRAIN: Record<Terrain, { cost: number; cover: number; icon: string; name: string }> =
  {
    grass: { cost: 1, cover: 0, icon: '', name: 'Grass' },
    forest: { cost: 2, cover: 0.3, icon: '🌲', name: 'Forest' },
    hill: { cost: 2, cover: 0.2, icon: '⛰️', name: 'Hill' },
    water: { cost: 99, cover: 0, icon: '', name: 'River' },
    banner0: { cost: 1, cover: 0.1, icon: '🚩', name: 'Your banner' },
    banner1: { cost: 1, cover: 0.1, icon: '🏴', name: 'Enemy banner' },
  };

export interface Unit {
  id: number;
  side: Side;
  kind: UnitKind;
  x: number;
  y: number;
  hp: number;
  moved: boolean;
  acted: boolean;
}

export interface Battle {
  w: number;
  h: number;
  map: Terrain[];
  units: Unit[];
  turn: Side;
  round: number;
  winner: Side | null;
  mission: number;
  log: string[];
  kills: [number, number];
}

export const MAX_ROUNDS = 30;

interface MissionDef {
  name: string;
  brief: string;
  rows: string[];
  /** Unit letters: S spear, A archer, H horse, C catapult; uppercase = yours, lowercase = enemy. */
  units: string[];
  /** Extra enemy units on hard. */
  hard: string[];
}

/**
 * Map legend: . grass, f forest, h hill, ~ water, B your banner, b enemy banner.
 * Unit layer uses the same grid size.
 */
export const MISSIONS: MissionDef[] = [
  {
    name: 'Border Skirmish',
    brief: 'A small enemy patrol holds the ridge. Drive them off.',
    rows: [
      '...f....b',
      '..ff..h..',
      '.....hh..',
      '..~~.....',
      '..~..f...',
      '.h...ff..',
      'B........',
    ],
    units: [
      '.......s.',
      '......a.s',
      '.........',
      '.........',
      '.........',
      'S........',
      '.AS.H....',
    ],
    hard: ['........h'],
  },
  {
    name: 'River Crossing',
    brief: 'Only two fords cross the river. Their archers are waiting.',
    rows: [
      '..f..h..b',
      '.ff......',
      '....f..h.',
      '~~.~~~.~~',
      '....h....',
      '.f....ff.',
      'B...h....',
    ],
    units: [
      '...a..s..',
      '.....h.a.',
      '..s......',
      '.........',
      '.........',
      'A.S..S...',
      '.H...C.A.',
    ],
    hard: ['......c..'],
  },
  {
    name: 'Siege of the Hill Fort',
    brief: 'The enemy has dug in on the hills with a catapult. Take their banner.',
    rows: [
      '....hhh.b',
      '...hh.h..',
      '.f....f..',
      '..f......',
      '.....~~..',
      '.ff..~...',
      'B......f.',
    ],
    units: [
      '....a.c.s',
      '...s..a..',
      '......h..',
      '.........',
      '.........',
      'S.A..H...',
      '.SC.A..H.',
    ],
    hard: ['..s....s.'],
  },
];

const KIND: Record<string, UnitKind> = { s: 'spear', a: 'archer', h: 'horse', c: 'catapult' };
const TILE: Record<string, Terrain> = {
  '.': 'grass',
  f: 'forest',
  h: 'hill',
  '~': 'water',
  B: 'banner0',
  b: 'banner1',
};

export function newBattle(mission: number, difficulty: DifficultySetting): Battle {
  const m = MISSIONS[mission];
  const h = m.rows.length;
  const w = m.rows[0].length;
  const map = m.rows.flatMap((r) => [...r].map((c) => TILE[c]));
  const units: Unit[] = [];
  let id = 1;
  const add = (rows: string[], yOffset = 0) =>
    rows.forEach((r, y) =>
      [...r].forEach((c, x) => {
        if (c === '.') return;
        const side: Side = c === c.toUpperCase() ? 0 : 1;
        const kind = KIND[c.toLowerCase()];
        units.push({
          id: id++,
          side,
          kind,
          x,
          y: y + yOffset,
          hp: UNITS[kind].hp,
          moved: false,
          acted: false,
        });
      }),
    );
  add(m.units);
  if (difficulty === 'hard') add(m.hard);
  if (difficulty === 'easy') {
    // One fewer enemy on easy: drop the last enemy archer or spear.
    const i = units.map((u) => u.side === 1 && u.kind !== 'catapult').lastIndexOf(true);
    if (i >= 0) units.splice(i, 1);
  }
  return {
    w,
    h,
    map,
    units,
    turn: 0,
    round: 1,
    winner: null,
    mission,
    log: [m.brief],
    kills: [0, 0],
  };
}

export const at = (b: Battle, x: number, y: number) =>
  b.units.find((u) => u.x === x && u.y === y && u.hp > 0);
export const terrainAt = (b: Battle, x: number, y: number) => b.map[y * b.w + x];
const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.abs(ax - bx) + Math.abs(ay - by);

/** Tiles a unit can reach this turn (Dijkstra over terrain cost; enemies block, friends can be passed). */
export function reachable(b: Battle, u: Unit): Map<number, number> {
  const out = new Map<number, number>();
  if (u.moved) {
    out.set(u.y * b.w + u.x, 0);
    return out;
  }
  const best = new Map<number, number>([[u.y * b.w + u.x, 0]]);
  const queue: [number, number, number][] = [[u.x, u.y, 0]];
  while (queue.length) {
    queue.sort((a, c) => a[2] - c[2]);
    const [x, y, c] = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
      const cost = c + TERRAIN[terrainAt(b, nx, ny)].cost;
      if (cost > UNITS[u.kind].move) continue;
      const other = at(b, nx, ny);
      if (other && other.side !== u.side) continue;
      const k = ny * b.w + nx;
      if ((best.get(k) ?? Infinity) <= cost) continue;
      best.set(k, cost);
      queue.push([nx, ny, cost]);
    }
  }
  for (const [k, c] of best) {
    const x = k % b.w;
    const y = Math.floor(k / b.w);
    const other = at(b, x, y);
    if (!other || other.id === u.id) out.set(k, c);
  }
  return out;
}

export function inRange(
  attacker: Unit,
  x: number,
  y: number,
  fromX = attacker.x,
  fromY = attacker.y,
) {
  const s = UNITS[attacker.kind];
  const d = dist(fromX, fromY, x, y);
  return d >= s.min && d <= s.max;
}

export function canAttack(_b: Battle, u: Unit, target: Unit) {
  if (u.acted || target.side === u.side || target.hp <= 0) return false;
  if (u.kind === 'catapult' && u.moved) return false;
  return inRange(u, target.x, target.y);
}

export function targets(b: Battle, u: Unit) {
  return b.units.filter((t) => canAttack(b, u, t));
}

/** Damage scales with the attacker's remaining strength and the defender's cover. */
export function damage(b: Battle, a: Unit, d: Unit) {
  const strength = 0.5 + (0.5 * a.hp) / UNITS[a.kind].hp;
  const bonus = BONUS[a.kind]?.[d.kind] ?? 1;
  const cover = TERRAIN[terrainAt(b, d.x, d.y)].cover;
  return Math.max(1, Math.round(UNITS[a.kind].atk * strength * bonus * (1 - cover)));
}

export function move(b: Battle, u: Unit, x: number, y: number) {
  if (b.winner !== null || u.side !== b.turn || u.moved || u.acted) return false;
  if (!reachable(b, u).has(y * b.w + x)) return false;
  u.x = x;
  u.y = y;
  u.moved = true;
  checkWin(b);
  return true;
}

export interface AttackResult {
  dealt: number;
  taken: number;
  killed: boolean;
  lost: boolean;
}

export function attack(b: Battle, u: Unit, target: Unit): AttackResult | null {
  if (b.winner !== null || u.side !== b.turn || !canAttack(b, u, target)) return null;
  const dealt = damage(b, u, target);
  target.hp = Math.max(0, target.hp - dealt);
  let taken = 0;
  // Melee targets that survive strike back at 60% strength.
  if (
    target.hp > 0 &&
    inRange(target, u.x, u.y, target.x, target.y) &&
    UNITS[target.kind].min === 1
  ) {
    taken = Math.max(1, Math.round(damage(b, target, u) * 0.6));
    u.hp = Math.max(0, u.hp - taken);
  }
  u.moved = true;
  u.acted = true;
  const killed = target.hp === 0;
  const lost = u.hp === 0;
  if (killed) b.kills[u.side] += 1;
  if (lost) b.kills[target.side] += 1;
  b.units = b.units.filter((x) => x.hp > 0);
  b.log = [
    `${UNITS[u.kind].name} hit ${UNITS[target.kind].name} for ${dealt}${killed ? ' — defeated!' : ''}${taken ? `, took ${taken} back${lost ? ' and fell' : ''}` : ''}`,
    ...b.log,
  ].slice(0, 6);
  checkWin(b);
  return { dealt, taken, killed, lost };
}

function checkWin(b: Battle) {
  const alive = (s: Side) => b.units.some((u) => u.side === s);
  if (!alive(1)) b.winner = 0;
  else if (!alive(0)) b.winner = 1;
}

/** The unit (if any) of `side` standing on the other side's banner. */
export function onEnemyBanner(b: Battle, side: Side) {
  return b.units.find(
    (u) => u.side === side && terrainAt(b, u.x, u.y) === (side === 0 ? 'banner1' : 'banner0'),
  );
}

export function endTurn(b: Battle) {
  if (b.winner !== null) return;
  b.turn = b.turn === 0 ? 1 : 0;
  if (b.turn === 0) b.round += 1;
  for (const u of b.units) {
    u.moved = false;
    u.acted = false;
  }
  // A banner is captured by holding it through a whole enemy turn.
  if (onEnemyBanner(b, b.turn)) {
    b.winner = b.turn;
    return;
  }
  // Out of time: the defender (the AI) holds its ground.
  if (b.round > MAX_ROUNDS) b.winner = 1;
}

export interface AiAction {
  unit: number;
  to: [number, number];
  target: number | null;
}

/**
 * Chooses one unit's move and attack. Every reachable tile is scored by the
 * best attack available from it (damage dealt, kills, counter-damage taken),
 * plus cover and progress toward the nearest enemy or banner. Harder AIs
 * weigh kills and safety more and add less randomness.
 */
export function aiPlan(
  b: Battle,
  u: Unit,
  difficulty: DifficultySetting,
  random: () => number,
): AiAction {
  const noise = difficulty === 'easy' ? 6 : difficulty === 'normal' ? 2 : 0.3;
  const killW = difficulty === 'hard' ? 12 : 7;
  const enemies = b.units.filter((e) => e.side !== u.side);
  const bannerTile: Terrain = u.side === 1 ? 'banner0' : 'banner1';
  const own = b.map.indexOf(u.side === 1 ? 'banner1' : 'banner0');
  const ownX = own % b.w;
  const ownY = Math.floor(own / b.w);
  // An enemy close to our banner must be dealt with first.
  const raid = enemies.some((e) => dist(e.x, e.y, ownX, ownY) <= 2);
  const bk = b.map.indexOf(bannerTile);
  const bx = bk % b.w;
  const by = Math.floor(bk / b.w);
  let best: AiAction = { unit: u.id, to: [u.x, u.y], target: null };
  let bestScore = -Infinity;
  const reach = reachable(b, u);
  const ranged = UNITS[u.kind].min > 1;
  for (const [k] of reach) {
    const x = k % b.w;
    const y = Math.floor(k / b.w);
    const moved = x !== u.x || y !== u.y;
    const ghost: Unit = { ...u, x, y, moved: moved || u.moved };
    let tileScore = TERRAIN[terrainAt(b, x, y)].cover * 6;
    if (terrainAt(b, x, y) === bannerTile) tileScore += 1000;
    const near = Math.min(...enemies.map((e) => dist(x, y, e.x, e.y)), Infinity);
    // Ranged units like to sit at their best distance; melee units close in.
    tileScore -= ranged ? Math.abs(near - UNITS[u.kind].max) * 1.5 : near * 1.2;
    tileScore -= dist(x, y, bx, by) * 0.3;
    if (raid) tileScore -= dist(x, y, ownX, ownY) * 1.5;
    // Danger: enemies that could reach and hit this tile next turn.
    const threat = enemies.reduce((a, e) => {
      const r = UNITS[e.kind].move + UNITS[e.kind].max;
      return a + (dist(x, y, e.x, e.y) <= r ? damage(b, e, ghost) : 0);
    }, 0);
    tileScore -= threat * (difficulty === 'hard' ? 0.5 : 0.25) * (ranged ? 1.5 : 1);
    let attackScore = 0;
    let target: number | null = null;
    if (!(u.kind === 'catapult' && moved)) {
      for (const e of enemies) {
        if (!inRange(ghost, e.x, e.y)) continue;
        const dealt = Math.min(e.hp, damage(b, ghost, e));
        const counter =
          e.hp - dealt > 0 && UNITS[e.kind].min === 1 && dist(x, y, e.x, e.y) === 1
            ? Math.round(damage(b, e, ghost) * 0.6)
            : 0;
        const raider = dist(e.x, e.y, ownX, ownY) <= 2 ? 25 : 0;
        const s =
          dealt * 2 +
          (dealt >= e.hp ? killW : 0) -
          counter * 1.5 +
          (UNITS[e.kind].atk - 4) +
          raider;
        if (s > attackScore) {
          attackScore = s;
          target = e.id;
        }
      }
    }
    const score = tileScore + attackScore * 2 + random() * noise;
    if (score > bestScore) {
      bestScore = score;
      best = { unit: u.id, to: [x, y], target };
    }
  }
  return best;
}

/** Plays the whole AI turn, returning the actions taken (for animation). */
export function aiTurn(b: Battle, difficulty: DifficultySetting, random: () => number): AiAction[] {
  const actions: AiAction[] = [];
  const side = b.turn;
  // Ranged units act first so melee can finish off weakened targets.
  const order = b.units
    .filter((u) => u.side === side)
    .sort((a, c) => UNITS[c.kind].min - UNITS[a.kind].min);
  for (const u of order) {
    if (b.winner !== null || u.hp <= 0) break;
    const plan = aiPlan(b, u, difficulty, random);
    if (plan.to[0] !== u.x || plan.to[1] !== u.y) move(b, u, plan.to[0], plan.to[1]);
    if (plan.target !== null && b.winner === null) {
      const t = b.units.find((x) => x.id === plan.target);
      if (t) attack(b, u, t);
    }
    actions.push(plan);
  }
  endTurn(b);
  return actions;
}

const KINDS = Object.keys(UNITS);
const TERRAINS = Object.keys(TERRAIN);
export function validBattle(v: unknown): v is Battle {
  if (!v || typeof v !== 'object') return false;
  const b = v as Battle;
  return (
    Number.isInteger(b.w) &&
    Number.isInteger(b.h) &&
    b.w > 0 &&
    b.h > 0 &&
    b.w * b.h <= 200 &&
    Array.isArray(b.map) &&
    b.map.length === b.w * b.h &&
    b.map.every((t) => TERRAINS.includes(t)) &&
    Array.isArray(b.units) &&
    b.units.every(
      (u) =>
        Number.isInteger(u.id) &&
        (u.side === 0 || u.side === 1) &&
        KINDS.includes(u.kind) &&
        Number.isInteger(u.x) &&
        Number.isInteger(u.y) &&
        u.x >= 0 &&
        u.y >= 0 &&
        u.x < b.w &&
        u.y < b.h &&
        Number.isFinite(u.hp) &&
        u.hp > 0 &&
        u.hp <= UNITS[u.kind].hp &&
        typeof u.moved === 'boolean' &&
        typeof u.acted === 'boolean',
    ) &&
    (b.turn === 0 || b.turn === 1) &&
    Number.isInteger(b.round) &&
    Number.isInteger(b.mission) &&
    b.mission >= 0 &&
    b.mission < MISSIONS.length &&
    Array.isArray(b.log) &&
    Array.isArray(b.kills)
  );
}
