/**
 * Leap Quest levels. Each level is a row of hand-designed sections
 * ("chunks") laid side by side. Chunks are 15 tiles tall; only their lower
 * rows are written out and the rest is padded with sky. Themes decide how
 * tiles look, and cave and fortress themes add a solid ceiling.
 *
 * Glyphs
 *   .  empty            #  ground          X  stone block      T  tree stump
 *   B  brick            Q  brick of gems   ?  gift: gem        P  gift: power-up
 *   U  gift: extra life *  gift: rainbow feather              =  one-way ledge
 *   ^  spikes           ~  lava            l  lava + lava sprite
 *   C  acorn cannon     J  spring          W  fire wheel       o  gem
 *   K  checkpoint       F  goal pole       @  start            Z  boss
 *   M…m horizontal mover (left end … right end), V…v vertical mover (top … bottom)
 *   e  basic enemy of the level   E  tough enemy of the level
 *   b beetle  s snail  h hedgehog  f frog  z bee  t bat
 */
export const TILE = 16;
export const ROWS = 15;

export type Theme = 'meadow' | 'cave' | 'sky' | 'volcano' | 'fort';
export type EnemyKind = 'beetle' | 'snail' | 'hedgehog' | 'frog' | 'bee' | 'bat';
export type BossKind = 'boar' | 'mole' | 'owl' | 'golem';

export interface Spawn {
  kind: EnemyKind;
  /** Centre x and bottom y in pixels. */
  x: number;
  y: number;
}

export interface Mover {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w: number;
  period: number;
}

export interface LevelData {
  index: number;
  world: number;
  /** "1-2" style label. */
  code: string;
  name: string;
  theme: Theme;
  cols: number;
  /** Row-major tile glyphs (cols × ROWS), with markers already removed. */
  grid: string[];
  start: { x: number; y: number };
  checkpoint: { x: number; y: number } | null;
  /** Pixel x of the goal pole's centre, or null on boss levels. */
  goalX: number | null;
  /** Pixel x where the boss arena starts, or null. */
  arenaX: number | null;
  boss: { kind: BossKind; x: number; y: number } | null;
  movers: Mover[];
  spawns: Spawn[];
  wheels: { x: number; y: number }[];
  lavaSprites: { x: number; y: number }[];
  time: number;
}

/* ---------------------------------------------------------------- chunks */

function chunk(rows: string[]): string[] {
  const w = rows[0].length;
  for (const r of rows) if (r.length !== w) throw new Error(`ragged chunk row: "${r}"`);
  if (rows.length > ROWS) throw new Error('chunk too tall');
  return [...Array.from({ length: ROWS - rows.length }, () => '.'.repeat(w)), ...rows];
}

