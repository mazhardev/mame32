/**
 * Pip Quest levels: five worlds of four levels each. Every level is a run of
 * hand-made chunks (below), so each piece is designed to be passable, and a
 * test walks the finished maps with a jump-reachability search to prove the
 * goal can be reached from the start.
 *
 * Chunk format: `ground` is the pattern for the bottom three rows (14–16),
 * where '.' is a pit, 'L' lava and '^' spikes on the surface. `rows` are the
 * rows above it, bottom-aligned so the last string is row 13.
 *
 * Tiles:  # ground   B brick   ? coin block   P power-up block   * star block
 *         U 1-up block   X stone   T tree stump   = ledge (one-way)
 *         ^ spikes   L lava
 * Things: @ start   o coin   C checkpoint   % goal pole   K boss   A boss arena
 *         g Grumblebug   k Shellby (snail)   h Prickle (hedgehog)
 *         b Flitter (bat)   c Snapweed (plant on a stump)   R fire bar
 *         m moving ledge (side to side)   v moving ledge (up and down)
 *         f crumbling cloud
 */
export const T = 16;
export const ROWS = 17;
export const VIEW_W = 480;
export const VIEW_H = ROWS * T;

export type Theme = 'meadow' | 'cave' | 'sky' | 'snow' | 'castle' | 'volcano';

export const TILE = {
  empty: 0,
  ground: 1,
  brick: 2,
  qcoin: 3,
  qpower: 4,
  qstar: 5,
  q1up: 6,
  used: 7,
  stone: 8,
  stump: 9,
  ledge: 10,
  spikes: 11,
  lava: 12,
} as const;

const CHAR_TILE: Record<string, number> = {
  '#': TILE.ground,
  B: TILE.brick,
  '?': TILE.qcoin,
  P: TILE.qpower,
  '*': TILE.qstar,
  U: TILE.q1up,
  X: TILE.stone,
  T: TILE.stump,
  '=': TILE.ledge,
  '^': TILE.spikes,
  L: TILE.lava,
  R: TILE.stone, // a fire bar turns around a stone block
};

interface Chunk {
  ground: string;
  rows: string[];
}

/* ------------------------------------------------------------------ chunks */

