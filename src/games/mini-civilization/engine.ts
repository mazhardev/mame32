import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Mini Civilization: a compact turn-based 4X game against one computer rival.
 *
 * Found cities, work the land around them, research a small tech tree, build
 * units and buildings, and win by completing the Grand Observatory (science)
 * or capturing the rival's capital (conquest). The rival plays by the same
 * rules; on harder settings it gets a production and science bonus.
 */
export type Owner = 0 | 1;
export type Terrain = 'grass' | 'plains' | 'forest' | 'hills' | 'mountain' | 'water';
export type Bonus = 'wheat' | 'gems' | null;
export type UnitKind = 'settler' | 'warrior' | 'spearman' | 'rider' | 'catapult';
export type BuildingId = 'granary' | 'workshop' | 'library' | 'walls' | 'observatory';
export type TechId =
  | 'pottery'
  | 'bronze'
  | 'writing'
  | 'horses'
  | 'masonry'
  | 'mathematics'
  | 'philosophy'
  | 'astronomy';

export const TERRAIN: Record<
  Terrain,
  { food: number; prod: number; trade: number; cost: number; def: number; name: string }
> = {
  grass: { food: 2, prod: 0, trade: 1, cost: 1, def: 1, name: 'Grassland' },
  plains: { food: 1, prod: 1, trade: 1, cost: 1, def: 1, name: 'Plains' },
  forest: { food: 1, prod: 2, trade: 0, cost: 2, def: 1.25, name: 'Forest' },
  hills: { food: 1, prod: 2, trade: 0, cost: 2, def: 1.5, name: 'Hills' },
  mountain: { food: 0, prod: 1, trade: 0, cost: 99, def: 2, name: 'Mountains' },
  water: { food: 2, prod: 0, trade: 2, cost: 99, def: 1, name: 'Lake' },
};

export const UNITS: Record<
  UnitKind,
  {
    name: string;
    icon: string;
    cost: number;
    atk: number;
    def: number;
    move: number;
    tech: TechId | null;
  }
> = {
  settler: { name: 'Settlers', icon: '🧺', cost: 30, atk: 0, def: 0.5, move: 1, tech: null },
  warrior: { name: 'Warriors', icon: '🪓', cost: 10, atk: 1, def: 1, move: 1, tech: null },
  spearman: { name: 'Spearmen', icon: '🛡️', cost: 20, atk: 1, def: 2, move: 1, tech: 'bronze' },
  rider: { name: 'Riders', icon: '🐎', cost: 20, atk: 2, def: 1, move: 2, tech: 'horses' },
  catapult: {
    name: 'Catapult',
    icon: '🪨',
    cost: 40,
    atk: 5,
    def: 1,
    move: 1,
    tech: 'mathematics',
  },
};

export const BUILDINGS: Record<
  BuildingId,
  { name: string; icon: string; cost: number; tech: TechId | null; desc: string }
> = {
  granary: {
    name: 'Granary',
    icon: '🏺',
    cost: 30,
    tech: 'pottery',
    desc: 'Keeps half the food when the city grows.',
  },
  workshop: { name: 'Workshop', icon: '⚒️', cost: 40, tech: 'bronze', desc: '+50% production.' },
  library: { name: 'Library', icon: '📚', cost: 40, tech: 'writing', desc: '+50% science.' },
  walls: {
    name: 'City walls',
    icon: '🧱',
    cost: 30,
    tech: 'masonry',
    desc: 'Defenders are twice as strong.',
  },
  observatory: {
    name: 'Grand Observatory',
    icon: '🔭',
    cost: 150,
    tech: 'astronomy',
    desc: 'Wonder: finish it to win the game.',
  },
};

export const TECHS: Record<TechId, { name: string; icon: string; needs: TechId[] }> = {
  pottery: { name: 'Pottery', icon: '🏺', needs: [] },
  bronze: { name: 'Bronze Working', icon: '🥉', needs: [] },
  writing: { name: 'Writing', icon: '✍️', needs: [] },
  horses: { name: 'Horseback Riding', icon: '🐎', needs: [] },
  masonry: { name: 'Masonry', icon: '🧱', needs: [] },
  mathematics: { name: 'Mathematics', icon: '📐', needs: ['masonry'] },
  philosophy: { name: 'Philosophy', icon: '🏛️', needs: ['writing'] },
  astronomy: { name: 'Astronomy', icon: '🔭', needs: ['mathematics', 'philosophy'] },
};
export const TECH_IDS = Object.keys(TECHS) as TechId[];