const C: Record<string, string[]> = {
  /* ---- shared ground sections ---- */
  start: chunk([
    '............',
    '..@.........',
    '############',
    '############',
  ]),
  gifts: chunk([
    '.......P........',
    '................',
    '................',
    '................',
    '..?...B?B?B.....',
    '................',
    '................',
    '............e...',
    '################',
    '################',
  ]),
  pit2: chunk([
    '.........',
    '###..####',
    '###..####',
  ]),
  pit3: chunk([
    '....oo....',
    '...o..o...',
    '..........',
    '..........',
    '###...####',
    '###...####',
  ]),
  pit4: chunk([
    '....ooo....',
    '...o...o...',
    '...........',
    '...........',
    '###....####',
    '###....####',
  ]),
  stumps: chunk([
    '...............TT...',
    '........TT.....TT...',
    '..TT....TT.....TT...',
    '..TT.e..TT..e..TT...',
    '####################',
    '####################',
  ]),
  pyramid: chunk([
    '......oooo......',
    '......XXXX......',
    '.....XXXXXX.....',
    '....XXXXXXXX....',
    '...XXXXXXXXXX...',
    '################',
    '################',
  ]),
  towers: chunk([
    '....X...X.......',
    '...XX...XX......',
    '..XXX...XXX.....',
    '.XXXX...XXXX....',
    '#####...########',
    '#####...########',
  ]),
  floaters: chunk([
    '......ooo.........',
    '.....=====........',
    '..................',
    '..................',
    '####........######',
    '####........######',
  ]),
  bricks: chunk([
    '..........e.......',
    '.........BBBBB....',
    '..................',
    '..................',
    '...........ooo....',
    '...B?BQ*..........',
    '..................',
    '..................',
    '.............e....',
    '##################',
    '##################',
  ]),
  canopy: chunk([
    '.......ooo........',
    '......=====.......',
    '..................',
    '..................',
    '..====.....====...',
    '..................',
    '..................',
    '........e.........',
    '##################',
    '##################',
  ]),
  spring: chunk([
    '......oooo....',
    '.....XXXXXX...',
    '..............',
    '..............',
    '..............',
    '......U.......',
    '..............',
    '..............',
    '..............',
    '..............',
    '...J..........',
    '##############',
    '##############',
  ]),
  checkpoint: chunk([
    '..........',
    '....K.....',
    '##########',
    '##########',
  ]),
  hill: chunk([
    '......ooo.e.....',
    '.....######.....',
    '....########....',
    '...##########...',
    '################',
    '################',
  ]),
  enemies: chunk([
    '.....?...?......',
    '................',
    '................',
    '......e.e..E....',
    '################',
    '################',
  ]),
  beegap: chunk([
    '.....z.......z....',
    '......o......o....',
    '..................',
    '..................',
    '..................',
    '####...####...####',
    '####...####...####',
  ]),
  goal: chunk([
    '........X...............',
    '.......XX...............',
    '......XXX...............',
    '.....XXXX...............',
    '....XXXXX...............',
    '...XXXXXX...............',
    '..XXXXXXX....F..........',
    '########################',
    '########################',
  ]),

  /* ---- caves (a ceiling is added by the theme) ---- */
  low: chunk([
    '...############...',
    '...############...',
    '...############...',
    '...############...',
    '...############...',
    '...############...',
    '...############...',
    '...############...',
    '..................',
    '....oooooooooo....',
    '........e.........',
    '##################',
    '##################',
  ]),
  stalactites: chunk([
    '....#..t.#..t.#...',
    '....#....#....#...',
    '....#....#....#...',
    '....#....#....#...',
    '....#....#....#...',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
    '......e......e....',
    '##################',
    '##################',
  ]),
  pillars: chunk([
    '..........t.........',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '.........oo.........',
    '.........##.........',
    '......##.##.........',
    '...##.##.##.##......',
    '...##.##.##.##.##...',
    '##.##.##.##.##.##.##',
    '##.##.##.##.##.##.##',
  ]),
  brickroof: chunk([
    '..BBB?BBBQBBB?BB..',
    '..................',
    '..................',
    '..................',
    '....e......E......',
    '##################',
    '##################',
  ]),
  lift: chunk([
    '..........oooooo..',
    '..........########',
    '......V...########',
    '..........########',
    '..........########',
    '..........########',
    '..........########',
    '..........########',
    '..........########',
    '......v...########',
    '##################',
    '##################',
  ]),
  cavegap: chunk([
    '........t.........',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
    '......o....o......',
    '.....===..===.....',
    '..................',
    '..................',
    '###............###',
    '###............###',
  ]),

  /* ---- volcano and fortress ---- */
  lava: chunk([
    '................',
    '#####~~l########',
    '#####~~~########',
  ]),
  lavawide: chunk([
    '........X..X........',
    '........X..X........',
    '#####~~~X~lX~~~#####',
    '#####~~~X~~X~~~#####',
  ]),
  wheels: chunk([
    '.........W........',
    '..................',
    '..................',
    '..................',
    '..................',
    '########..########',
    '########..########',
  ]),
  cannons: chunk([
    '.....C.......C....',
    '.....X.......X....',
    '.....X...e...X....',
    '##################',
    '##################',
  ]),
  bridge: chunk([
    '.........W..........',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '...===============..',
    '##~~~~~~l~~~~~~~~~##',
    '##~~~~~~~~~~~~~~~~##',
  ]),
  spikes: chunk([
    '...===....===...',
    '................',
    '................',
    '................',
    '###^^^^^^^^^^###',
    '################',
  ]),
  arena: chunk([
    '...===............===...',
    '........................',
    '........................',
    '........................',
    '...........Z............',
    '########################',
    '########################',
  ]),

  /* ---- sky islands (no continuous ground) ---- */
  skystart: chunk([
    '..@.........',
    '##########..',
    '##########..',
  ]),
  clouds: chunk([
    '..............oo....',
    '..............==....',
    '..........oo........',
    '..........==........',
    '.....ooo............',
    '.....===............',
    '.ooo..............oo',
    '.===..............==',
    '....................',
    '....................',
  ]),
  islands: chunk([
    '.......z..........',
    '..................',
    '..................',
    '..................',
    '..................',
    '.###...###...###..',
    '.###...###...###..',
  ]),
  mover: chunk([
    '....M.......m.......',
    '....................',
    '....................',
    '###..............###',
    '###..............###',
  ]),
  skylift: chunk([
    '..........oooooo',
    '......V...######',
    '..........######',
    '................',
    '................',
    '................',
    '................',
    '................',
    '......v.........',
    '#####...........',
    '#####...........',
  ]),
  skyspring: chunk([
    '.......oooo.....',
    '......======....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..J.............',
    '######..........',
    '######..........',
  ]),
};