const C: Record<string, Chunk> = {
  start: { ground: '################', rows: ['.@..............'] },
  startCave: { ground: '################', rows: ['.@......o.o.o...'] },

  flat: {
    ground: '####################',
    rows: ['......oooo..........', '....................', '.........g......g...'],
  },
  blocks: {
    ground: '####################',
    rows: [
      '..........?.........',
      '....................',
      '....................',
      '....................',
      '....?...B?BPB.......',
      '....................',
      '....................',
      '..............g.g...',
    ],
  },
  power: {
    ground: '####################',
    rows: ['.......P............', '....................', '....................', '..............g.....'],
  },
  pit3: {
    ground: '#######...########',
    rows: ['.......ooo........', '..................', '..................'],
  },
  pit4: {
    ground: '########....########',
    rows: ['........oooo........', '....................', '....................', '.................g..'],
  },
  pitLedge: {
    ground: '########.......#########',
    rows: ['..........ooo...........', '..........===...........', '........................', '........................'],
  },
  stairs: {
    ground: '########################',
    rows: [
      '..........XXX...........',
      '.........XXXXX..........',
      '........XXXXXXX.........',
      '.......XXXXXXXXX....g...',
    ],
  },
  stairsPit: {
    ground: '############....##########',
    rows: [
      '...........X....X.........',
      '..........XX....XX........',
      '.........XXX....XXX.......',
      '........XXXX....XXXX......',
    ],
  },
  stumps: {
    ground: '########################',
    rows: [
      '...........c......T.....',
      '...........T......T.....',
      '....T......T......T.....',
      '....T......T..g...T.....',
    ],
  },
  bugs: {
    ground: '########################',
    rows: [
      '......BBBBBB............',
      '......oooooo............',
      '........................',
      '.....g..g..g.......g.g..',
    ],
  },
  ledges: {
    ground: '########################',
    rows: [
      '..........oooo..........',
      '.........======.........',
      '........................',
      '........................',
      '...=====.........=====..',
      '........................',
      '..........k.............',
    ],
  },
  hill: {
    ground: '########################',
    rows: [
      '............k...........',
      '.........#######........',
      '.......###########......',
      '.....###############.h..',
    ],
  },
  star: {
    ground: '######################',
    rows: ['......B*B.............', '......................', '......................', '...........hh.....g...'],
  },
  oneUp: {
    ground: '##########...#########',
    rows: [
      '.....U................',
      '......................',
      '......................',
      '....XX................',
      '....XX....ooo.........',
      '....XX................',
    ],
  },
  snails: {
    ground: '########################',
    rows: ['...?B?..................', '........................', '........................', '.........k.....k....g...'],
  },
  hedgehogs: {
    ground: '#########...############',
    rows: [
      '.......===...===........',
      '........................',
      '........................',
      '....h..............h.h..',
    ],
  },
  check: {
    ground: '##################',
    rows: ['..................', '........C.........'],
  },
  bats: {
    ground: '########################',
    rows: [
      '........b.......b.......',
      '........................',
      '........................',
      '........................',
      '......BB?BB.............',
      '........................',
      '........................',
      '..................g.....',
    ],
  },
  plants: {
    ground: '#######....##########',
    rows: [
      '.....c..........c....',
      '.....T..........T....',
      '.....T....ooo...T....',
      '.....T..........T....',
    ],
  },
  bricksRow: {
    ground: '########################',
    rows: [
      '........oooooooo........',
      '........................',
      '........................',
      '........................',
      '....BBBB?BBBBP?B........',
      '........................',
      '........................',
      '......g...g......g......',
    ],
  },

  /* ---- cave ---- */
  caveLow: {
    ground: '########################',
    rows: [
      '..BBBBBBBBBBBBBBBBBBBB..',
      '........................',
      '........................',
      '....oooooooooooooo......',
      '........................',
      '........................',
      '........................',
      '.....g.....g.....k......',
    ],
  },
  cavePillars: {
    ground: '#####..######..#########',
    rows: [
      '........................',
      '..........XX............',
      '...XX.....XX.....XX.....',
      '...XX.....XX.....XX.....',
      '...XX..g..XX..h..XX..g..',
    ],
  },
  caveBricks: {
    ground: '########################',
    rows: [
      '......B?BPB.............',
      '........................',
      '........................',
      '........................',
      '.....BBBBBBBBBBB........',
      '........................',
      '........................',
      '...........k.......k....',
    ],
  },
  caveSteps: {
    ground: '###...###...###...######',
    rows: [
      '........................',
      '......XX..........XX....',
      '......XX....XX....XX....',
      '............XX..........',
      '........................',
    ],
  },

  /* ---- sky ---- */
  skyHop: {
    ground: '##......##......##....##',
    rows: ['............==..........', '....==.............==...', '........................'],
  },
  skyMove: {
    ground: '###..........###########',
    rows: ['........ooo.............', '.......m................', '........................'],
  },
  skyLift: {
    ground: '###.............########',
    rows: [
      '.......oooo.............',
      '........................',
      '.........======.........',
      '........................',
      '........................',
      '.....v.........v........',
      '........................',
      '........................',
    ],
  },
  skyFall: {
    ground: '##....................##',
    rows: ['........f.......f.......', '....f.......f.......f...', '........................'],
  },
  skyBats: {
    ground: '####......####......####',
    rows: [
      '.......b..........b.....',
      '........................',
      '........................',
      '......====......====....',
      '........................',
      '........................',
    ],
  },
  skyBlocks: {
    ground: '#####.....#####.....####',
    rows: [
      '..........?P?...........',
      '........................',
      '........................',
      '........................',
      '......===.......===.....',
      '........................',
      '...........g............',
    ],
  },

  /* ---- castle / volcano ---- */
  lava: {
    ground: '######LLL#####LLL#######',
    rows: ['...........R............', '........................', '........................', '........................'],
  },
  bars: {
    ground: '########################',
    rows: [
      '.....R..........R.......',
      '........................',
      '........................',
      '........................',
      '..........h.............',
    ],
  },
  lavaLifts: {
    ground: '###LLLLLLLLLLLLLLLLLL###',
    rows: ['........................', '.......m.......m........', '........................'],
  },
  spikes: {
    ground: '#####^^^#####^^^^#######',
    rows: [
      '.........P..............',
      '........................',
      '........................',
      '........................',
      '....................g...',
    ],
  },
  lavaSteps: {
    ground: '####LLLL####LLLL####LLL#',
    rows: [
      '........................',
      '.........XX.............',
      '.....XX..XX.....XX......',
      '.....XX.........XX......',
      '........................',
    ],
  },
  bridge: {
    ground: '###LLLLLLLLLLLLLLLLLL###',
    rows: [
      '........R.......R.......',
      '........................',
      '........................',
      '........................',
      '..XXXXXXXXXXXXXXXXXXXX..',
      '..........h.......g.....',
    ],
  },

  /* ---- endings ---- */
  goal: {
    ground: '################################',
    rows: [
      '.......X........................',
      '......XX........................',
      '.....XXX........................',
      '....XXXX........................',
      '...XXXXX....%...................',
      '..XXXXXX....X...................',
    ],
  },
  arena: {
    ground: '################################',
    rows: [
      '...............................X',
      '...............................X',
      '...............................X',
      '...............................X',
      '...............................X',
      '...............................X',
      '......====...........====......X',
      '...............................X',
      '...............................X',
      '.A....................K........X',
    ],
  },
};