export type Build = { type: 'unit'; id: UnitKind } | { type: 'building'; id: BuildingId };

export interface Tile {
  t: Terrain;
  bonus: Bonus;
}

export interface City {
  id: number;
  owner: Owner;
  name: string;
  x: number;
  y: number;
  pop: number;
  food: number;
  prod: number;
  buildings: BuildingId[];
  build: Build;
  capital: boolean;
}

export interface Unit {
  id: number;
  owner: Owner;
  kind: UnitKind;
  x: number;
  y: number;
  moves: number;
  fortified: boolean;
}

export interface Civ {
  techs: TechId[];
  research: TechId | null;
  science: number;
}

export interface Game {
  w: number;
  h: number;
  map: Tile[];
  cities: City[];
  units: Unit[];
  civs: [Civ, Civ];
  turn: number;
  nextId: number;
  seed: number;
  winner: Owner | null;
  how: 'science' | 'conquest' | 'score' | null;
  log: string[];
  /** Combat results this turn, for the UI. */
  battles: number;
}

export const MAX_TURNS = 150;
export const AI_BONUS: Record<DifficultySetting, number> = { easy: 0.75, normal: 1, hard: 1.3 };

const CITY_NAMES: [string[], string[]] = [
  [
    'Avalon',
    'Brightwater',
    'Cedarholm',
    'Dunmore',
    'Elmstead',
    'Fairhaven',
    'Glenrock',
    'Highmoor',
  ],
  ['Zarkand', 'Yllith', 'Xorrin', 'Wexmoor', 'Vantor', 'Ulmara', 'Tessk', 'Saroth'],
];

// ---- Map ---------------------------------------------------------------

export const idx = (g: { w: number }, x: number, y: number) => y * g.w + x;
export const inside = (g: { w: number; h: number }, x: number, y: number) =>
  x >= 0 && y >= 0 && x < g.w && y < g.h;
export const tileAt = (g: Game, x: number, y: number) => g.map[idx(g, x, y)];
export const cheb = (ax: number, ay: number, bx: number, by: number) =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

/**
 * Generates a seeded map with the two capitals on opposite sides. Each start
 * is forced onto plains with workable land around it so neither side begins
 * boxed in by mountains or water.
 */
export function newGame(seed: number, w = 12, h = 9): Game {
  const rng = createRng(seed);
  const map: Tile[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const r = rng.next();
      const t: Terrain =
        r < 0.32
          ? 'grass'
          : r < 0.58
            ? 'plains'
            : r < 0.74
              ? 'forest'
              : r < 0.86
                ? 'hills'
                : r < 0.93
                  ? 'mountain'
                  : 'water';
      const b = rng.next();
      const bonus: Bonus =
        t === 'grass' || t === 'plains' ? (b < 0.08 ? 'wheat' : b < 0.13 ? 'gems' : null) : null;
      map.push({ t, bonus });
    }
  const starts: [number, number][] = [
    [1 + Math.floor(rng.next() * 2), 2 + Math.floor(rng.next() * (h - 4))],
    [w - 2 - Math.floor(rng.next() * 2), 2 + Math.floor(rng.next() * (h - 4))],
  ];
  for (const [sx, sy] of starts)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const tile = map[(sy + dy) * w + sx + dx];
        if (!dx && !dy) tile.t = 'plains';
        else if (tile.t === 'mountain' || tile.t === 'water')
          tile.t = (dx + dy) % 2 ? 'grass' : 'forest';
      }
  const g: Game = {
    w,
    h,
    map,
    cities: [],
    units: [],
    civs: [
      { techs: [], research: 'bronze', science: 0 },
      { techs: [], research: 'bronze', science: 0 },
    ],
    turn: 1,
    nextId: 1,
    seed,
    winner: null,
    how: null,
    log: ['Your people have settled their first city. Grow, research and build — or conquer.'],
    battles: 0,
  };
  starts.forEach(([x, y], owner) => {
    foundCity(g, owner as Owner, x, y);
    addUnit(g, owner as Owner, 'warrior', x, y);
    const [ex, ey] = owner === 0 ? [x + 1, y] : [x - 1, y];
    addUnit(g, owner as Owner, 'settler', ex, ey);
  });
  return g;
}

