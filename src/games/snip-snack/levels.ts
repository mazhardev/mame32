/**
 * Snip Snack levels: 15 puzzles in three boxes. Each places the sweet, the
 * ropes holding it (anchor x, y and rope length), the hungry Nibbler, three
 * stars and any bubbles, blowers (x, y, direction), auto-ropes (x, y, reach)
 * and spikes. Every level was laid out around a planned solution (in
 * solutions.ts): the stars and the Nibbler sit on the sweet's path, and the
 * tests replay each solution to a three-star win.
 */
export interface LevelDef {
  index: number;
  name: string;
  candy: [number, number];
  ropes: [number, number, number][];
  monster: [number, number];
  stars: [number, number][];
  bubbles?: [number, number][];
  blowers?: [number, number, number][];
  pins?: [number, number, number][];
  spikes?: [number, number, number, number][];
}

type Def = Omit<LevelDef, 'index'>;
const R = 0;
const L = Math.PI;

const DEFS: Def[] = [
  {
    name: 'First Snip',
    candy: [160, 150],
    ropes: [[160, 50, 100]],
    monster: [160, 420],
    stars: [[160, 230], [160, 300], [160, 365]],
  },
  {
    name: 'Two Knots',
    candy: [160, 160],
    ropes: [[110, 60, 115], [210, 60, 115]],
    monster: [243, 409],
    stars: [[201, 177], [245, 172], [245, 256]],
  },
  {
    name: 'Pendulum',
    candy: [265, 95],
    ropes: [[150, 60, 140]],
    monster: [83, 310],
    stars: [[162, 204], [233, 175], [122, 234]],
  },
  {
    name: 'Three Strings',
    candy: [160, 170],
    ropes: [[80, 70, 150], [160, 50, 125], [250, 70, 140]],
    monster: [29, 396],
    stars: [[127, 219], [81, 223], [29, 288]],
  },
  {
    name: 'Long Drop',
    candy: [270, 90],
    ropes: [[160, 50, 120]],
    monster: [59, 414],
    stars: [[178, 173], [94, 153], [61, 259]],
  },
  {
    name: 'Bubble Up',
    candy: [160, 250],
    ropes: [[160, 160, 90]],
    bubbles: [[160, 340]],
    monster: [160, 70],
    stars: [[160, 300], [160, 200], [160, 130]],
  },
  {
    name: 'Gust',
    candy: [70, 190],
    ropes: [[70, 110, 80]],
    bubbles: [[70, 280]],
    blowers: [[22, 200, R]],
    monster: [188, 430],
    stars: [[70, 240], [130, 150], [188, 300]],
  },
  {
    name: 'Catch Me',
    candy: [185, 60],
    ropes: [[100, 40, 95]],
    pins: [[240, 250, 70]],
    monster: [284, 408],
    stars: [[101, 138], [144, 158], [286, 338]],
  },
  {
    name: 'Spike Wall',
    candy: [40, 90],
    ropes: [[160, 40, 150]],
    spikes: [[10, 400, 130, 400], [312, 170, 312, 280]],
    monster: [262, 305],
    stars: [[145, 195], [260, 156], [264, 210]],
  },
  {
    name: 'Up and Over',
    candy: [80, 300],
    ropes: [[80, 220, 80]],
    bubbles: [[80, 380]],
    blowers: [[30, 160, R]],
    monster: [198, 60],
    stars: [[80, 345], [80, 230], [150, 130]],
  },
  {
    name: 'Relay',
    candy: [40, 60],
    ropes: [[120, 40, 90]],
    pins: [[230, 190, 60], [165, 330, 55]],
    monster: [119, 442],
    stars: [[109, 133], [253, 211], [119, 394]],
  },
  {
    name: 'Crosswind',
    candy: [160, 200],
    ropes: [[160, 120, 80]],
    bubbles: [[160, 290]],
    blowers: [[60, 240, R], [290, 110, L]],
    spikes: [[100, 150, 220, 150]],
    monster: [140, 50],
    stars: [[160, 255], [240, 180], [192, 90]],
  },
  {
    name: 'Bubble Lift',
    candy: [90, 330],
    ropes: [[90, 250, 80]],
    bubbles: [[90, 410]],
    pins: [[150, 200, 70]],
    spikes: [[30, 70, 290, 70]],
    monster: [196, 432],
    stars: [[90, 300], [104, 170], [194, 330]],
  },
  {
    name: 'Spike Gauntlet',
    candy: [40, 70],
    ropes: [[130, 40, 100]],
    pins: [[215, 185, 60]],
    spikes: [[0, 300, 140, 300], [225, 340, 320, 340]],
    monster: [179, 411],
    stars: [[129, 143], [258, 229], [179, 321]],
  },
  {
    name: 'Grand Finale',
    candy: [160, 110],
    ropes: [[90, 40, 100], [230, 40, 100]],
    bubbles: [[40, 330]],
    blowers: [[18, 230, R]],
    pins: [[225, 150, 65]],
    spikes: [[140, 400, 215, 400]],
    monster: [257, 409],
    stars: [[98, 142], [137, 191], [257, 293]],
  },
];

export const BOXES = ['Pantry', 'Garden Shed', 'Toy Box'];
export const PER_BOX = 5;
export const LEVELS: LevelDef[] = DEFS.map((d, index) => ({ ...d, index }));