/* ------------------------------------------------------------------ levels */

export interface LevelPlan {
  name: string;
  theme: Theme;
  chunks: string[];
  /** Replace every other walker with this enemy, for variety. */
  mix?: string;
  boss?: boolean;
}

export const WORLD_NAMES = ['Mossy Meadow', 'Glimmer Caves', 'Cloudtop Isles', 'Frostpine Peaks', 'Ember Keep'];
export const WORLDS = WORLD_NAMES.length;
export const PER_WORLD = 4;

export const PLANS: LevelPlan[] = [
  // World 1 — Mossy Meadow
  { name: 'Morning Walk', theme: 'meadow', chunks: ['start', 'flat', 'blocks', 'pit3', 'stumps', 'check', 'bugs', 'stairs', 'pit4', 'goal'] },
  { name: 'Snail Trail', theme: 'meadow', chunks: ['start', 'power', 'snails', 'pitLedge', 'hill', 'check', 'ledges', 'star', 'stairsPit', 'goal'], mix: 'k' },
  { name: 'Treetop Hop', theme: 'meadow', chunks: ['start', 'blocks', 'skyHop', 'plants', 'check', 'skyMove', 'hedgehogs', 'oneUp', 'stairs', 'goal'] },
  { name: 'Bramble Keep', theme: 'castle', chunks: ['start', 'power', 'lava', 'bars', 'check', 'lavaSteps', 'arena'], boss: true },

  // World 2 — Glimmer Caves
  { name: 'Crystal Tunnel', theme: 'cave', chunks: ['startCave', 'caveBricks', 'caveLow', 'pit3', 'check', 'cavePillars', 'bugs', 'caveSteps', 'goal'] },
  { name: 'Echo Hollow', theme: 'cave', chunks: ['startCave', 'power', 'cavePillars', 'snails', 'check', 'caveSteps', 'hedgehogs', 'caveBricks', 'stairsPit', 'goal'], mix: 'h' },
  { name: 'Sunlit Ridge', theme: 'meadow', chunks: ['start', 'bricksRow', 'hill', 'plants', 'check', 'pitLedge', 'star', 'ledges', 'stairs', 'goal'], mix: 'k' },
  { name: 'Geode Fortress', theme: 'castle', chunks: ['start', 'power', 'bars', 'lavaLifts', 'check', 'spikes', 'lava', 'arena'], boss: true },

  // World 3 — Cloudtop Isles
  { name: 'Breezy Bridges', theme: 'sky', chunks: ['start', 'power', 'skyHop', 'skyBlocks', 'check', 'skyMove', 'skyBats', 'skyHop', 'goal'] },
  { name: 'Crumble Path', theme: 'sky', chunks: ['start', 'blocks', 'skyFall', 'skyBats', 'check', 'skyLift', 'skyFall', 'skyMove', 'goal'] },
  { name: 'Hidden Grotto', theme: 'cave', chunks: ['startCave', 'power', 'caveLow', 'cavePillars', 'check', 'plants', 'caveSteps', 'caveBricks', 'stairsPit', 'goal'], mix: 'h' },
  { name: 'Storm Citadel', theme: 'castle', chunks: ['start', 'power', 'bridge', 'lavaLifts', 'check', 'bars', 'lavaSteps', 'arena'], boss: true },

  // World 4 — Frostpine Peaks
  { name: 'Snowy Slopes', theme: 'snow', chunks: ['start', 'power', 'hill', 'bugs', 'check', 'pit4', 'stumps', 'stairs', 'goal'], mix: 'h' },
  { name: 'Icicle Glide', theme: 'snow', chunks: ['start', 'blocks', 'pitLedge', 'hedgehogs', 'check', 'ledges', 'skyMove', 'star', 'stairsPit', 'goal'], mix: 'k' },
  { name: 'Aurora Heights', theme: 'sky', chunks: ['start', 'power', 'skyLift', 'skyBats', 'check', 'skyFall', 'skyBlocks', 'skyHop', 'goal'] },
  { name: 'Frozen Bastion', theme: 'castle', chunks: ['start', 'power', 'spikes', 'bridge', 'check', 'lavaLifts', 'bars', 'arena'], boss: true },

  // World 5 — Ember Keep
  { name: 'Cinder Fields', theme: 'volcano', chunks: ['start', 'power', 'lava', 'hedgehogs', 'check', 'lavaSteps', 'bugs', 'stairsPit', 'goal'], mix: 'h' },
  { name: 'Magma Run', theme: 'volcano', chunks: ['start', 'blocks', 'lavaLifts', 'spikes', 'check', 'plants', 'lava', 'star', 'stairs', 'goal'], mix: 'k' },
  { name: 'Ashen Spires', theme: 'volcano', chunks: ['start', 'power', 'bridge', 'skyFall', 'check', 'bars', 'lavaSteps', 'skyMove', 'stairsPit', 'goal'], mix: 'h' },
  { name: 'Throne of Embers', theme: 'castle', chunks: ['start', 'power', 'lava', 'bars', 'check', 'bridge', 'lavaLifts', 'spikes', 'arena'], boss: true },
];