export function addUnit(g: Game, owner: Owner, kind: UnitKind, x: number, y: number): Unit {
  const u: Unit = { id: g.nextId++, owner, kind, x, y, moves: UNITS[kind].move, fortified: false };
  g.units.push(u);
  return u;
}

export const cityAt = (g: Game, x: number, y: number) =>
  g.cities.find((c) => c.x === x && c.y === y);
export const unitsAt = (g: Game, x: number, y: number) =>
  g.units.filter((u) => u.x === x && u.y === y);

export function canFound(g: Game, x: number, y: number) {
  const t = tileAt(g, x, y).t;
  if (t === 'water' || t === 'mountain') return false;
  return g.cities.every((c) => cheb(c.x, c.y, x, y) >= 3);
}

export function foundCity(g: Game, owner: Owner, x: number, y: number): City {
  const mine = g.cities.filter((c) => c.owner === owner).length;
  const city: City = {
    id: g.nextId++,
    owner,
    name: CITY_NAMES[owner][mine % CITY_NAMES[owner].length],
    x,
    y,
    pop: 1,
    food: 0,
    prod: 0,
    buildings: [],
    build: { type: 'unit', id: 'warrior' },
    capital: mine === 0,
  };
  g.cities.push(city);
  return city;
}

// ---- Cities --------------------------------------------------------------

export function tileYield(g: Game, x: number, y: number) {
  const tile = tileAt(g, x, y);
  const base = TERRAIN[tile.t];
  return {
    food: base.food + (tile.bonus === 'wheat' ? 2 : 0),
    prod: base.prod,
    trade: base.trade + (tile.bonus === 'gems' ? 3 : 0),
  };
}

/** Tiles a city works: its centre plus its best `pop` neighbours (food first, then production). */
export function workedTiles(g: Game, c: City): [number, number][] {
  const options: { x: number; y: number; v: number }[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = c.x + dx;
      const y = c.y + dy;
      if (!inside(g, x, y)) continue;
      const enemy = g.units.some((u) => u.x === x && u.y === y && u.owner !== c.owner);
      if (enemy) continue;
      const yl = tileYield(g, x, y);
      options.push({ x, y, v: yl.food * 3 + yl.prod * 2 + yl.trade });
    }
  options.sort((a, b) => b.v - a.v);
  return [[c.x, c.y], ...options.slice(0, c.pop).map((o) => [o.x, o.y] as [number, number])];
}

export function cityYield(g: Game, c: City) {
  let food = 0;
  let prod = 0;
  let trade = 0;
  for (const [x, y] of workedTiles(g, c)) {
    const yl = tileYield(g, x, y);
    food += yl.food;
    prod += yl.prod;
    trade += yl.trade;
  }
  // The centre tile is always at least modestly productive.
  prod += 1;
  food += 1;
  trade += 1;
  if (c.buildings.includes('workshop')) prod = Math.floor(prod * 1.5);
  let science = trade + c.pop;
  if (c.buildings.includes('library')) science = Math.floor(science * 1.5);
  return { food, prod, science, surplus: food - c.pop * 2 };
}

export const growthNeeded = (c: City) => 12 + c.pop * 6;
export const buildCost = (b: Build) =>
  b.type === 'unit' ? UNITS[b.id].cost : BUILDINGS[b.id].cost;

export function canBuild(g: Game, c: City, b: Build) {
  const civ = g.civs[c.owner];
  if (b.type === 'unit') {
    const tech = UNITS[b.id].tech;
    return !tech || civ.techs.includes(tech);
  }
  const def = BUILDINGS[b.id];
  if (c.buildings.includes(b.id)) return false;
  if (b.id === 'observatory' && g.cities.some((x) => x.buildings.includes('observatory')))
    return false;
  return !def.tech || civ.techs.includes(def.tech);
}