/* ---------------------------------------------------------------- recipes */

interface Recipe {
  name: string;
  theme: Theme;
  chunks: string[];
  basic: EnemyKind[];
  tough: EnemyKind[];
  /** Share of basic-enemy markers kept (early levels are gentler). */
  enemyRate?: number;
  boss?: BossKind;
}

export const WORLD_NAMES = ['Sunny Meadows', 'Glimmer Caves', 'Cloudtop Heights', 'Ember Peaks'];

const RECIPES: Recipe[] = [
  // World 1 — Sunny Meadows
  {
    name: 'First Steps',
    theme: 'meadow',
    chunks: ['start', 'gifts', 'pit2', 'stumps', 'enemies', 'checkpoint', 'hill', 'pit3', 'pyramid', 'canopy', 'goal'],
    basic: ['beetle'],
    tough: ['beetle'],
    enemyRate: 0.6,
  },
  {
    name: 'Brambleway',
    theme: 'meadow',
    chunks: ['start', 'enemies', 'floaters', 'bricks', 'pit3', 'towers', 'checkpoint', 'stumps', 'spring', 'pit2', 'hill', 'goal'],
    basic: ['beetle'],
    tough: ['snail'],
  },
  {
    name: 'Buzzing Fields',
    theme: 'meadow',
    chunks: ['start', 'canopy', 'pit4', 'bricks', 'towers', 'beegap', 'checkpoint', 'floaters', 'enemies', 'pyramid', 'pit4', 'goal'],
    basic: ['beetle', 'snail'],
    tough: ['frog'],
  },
  {
    name: 'Bramble Fort',
    theme: 'fort',
    chunks: ['start', 'enemies', 'lava', 'wheels', 'checkpoint', 'spikes', 'cannons', 'checkpoint', 'arena'],
    basic: ['beetle'],
    tough: ['snail'],
    boss: 'boar',
  },
  // World 2 — Glimmer Caves
  {
    name: 'Crystal Mouth',
    theme: 'cave',
    chunks: ['start', 'low', 'enemies', 'stalactites', 'pit3', 'checkpoint', 'pillars', 'brickroof', 'pit2', 'goal'],
    basic: ['beetle', 'snail'],
    tough: ['hedgehog'],
  },
  {
    name: 'Echo Hollow',
    theme: 'cave',
    chunks: ['start', 'stalactites', 'cavegap', 'brickroof', 'lift', 'checkpoint', 'low', 'pillars', 'enemies', 'pit4', 'goal'],
    basic: ['beetle', 'snail'],
    tough: ['hedgehog'],
  },
  {
    name: 'Deep Glow',
    theme: 'cave',
    chunks: ['start', 'pillars', 'brickroof', 'cavegap', 'low', 'checkpoint', 'lift', 'stalactites', 'towers', 'pit4', 'goal'],
    basic: ['snail', 'hedgehog'],
    tough: ['hedgehog'],
  },
  {
    name: 'Mole Keep',
    theme: 'fort',
    chunks: ['start', 'enemies', 'lavawide', 'wheels', 'checkpoint', 'cannons', 'bridge', 'checkpoint', 'arena'],
    basic: ['beetle', 'hedgehog'],
    tough: ['snail'],
    boss: 'mole',
  },
  // World 3 — Cloudtop Heights
  {
    name: 'Up and Away',
    theme: 'sky',
    chunks: ['skystart', 'clouds', 'islands', 'mover', 'checkpoint', 'skylift', 'islands', 'clouds', 'goal'],
    basic: ['bee', 'frog'],
    tough: ['snail'],
  },
  {
    name: 'Springtop',
    theme: 'sky',
    chunks: ['skystart', 'islands', 'skyspring', 'clouds', 'checkpoint', 'mover', 'islands', 'skylift', 'islands', 'goal'],
    basic: ['bee', 'frog'],
    tough: ['hedgehog'],
  },
  {
    name: 'Windy Way',
    theme: 'sky',
    chunks: ['skystart', 'clouds', 'mover', 'skyspring', 'islands', 'checkpoint', 'skylift', 'islands', 'mover', 'clouds', 'goal'],
    basic: ['bee', 'frog'],
    tough: ['snail', 'hedgehog'],
  },
  {
    name: 'Owl Tower',
    theme: 'fort',
    chunks: ['start', 'enemies', 'spikes', 'wheels', 'checkpoint', 'bridge', 'lava', 'checkpoint', 'arena'],
    basic: ['hedgehog', 'beetle'],
    tough: ['snail'],
    boss: 'owl',
  },
  // World 4 — Ember Peaks
  {
    name: 'Cinder Trail',
    theme: 'volcano',
    chunks: ['start', 'lava', 'enemies', 'wheels', 'cannons', 'checkpoint', 'lavawide', 'stumps', 'bridge', 'goal'],
    basic: ['beetle', 'hedgehog'],
    tough: ['frog'],
  },
  {
    name: 'Ashfall',
    theme: 'volcano',
    chunks: ['start', 'cannons', 'lavawide', 'spikes', 'checkpoint', 'wheels', 'bridge', 'towers', 'lava', 'goal'],
    basic: ['beetle', 'hedgehog'],
    tough: ['frog', 'snail'],
  },
  {
    name: 'Magma Run',
    theme: 'volcano',
    chunks: ['start', 'bridge', 'spikes', 'lavawide', 'cannons', 'checkpoint', 'wheels', 'lava', 'towers', 'pit4', 'goal'],
    basic: ['hedgehog', 'beetle'],
    tough: ['frog', 'snail'],
  },
  {
    name: 'Golem Forge',
    theme: 'fort',
    chunks: ['start', 'cannons', 'lavawide', 'wheels', 'checkpoint', 'spikes', 'bridge', 'enemies', 'checkpoint', 'arena'],
    basic: ['hedgehog', 'beetle'],
    tough: ['frog', 'snail'],
    boss: 'golem',
  },
];