export const LEVEL_COUNT = PLANS.length;

/* ----------------------------------------------------------------- building */

export interface Mark {
  ch: string;
  c: number;
  r: number;
}

export interface Level {
  index: number;
  plan: LevelPlan;
  cols: number;
  rows: number;
  tiles: Uint8Array;
  marks: Mark[];
  start: { c: number; r: number };
}

/** Lays a level's chunks side by side into one tile map. */
export function buildLevel(index: number): Level {
  const plan = PLANS[index];
  const parts = plan.chunks.map((id) => {
    const ch = C[id];
    if (!ch) throw new Error(`Unknown chunk ${id}`);
    return ch;
  });
  const cols = parts.reduce((n, p) => n + p.ground.length, 0);
  const tiles = new Uint8Array(cols * ROWS);
  const marks: Mark[] = [];
  let x0 = 0;
  let walkers = 0;
  const cave = plan.theme === 'cave' || plan.theme === 'castle';
  for (const p of parts) {
    const w = p.ground.length;
    const put = (c: number, r: number, ch: string) => {
      const v = CHAR_TILE[ch];
      if (v !== undefined) tiles[r * cols + x0 + c] = v;
      if (v === undefined || ch === 'R') {
        if (ch === '.' || ch === ' ') return;
        let mark = ch;
        if (mark === 'g' && plan.mix && walkers++ % 2 === 1) mark = plan.mix;
        marks.push({ ch: mark, c: x0 + c, r });
      }
    };
    for (let c = 0; c < w; c++) {
      const g = p.ground[c];
      put(c, 14, g);
      const below = g === '^' ? '#' : g;
      put(c, 15, below);
      put(c, 16, below);
    }
    const top = 14 - p.rows.length;
    p.rows.forEach((line, k) => {
      for (let c = 0; c < w; c++) put(c, top + k, line[c] ?? '.');
    });
    x0 += w;
  }
  // Caves and castles get a ceiling.
  if (cave) {
    for (let c = 0; c < cols; c++) {
      tiles[c] = TILE.stone;
      if (tiles[cols + c] === TILE.empty) tiles[cols + c] = TILE.stone;
    }
  }
  const s = marks.find((m) => m.ch === '@')!;
  return { index, plan, cols, rows: ROWS, tiles, marks, start: { c: s.c, r: s.r } };
}

export const isSolidTile = (v: number) => v >= TILE.ground && v <= TILE.stump;
export const isQuestion = (v: number) => v >= TILE.qcoin && v <= TILE.q1up;