export function buildOptions(g: Game, c: City): Build[] {
  const all: Build[] = [
    ...(Object.keys(UNITS) as UnitKind[]).map((id) => ({ type: 'unit' as const, id })),
    ...(Object.keys(BUILDINGS) as BuildingId[]).map((id) => ({ type: 'building' as const, id })),
  ];
  return all.filter((b) => canBuild(g, c, b));
}

// ---- Research --------------------------------------------------------------

export const techCost = (civ: Civ) => 30 + civ.techs.length * 22;
export const availableTechs = (civ: Civ) =>
  TECH_IDS.filter(
    (t) => !civ.techs.includes(t) && TECHS[t].needs.every((n) => civ.techs.includes(n)),
  );

export function setResearch(g: Game, owner: Owner, tech: TechId) {
  if (!availableTechs(g.civs[owner]).includes(tech)) return false;
  g.civs[owner].research = tech;
  return true;
}

// ---- Movement & combat --------------------------------------------------------

/** Tiles a unit can reach with its remaining moves (Dijkstra; enemy units block, friendly ones do not). */
export function reachable(g: Game, u: Unit): Map<number, number> {
  const best = new Map<number, number>([[idx(g, u.x, u.y), 0]]);
  const queue: [number, number, number][] = [[u.x, u.y, 0]];
  while (queue.length) {
    queue.sort((a, b) => a[2] - b[2]);
    const [x, y, c] = queue.shift()!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!inside(g, nx, ny)) continue;
        const cost = TERRAIN[tileAt(g, nx, ny).t].cost;
        if (cost >= 99) continue;
        // A unit may always make a single step even into rough terrain.
        const total = c + cost;
        if (total > u.moves && !(c === 0 && u.moves > 0)) continue;
        if (g.units.some((o) => o.x === nx && o.y === ny && o.owner !== u.owner)) continue;
        const city = cityAt(g, nx, ny);
        if (city && city.owner !== u.owner) continue;
        const k = idx(g, nx, ny);
        const step = Math.min(total, u.moves);
        if ((best.get(k) ?? Infinity) <= step) continue;
        best.set(k, step);
        if (step < u.moves) queue.push([nx, ny, step]);
      }
  }
  best.delete(idx(g, u.x, u.y));
  return best;
}

export function moveUnit(g: Game, u: Unit, x: number, y: number) {
  if (g.winner !== null || u.moves <= 0) return false;
  const r = reachable(g, u);
  const cost = r.get(idx(g, x, y));
  if (cost === undefined) return false;
  u.x = x;
  u.y = y;
  u.moves = Math.max(0, u.moves - cost);
  u.fortified = false;
  return true;
}

/** Targets adjacent to a military unit: enemy units, or an undefended enemy city to capture. */
export function attackTargets(g: Game, u: Unit): [number, number][] {
  if (UNITS[u.kind].atk === 0 || u.moves <= 0) return [];
  const out: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = u.x + dx;
      const y = u.y + dy;
      if (!inside(g, x, y)) continue;
      const enemy = g.units.some((o) => o.x === x && o.y === y && o.owner !== u.owner);
      const city = cityAt(g, x, y);
      if (enemy || (city && city.owner !== u.owner)) out.push([x, y]);
    }
  return out;
}

export function defenceAt(g: Game, d: Unit) {
  const city = cityAt(g, d.x, d.y);
  let v = UNITS[d.kind].def * TERRAIN[tileAt(g, d.x, d.y).t].def;
  if (city) v *= city.buildings.includes('walls') ? 3 : 1.5;
  if (d.fortified) v *= 1.25;
  return v;
}

/** The strongest defender on a tile. */
export function bestDefender(g: Game, x: number, y: number, against: Owner) {
  return g.units
    .filter((o) => o.x === x && o.y === y && o.owner !== against)
    .sort((a, b) => defenceAt(g, b) - defenceAt(g, a))[0];
}