export const LEVEL_COUNT = RECIPES.length;
export const LEVELS_PER_WORLD = 4;

const LETTER_ENEMY: Record<string, EnemyKind> = { b: 'beetle', s: 'snail', h: 'hedgehog', f: 'frog', z: 'bee', t: 'bat' };

const SOLID_GLYPHS = new Set(['#', 'X', 'T', 'B', 'Q', '?', 'P', 'U', '*', 'u', 'C', 'J', 'W', '^']);
export const isSolidGlyph = (g: string) => SOLID_GLYPHS.has(g);

const MOVER_SPEED = 46;

export function levelCode(index: number): string {
  return `${Math.floor(index / LEVELS_PER_WORLD) + 1}-${(index % LEVELS_PER_WORLD) + 1}`;
}

export const TIME_LIMIT = 300;

/** Assembles a level from its recipe. Deterministic: the same index always gives the same level. */
export function buildLevel(index: number): LevelData {
  const recipe = RECIPES[index];
  if (!recipe) throw new Error(`no level ${index}`);
  const ceiling = recipe.theme === 'cave' || recipe.theme === 'fort';
  const parts = recipe.chunks.map((name) => {
    const c = C[name];
    if (!c) throw new Error(`unknown chunk ${name}`);
    return ceiling ? c.map((row, r) => (r < 2 ? '#'.repeat(row.length) : row)) : c;
  });
  const cols = parts.reduce((n, p) => n + p[0].length, 0);
  const rows: string[][] = Array.from({ length: ROWS }, (_, r) => parts.flatMap((p) => [...p[r]]));

  const level: LevelData = {
    index,
    world: Math.floor(index / LEVELS_PER_WORLD),
    code: levelCode(index),
    name: recipe.name,
    theme: recipe.theme,
    cols,
    grid: [],
    start: { x: 3 * TILE, y: 13 * TILE },
    checkpoint: null,
    goalX: null,
    arenaX: null,
    boss: null,
    movers: [],
    spawns: [],
    wheels: [],
    lavaSprites: [],
    time: TIME_LIMIT,
  };

  // The arena is the last chunk on boss levels.
  if (recipe.boss) level.arenaX = (cols - parts[parts.length - 1][0].length) * TILE;

  let basicCount = 0;
  let toughCount = 0;
  const rate = recipe.enemyRate ?? 1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const g = rows[r][c];
      const cx = c * TILE + TILE / 2;
      const bottom = (r + 1) * TILE;
      let keep = g;
      switch (g) {
        case '@':
          level.start = { x: cx, y: bottom };
          keep = '.';
          break;
        case 'K':
          // The first checkpoint is the one that counts; later ones on boss levels move it forward.
          level.checkpoint = level.checkpoint && !recipe.boss ? level.checkpoint : { x: cx, y: bottom };
          keep = 'K';
          break;
        case 'F':
          level.goalX = cx;
          keep = 'F';
          break;
        case 'Z':
          level.boss = { kind: recipe.boss ?? 'boar', x: cx, y: bottom };
          keep = '.';
          break;
        case 'W':
          level.wheels.push({ x: cx, y: r * TILE + TILE / 2 });
          break;
        case 'l':
          level.lavaSprites.push({ x: cx, y: r * TILE });
          keep = '~';
          break;
        case 'M': {
          const end = rows[r].indexOf('m', c);
          level.movers.push(mover(c * TILE, r * TILE, end * TILE, r * TILE));
          keep = '.';
          break;
        }
        case 'm':
        case 'v':
          keep = '.';
          break;
        case 'V': {
          let end = r;
          while (end < ROWS && rows[end][c] !== 'v') end++;
          level.movers.push(mover(c * TILE, r * TILE, c * TILE, end * TILE));
          keep = '.';
          break;
        }
        case 'e':
        case 'E': {
          const tough = g === 'E';
          const pool = tough ? recipe.tough : recipe.basic;
          const n = tough ? toughCount++ : basicCount++;
          // Thin out basic enemies on gentle levels, evenly rather than randomly.
          if (!tough && Math.floor((n + 1) * rate) === Math.floor(n * rate)) {
            keep = '.';
            break;
          }
          level.spawns.push({ kind: pool[n % pool.length], x: cx, y: bottom });
          keep = '.';
          break;
        }
        default:
          if (LETTER_ENEMY[g]) {
            const kind = LETTER_ENEMY[g];
            // Bats hang from the ceiling; everything else stands on its cell's floor.
            level.spawns.push({ kind, x: cx, y: kind === 'bat' ? r * TILE + 12 : kind === 'bee' ? r * TILE + 14 : bottom });
            keep = '.';
          }
      }
      level.grid.push(keep);
    }
  }
  return level;
}

function mover(x0: number, y0: number, x1: number, y1: number): Mover {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  return { x0, y0, x1, y1, w: 3 * TILE, period: Math.max(2, (2 * dist) / MOVER_SPEED) };
}

/** Position of a mover at time t (eased back-and-forth). */
export function moverAt(m: Mover, t: number): { x: number; y: number } {
  const phase = (t % m.period) / m.period;
  const f = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  const e = f * f * (3 - 2 * f);
  return { x: m.x0 + (m.x1 - m.x0) * e, y: m.y0 + (m.y1 - m.y0) * e };
}

export const LEVEL_NAMES = RECIPES.map((r, i) => `${levelCode(i)} ${r.name}`);