export function winChance(g: Game, a: Unit, x: number, y: number) {
  const d = bestDefender(g, x, y, a.owner);
  if (!d) return 1;
  const atk = UNITS[a.kind].atk * (a.kind === 'catapult' && cityAt(g, x, y) ? 1.5 : 1);
  const def = defenceAt(g, d);
  return atk / (atk + def);
}

export interface BattleResult {
  won: boolean;
  captured: City | null;
}

/** Resolves an attack. The loser is destroyed; a winner walks into an emptied city and captures it. */
export function attack(
  g: Game,
  a: Unit,
  x: number,
  y: number,
  random: () => number,
): BattleResult | null {
  if (g.winner !== null || !attackTargets(g, a).some(([tx, ty]) => tx === x && ty === y))
    return null;
  const d = bestDefender(g, x, y, a.owner);
  a.moves = 0;
  a.fortified = false;
  let won = true;
  if (d) {
    won = random() < winChance(g, a, x, y);
    g.battles += 1;
    if (won) g.units = g.units.filter((u) => u !== d);
    else {
      g.units = g.units.filter((u) => u !== a);
      g.log = [
        `⚔️ ${a.owner === 0 ? 'Your' : 'Enemy'} ${UNITS[a.kind].name} lost an attack.`,
        ...g.log,
      ].slice(0, 6);
      return { won: false, captured: null };
    }
    // Settlers caught in the open are destroyed with their escort.
    g.units = g.units.filter(
      (u) => !(u.x === x && u.y === y && u.owner !== a.owner && UNITS[u.kind].def < 1),
    );
  }
  let captured: City | null = null;
  const city = cityAt(g, x, y);
  const stillDefended = g.units.some((u) => u.x === x && u.y === y && u.owner !== a.owner);
  if (city && !stillDefended && UNITS[a.kind].atk > 0) {
    captured = city;
    a.x = x;
    a.y = y;
    const wasCapital = city.capital;
    city.owner = a.owner;
    city.capital = false;
    city.pop = Math.max(1, city.pop - 1);
    city.prod = 0;
    city.build = { type: 'unit', id: 'warrior' };
    city.buildings = city.buildings.filter((b) => b !== 'walls');
    g.log = [
      `🏳️ ${city.name} was captured by ${a.owner === 0 ? 'you' : 'the rival'}!`,
      ...g.log,
    ].slice(0, 6);
    if (wasCapital) {
      g.winner = a.owner;
      g.how = 'conquest';
    }
  } else if (won) {
    g.log = [
      `⚔️ ${a.owner === 0 ? 'Your' : 'Enemy'} ${UNITS[a.kind].name} won a battle.`,
      ...g.log,
    ].slice(0, 6);
  }
  return { won, captured };
}

export function settle(g: Game, u: Unit) {
  if (u.kind !== 'settler' || u.moves <= 0 || !canFound(g, u.x, u.y)) return null;
  g.units = g.units.filter((x) => x !== u);
  const c = foundCity(g, u.owner, u.x, u.y);
  g.log = [`🏙️ ${u.owner === 0 ? 'You founded' : 'The rival founded'} ${c.name}.`, ...g.log].slice(
    0,
    6,
  );
  return c;
}

// ---- Turn processing ------------------------------------------------------------

/** Food, production and science for one side, at the end of its turn. */
export function processCities(g: Game, owner: Owner, bonus = 1) {
  const civ = g.civs[owner];
  for (const c of g.cities.filter((x) => x.owner === owner)) {
    const y = cityYield(g, c);
    c.food += y.surplus;
    if (c.food >= growthNeeded(c) && c.pop < 8) {
      c.food = c.buildings.includes('granary') ? Math.floor(growthNeeded(c) / 2) : 0;
      c.pop += 1;
    } else if (c.food < 0) {
      c.pop = Math.max(1, c.pop - 1);
      c.food = 0;
    }
    c.prod += Math.round(y.prod * bonus);
    const cost = buildCost(c.build);
    if (c.prod >= cost && canBuild(g, c, c.build)) {
      if (c.build.type === 'unit') {
        if (c.build.id === 'settler' && c.pop < 2) continue;
        if (c.build.id === 'settler') c.pop -= 1;
        addUnit(g, owner, c.build.id, c.x, c.y);
      } else {
        c.buildings.push(c.build.id);
        if (c.build.id === 'observatory') {
          g.winner = owner;
          g.how = 'science';
          g.log = [
            `🔭 ${owner === 0 ? 'You completed' : 'The rival completed'} the Grand Observatory!`,
            ...g.log,
          ];
          return;
        }
        c.build = { type: 'unit', id: 'warrior' };
      }
      c.prod -= cost;
    }
    civ.science += Math.round(y.science * bonus);
  }
  if (civ.research && civ.science >= techCost(civ)) {
    civ.science -= techCost(civ);
    civ.techs.push(civ.research);
    if (owner === 0)
      g.log = [`💡 You discovered ${TECHS[civ.research].name}.`, ...g.log].slice(0, 6);
    civ.research = availableTechs(civ)[0] ?? null;
  }
}

export function endTurn(g: Game, owner: Owner, difficulty: DifficultySetting) {
  if (g.winner !== null) return;
  processCities(g, owner, owner === 1 ? AI_BONUS[difficulty] : 1);
  for (const u of g.units.filter((x) => x.owner === owner)) {
    if (u.moves === UNITS[u.kind].move && cityAt(g, u.x, u.y)) u.fortified = true;
    u.moves = UNITS[u.kind].move;
  }
  // A side with no cities left is out.
  for (const o of [0, 1] as Owner[])
    if (g.winner === null && !g.cities.some((c) => c.owner === o)) {
      g.winner = o === 0 ? 1 : 0;
      g.how = 'conquest';
    }
  if (owner === 1) {
    g.turn += 1;
    if (g.turn > MAX_TURNS && g.winner === null) {
      g.winner = score(g, 0) >= score(g, 1) ? 0 : 1;
      g.how = 'score';
    }
  }
}

export function score(g: Game, owner: Owner) {
  return (
    g.cities
      .filter((c) => c.owner === owner)
      .reduce((a, c) => a + c.pop * 10 + c.buildings.length * 5, 0) +
    g.civs[owner].techs.length * 15
  );
}

// ---- AI ------------------------------------------------------------------------------

function siteValue(g: Game, x: number, y: number) {
  let v = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!inside(g, x + dx, y + dy)) continue;
      const yl = tileYield(g, x + dx, y + dy);
      v += yl.food * 2 + yl.prod * 1.5 + yl.trade;
    }
  return v;
}

/** Moves a unit one turn's worth toward (tx, ty); returns true if it moved. */
function stepToward(g: Game, u: Unit, tx: number, ty: number) {
  const r = reachable(g, u);
  let bestK = -1;
  let bestD = cheb(u.x, u.y, tx, ty);
  for (const [k] of r) {
    const x = k % g.w;
    const y = Math.floor(k / g.w);
    if (unitsAt(g, x, y).some((o) => o.owner === u.owner) && !cityAt(g, x, y)) continue;
    const dd = cheb(x, y, tx, ty);
    if (dd < bestD) {
      bestD = dd;
      bestK = k;
    }
  }
  if (bestK < 0) return false;
  return moveUnit(g, u, bestK % g.w, Math.floor(bestK / g.w));
}

const RESEARCH_ORDER: TechId[] = [
  'bronze',
  'pottery',
  'writing',
  'masonry',
  'horses',
  'mathematics',
  'philosophy',
  'astronomy',
];

/**
 * Plays one side's whole turn. `aggression` decides how readily it builds an
 * army and goes after the other side's cities; the AI always defends itself
 * and always races for the Observatory once it can.
 */
export function aiTurn(
  g: Game,
  owner: Owner,
  difficulty: DifficultySetting,
  random: () => number,
  aggression = 0.5,
) {
  const civ = g.civs[owner];
  const enemy: Owner = owner === 0 ? 1 : 0;
  if (!civ.research || !availableTechs(civ).includes(civ.research))
    civ.research = RESEARCH_ORDER.find((t) => availableTechs(civ).includes(t)) ?? null;
  const myCities = g.cities.filter((c) => c.owner === owner);
  const enemyUnits = g.units.filter((u) => u.owner === enemy && UNITS[u.kind].atk > 0);
  const army = g.units.filter((u) => u.owner === owner && UNITS[u.kind].atk > 0);
  const strength = (o: Owner) =>
    g.units
      .filter((u) => u.owner === o)
      .reduce((a, u) => a + UNITS[u.kind].atk + UNITS[u.kind].def, 0);
  const attacking =
    aggression > 0 && strength(owner) > strength(enemy) * (1.6 - aggression) && army.length >= 4;
  const bestUnit = (): UnitKind =>
    civ.techs.includes('mathematics') && random() < 0.4
      ? 'catapult'
      : civ.techs.includes('horses') && random() < 0.5
        ? 'rider'
        : civ.techs.includes('bronze')
          ? 'spearman'
          : 'warrior';

  // City production.
  const settlersOut = g.units.filter((u) => u.owner === owner && u.kind === 'settler').length;
  for (const c of myCities) {
    const defenders = unitsAt(g, c.x, c.y).filter(
      (u) => u.owner === owner && UNITS[u.kind].def >= 1,
    ).length;
    const threatened = enemyUnits.some((e) => cheb(e.x, e.y, c.x, c.y) <= 3);
    const want = (b: Build) => canBuild(g, c, b);
    let choice: Build;
    if (defenders === 0 || (threatened && defenders < 2))
      choice = { type: 'unit', id: civ.techs.includes('bronze') ? 'spearman' : 'warrior' };
    else if (want({ type: 'building', id: 'observatory' }))
      choice = { type: 'building', id: 'observatory' };
    else if (myCities.length + settlersOut < 5 && c.pop >= 2 && settlersOut < 1)
      choice = { type: 'unit', id: 'settler' };
    else if (threatened && want({ type: 'building', id: 'walls' }))
      choice = { type: 'building', id: 'walls' };
    else if (want({ type: 'building', id: 'library' }))
      choice = { type: 'building', id: 'library' };
    else if (want({ type: 'building', id: 'granary' }))
      choice = { type: 'building', id: 'granary' };
    else if (want({ type: 'building', id: 'workshop' }))
      choice = { type: 'building', id: 'workshop' };
    else if (random() < aggression) choice = { type: 'unit', id: bestUnit() };
    else choice = { type: 'unit', id: civ.techs.includes('bronze') ? 'spearman' : 'warrior' };
    if (c.build.type !== choice.type || c.build.id !== choice.id) {
      // Switching from a building to a unit keeps the work done; that is fine for a small game.
      c.build = choice;
    }
  }

  // Units.
  for (const u of g.units.filter((x) => x.owner === owner)) {
    if (g.winner !== null) break;
    if (!g.units.includes(u)) continue;
    if (u.kind === 'settler') {
      if (canFound(g, u.x, u.y) && siteValue(g, u.x, u.y) >= 22) {
        settle(g, u);
        continue;
      }
      let best: [number, number] | null = null;
      let bestV = -Infinity;
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < g.w; x++) {
          if (!canFound(g, x, y)) continue;
          const near = Math.min(...myCities.map((c) => cheb(c.x, c.y, x, y)), 99);
          const danger = g.cities
            .filter((c) => c.owner === enemy)
            .some((c) => cheb(c.x, c.y, x, y) < 4);
          const v =
            siteValue(g, x, y) - cheb(u.x, u.y, x, y) * 2 - (near > 4 ? 8 : 0) - (danger ? 15 : 0);
          if (v > bestV) {
            bestV = v;
            best = [x, y];
          }
        }
      if (best) stepToward(g, u, best[0], best[1]);
      if (best && u.x === best[0] && u.y === best[1] && u.moves > 0) settle(g, u);
      continue;
    }
    // Attack anything adjacent with decent odds.
    const targets = attackTargets(g, u)
      .map(([x, y]) => ({ x, y, p: winChance(g, u, x, y), city: !!cityAt(g, x, y) }))
      .sort((a, b) => b.p + (b.city ? 0.2 : 0) - (a.p + (a.city ? 0.2 : 0)));
    if (targets[0] && targets[0].p >= 0.55) {
      attack(g, u, targets[0].x, targets[0].y, random);
      continue;
    }
    const home = cityAt(g, u.x, u.y);
    const garrison = home
      ? unitsAt(g, u.x, u.y).filter((x) => x.owner === owner && UNITS[x.kind].def >= 1).length
      : 0;
    if (home && home.owner === owner && garrison <= (home.capital ? 2 : 1)) {
      u.fortified = true;
      continue;
    }
    // Ungarrisoned city nearby? Go defend it.
    const empty = myCities.find(
      (c) => !unitsAt(g, c.x, c.y).some((x) => x.owner === owner && UNITS[x.kind].def >= 1),
    );
    if (empty && !attacking) {
      stepToward(g, u, empty.x, empty.y);
      continue;
    }
    if (attacking) {
      const targetsC = g.cities
        .filter((c) => c.owner === enemy)
        .sort((a, b) => cheb(u.x, u.y, a.x, a.y) - cheb(u.x, u.y, b.x, b.y));
      if (targetsC[0]) stepToward(g, u, targetsC[0].x, targetsC[0].y);
      const t2 = attackTargets(g, u)
        .map(([x, y]) => ({ x, y, p: winChance(g, u, x, y) }))
        .sort((a, b) => b.p - a.p);
      if (t2[0] && t2[0].p >= 0.45) attack(g, u, t2[0].x, t2[0].y, random);
    } else if (myCities[0]) {
      const c = myCities.reduce((a, b) =>
        cheb(u.x, u.y, a.x, a.y) <= cheb(u.x, u.y, b.x, b.y) ? a : b,
      );
      if (cheb(u.x, u.y, c.x, c.y) > 1) stepToward(g, u, c.x, c.y);
    }
  }
  endTurn(g, owner, difficulty);
}

// ---- Validation ------------------------------------------------------------------------

const TERRAINS = Object.keys(TERRAIN);
const UNIT_KINDS = Object.keys(UNITS);
const BUILDING_IDS = Object.keys(BUILDINGS);
export function validGame(v: unknown): v is Game {
  if (!v || typeof v !== 'object') return false;
  const g = v as Game;
  const int = Number.isInteger;
  const okBuild = (b: Build) =>
    !!b &&
    ((b.type === 'unit' && UNIT_KINDS.includes(b.id)) ||
      (b.type === 'building' && BUILDING_IDS.includes(b.id)));
  return (
    int(g.w) &&
    int(g.h) &&
    g.w * g.h <= 400 &&
    Array.isArray(g.map) &&
    g.map.length === g.w * g.h &&
    g.map.every(
      (t) =>
        t &&
        TERRAINS.includes(t.t) &&
        (t.bonus === null || t.bonus === 'wheat' || t.bonus === 'gems'),
    ) &&
    Array.isArray(g.cities) &&
    g.cities.every(
      (c) =>
        int(c.id) &&
        (c.owner === 0 || c.owner === 1) &&
        typeof c.name === 'string' &&
        inside(g, c.x, c.y) &&
        int(c.pop) &&
        c.pop >= 1 &&
        Number.isFinite(c.food) &&
        Number.isFinite(c.prod) &&
        Array.isArray(c.buildings) &&
        c.buildings.every((b) => BUILDING_IDS.includes(b)) &&
        okBuild(c.build),
    ) &&
    Array.isArray(g.units) &&
    g.units.every(
      (u) =>
        int(u.id) &&
        (u.owner === 0 || u.owner === 1) &&
        UNIT_KINDS.includes(u.kind) &&
        inside(g, u.x, u.y) &&
        Number.isFinite(u.moves),
    ) &&
    Array.isArray(g.civs) &&
    g.civs.length === 2 &&
    g.civs.every(
      (c) =>
        Array.isArray(c.techs) &&
        c.techs.every((t) => TECH_IDS.includes(t)) &&
        Number.isFinite(c.science) &&
        (c.research === null || TECH_IDS.includes(c.research)),
    ) &&
    int(g.turn) &&
    int(g.nextId) &&
    g.winner === null
  );
}
