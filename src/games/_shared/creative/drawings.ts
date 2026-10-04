/**
 * Original line drawings on a 100 × 100 canvas, stored as strokes (lists of
 * points). The first stroke is the main outline (used for connect-the-dots);
 * the rest are details.
 */
export type Pt = [number, number];
export type Stroke = Pt[];

export interface Drawing {
  id: string;
  name: string;
  strokes: Stroke[];
  /** Similar-looking alternatives used as tricky wrong answers. */
  lookalikes?: string[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  n = 24,
): Stroke {
  const out: Stroke = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([r1(cx + Math.cos(a) * rx), r1(cy + Math.sin(a) * ry)]);
  }
  return out;
}

export const ring = (cx: number, cy: number, r: number, n = 28) => arc(cx, cy, r, r, -90, 270, n);
export const box = (x: number, y: number, w: number, h: number): Stroke => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];

function star(cx: number, cy: number, ro: number, ri: number, points = 5): Stroke {
  const out: Stroke = [];
  for (let i = 0; i <= points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 ? ri : ro;
    out.push([r1(cx + Math.cos(a) * r), r1(cy + Math.sin(a) * r)]);
  }
  return out;
}

function heart(cx: number, cy: number, s: number): Stroke {
  const out: Stroke = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    out.push([r1(cx + x * s), r1(cy + y * s)]);
  }
  return out;
}

export const DRAWINGS: Drawing[] = [
  {
    id: 'house',
    name: 'House',
    strokes: [
      [
        [20, 90],
        [20, 48],
        [50, 18],
        [80, 48],
        [80, 90],
        [20, 90],
      ],
      [
        [43, 90],
        [43, 68],
        [57, 68],
        [57, 90],
      ],
      box(27, 56, 10, 10),
      box(63, 56, 10, 10),
    ],
    lookalikes: ['tent', 'castle'],
  },
  { id: 'star', name: 'Star', strokes: [star(50, 52, 42, 17)], lookalikes: ['flower', 'sun'] },
  { id: 'heart', name: 'Heart', strokes: [heart(50, 50, 2.6)], lookalikes: ['apple', 'balloon'] },
  {
    id: 'sun',
    name: 'Sun',
    strokes: [
      ring(50, 50, 20),
      ...Array.from({ length: 8 }, (_, i): Stroke => {
        const a = (i * Math.PI) / 4;
        return [
          [r1(50 + Math.cos(a) * 28), r1(50 + Math.sin(a) * 28)],
          [r1(50 + Math.cos(a) * 42), r1(50 + Math.sin(a) * 42)],
        ];
      }),
    ],
    lookalikes: ['flower', 'clock'],
  },
  {
    id: 'fish',
    name: 'Fish',
    strokes: [
      [
        ...arc(45, 50, 30, 18, 200, 340, 16),
        [88, 32],
        [88, 68],
        ...arc(45, 50, 30, 18, 20, 160, 16),
        arc(45, 50, 30, 18, 200, 200, 1)[0],
      ],
      ring(28, 46, 3, 10),
      arc(40, 50, 8, 12, -60, 60, 8),
    ],
    lookalikes: ['bird', 'boat'],
  },
  {
    id: 'tree',
    name: 'Tree',
    strokes: [
      [[44, 92], [44, 62], ...arc(50, 42, 30, 26, 120, 420, 30), [56, 62], [56, 92], [44, 92]],
      arc(46, 40, 8, 6, 180, 360, 8),
    ],
    lookalikes: ['mushroom', 'cloud'],
  },
  {
    id: 'cup',
    name: 'Mug',
    strokes: [
      [
        [24, 30],
        [26, 86],
        [66, 86],
        [68, 30],
        [24, 30],
      ],
      arc(68, 55, 16, 14, -80, 80, 12),
      arc(38, 18, 3, 6, 90, 450, 8),
      arc(52, 16, 3, 6, 90, 450, 8),
    ],
    lookalikes: ['bucket', 'bell'],
  },
  {
    id: 'boat',
    name: 'Sailing Boat',
    strokes: [
      [
        [10, 70],
        [90, 70],
        [76, 88],
        [24, 88],
        [10, 70],
      ],
      [
        [50, 70],
        [50, 12],
      ],
      [
        [50, 16],
        [80, 64],
        [50, 64],
      ],
      [
        [48, 24],
        [24, 62],
        [48, 62],
      ],
    ],
    lookalikes: ['fish', 'kite'],
  },
  {
    id: 'umbrella',
    name: 'Umbrella',
    strokes: [
      [
        ...arc(50, 50, 40, 36, 180, 360, 20),
        ...arc(80, 50, 10, 6, 0, 180, 6),
        ...arc(60, 50, 10, 6, 0, 180, 6),
        ...arc(40, 50, 10, 6, 0, 180, 6),
        ...arc(20, 50, 10, 6, 0, 180, 6),
      ],
      [[50, 14], [50, 84], ...arc(43, 84, 7, 7, 0, 180, 8)],
    ],
    lookalikes: ['mushroom', 'bell'],
  },
  {
    id: 'apple',
    name: 'Apple',
    strokes: [
      [[50, 40], ...arc(50, 62, 30, 30, -60, 240, 30), [50, 40]],
      [
        [50, 40],
        [53, 22],
      ],
      [...arc(63, 26, 9, 4, 180, 360, 8), ...arc(63, 26, 9, 4, 0, 180, 8)],
    ],
    lookalikes: ['heart', 'balloon'],
  },
  {
    id: 'car',
    name: 'Car',
    strokes: [
      [
        [8, 72],
        [8, 56],
        [26, 54],
        [36, 36],
        [66, 36],
        [78, 54],
        [92, 58],
        [92, 72],
        [8, 72],
      ],
      ring(28, 74, 9, 16),
      ring(72, 74, 9, 16),
      [
        [40, 40],
        [40, 54],
        [72, 54],
        [64, 40],
        [40, 40],
      ],
    ],
    lookalikes: ['boat', 'bus'],
  },
  {
    id: 'cat',
    name: 'Cat',
    strokes: [
      [
        [18, 30],
        [28, 12],
        [40, 26],
        ...arc(50, 52, 32, 28, -110, 250, 26).slice(2, -2),
        [60, 26],
        [72, 12],
        [82, 30],
      ],
      ring(38, 48, 3, 8),
      ring(62, 48, 3, 8),
      [
        [46, 60],
        [50, 64],
        [54, 60],
      ],
      [
        [20, 62],
        [40, 62],
      ],
      [
        [60, 62],
        [80, 62],
      ],
    ],
    lookalikes: ['owl', 'bear'],
  },
  {
    id: 'moon',
    name: 'Moon',
    strokes: [[...arc(50, 50, 36, 36, 60, 300, 24), ...arc(68, 50, 26, 32, 240, 120, 18)]],
    lookalikes: ['banana', 'smile'],
  },
  {
    id: 'flower',
    name: 'Flower',
    strokes: [
      ...Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        return arc(r1(50 + Math.cos(a) * 18), r1(38 + Math.sin(a) * 18), 11, 11, 0, 360, 14);
      }),
      ring(50, 38, 9, 14),
      [
        [50, 56],
        [50, 94],
      ],
      [...arc(60, 78, 10, 5, 180, 360, 8), ...arc(60, 78, 10, 5, 0, 180, 8)],
    ],
    lookalikes: ['sun', 'star'],
  },
  {
    id: 'key',
    name: 'Key',
    strokes: [
      ring(26, 50, 16, 24),
      [
        [42, 50],
        [90, 50],
        [90, 62],
        [82, 62],
        [82, 54],
        [74, 54],
        [74, 62],
        [66, 62],
        [66, 50],
      ],
    ],
    lookalikes: ['spoon', 'lock'],
  },
  {
    id: 'kite',
    name: 'Kite',
    strokes: [
      [
        [50, 8],
        [76, 38],
        [50, 70],
        [24, 38],
        [50, 8],
      ],
      [
        [50, 8],
        [50, 70],
      ],
      [
        [24, 38],
        [76, 38],
      ],
      [
        [50, 70],
        [44, 78],
        [56, 84],
        [46, 90],
        [56, 96],
      ],
    ],
    lookalikes: ['star', 'boat'],
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    strokes: [
      [...arc(50, 50, 40, 36, 180, 360, 22), [90, 52], [10, 52]],
      [
        [40, 52],
        [38, 88],
        [62, 88],
        [60, 52],
      ],
      ring(36, 34, 5, 10),
      ring(60, 28, 5, 10),
    ],
    lookalikes: ['umbrella', 'tree'],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    strokes: [
      [[40, 74], [40, 34], ...arc(50, 34, 10, 26, 180, 360, 12), [60, 74], [40, 74]],
      ring(50, 44, 6, 12),
      [
        [40, 60],
        [28, 80],
        [40, 74],
      ],
      [
        [60, 60],
        [72, 80],
        [60, 74],
      ],
      [
        [44, 74],
        [50, 92],
        [56, 74],
      ],
    ],
    lookalikes: ['pencil', 'tower'],
  },
  {
    id: 'snowman',
    name: 'Snowman',
    strokes: [
      ring(50, 72, 20, 26),
      ring(50, 40, 14, 22),
      box(40, 14, 20, 12),
      [
        [34, 26],
        [66, 26],
      ],
      ring(45, 38, 1.5, 6),
      ring(55, 38, 1.5, 6),
    ],
    lookalikes: ['bear', 'robot'],
  },
  {
    id: 'envelope',
    name: 'Envelope',
    strokes: [
      box(14, 26, 72, 50),
      [
        [14, 26],
        [50, 56],
        [86, 26],
      ],
    ],
    lookalikes: ['house', 'book'],
  },
  {
    id: 'bulb',
    name: 'Light Bulb',
    strokes: [
      [[42, 68], ...arc(50, 38, 24, 26, 120, 420, 26).slice(1, -1), [58, 68], [42, 68]],
      box(42, 70, 16, 12),
      [
        [44, 76],
        [56, 76],
      ],
      [
        [46, 50],
        [50, 40],
        [54, 50],
      ],
    ],
    lookalikes: ['balloon', 'ice cream'],
  },
  {
    id: 'mountain',
    name: 'Mountains',
    strokes: [
      [
        [4, 86],
        [32, 34],
        [48, 58],
        [64, 22],
        [96, 86],
        [4, 86],
      ],
      [
        [56, 38],
        [64, 22],
        [72, 38],
        [64, 34],
        [56, 38],
      ],
    ],
    lookalikes: ['tent', 'castle'],
  },
  {
    id: 'icecream',
    name: 'Ice Cream',
    strokes: [
      [[30, 46], [50, 94], [70, 46], ...arc(50, 44, 22, 22, 0, -180, 18)],
      [
        [36, 56],
        [60, 72],
      ],
      [
        [64, 56],
        [42, 74],
      ],
    ],
    lookalikes: ['bulb', 'rocket'],
  },
  {
    id: 'clock',
    name: 'Clock',
    strokes: [
      ring(50, 50, 36, 32),
      [
        [50, 50],
        [50, 26],
      ],
      [
        [50, 50],
        [66, 58],
      ],
      ...[0, 90, 180, 270].map((d): Stroke => {
        const a = (d * Math.PI) / 180;
        return [
          [r1(50 + Math.cos(a) * 30), r1(50 + Math.sin(a) * 30)],
          [r1(50 + Math.cos(a) * 34), r1(50 + Math.sin(a) * 34)],
        ];
      }),
    ],
    lookalikes: ['sun', 'wheel'],
  },
  {
    id: 'glasses',
    name: 'Glasses',
    strokes: [
      ring(30, 52, 16, 24),
      ring(70, 52, 16, 24),
      arc(50, 52, 6, 5, 200, 340, 6),
      [
        [14, 50],
        [4, 40],
      ],
      [
        [86, 50],
        [96, 40],
      ],
    ],
    lookalikes: ['bicycle', 'owl'],
  },
  {
    id: 'balloon',
    name: 'Balloon',
    strokes: [
      [...arc(50, 36, 24, 30, 100, 440, 30), [46, 68], [54, 68], [50, 66]],
      [
        [50, 68],
        [46, 78],
        [54, 86],
        [48, 96],
      ],
    ],
    lookalikes: ['apple', 'bulb'],
  },
  {
    id: 'bell',
    name: 'Bell',
    strokes: [
      [
        [20, 76],
        ...arc(50, 46, 26, 32, 180, 360, 18).map(([x, y]): Pt => [x, Math.min(y, 76)]),
        [80, 76],
        [20, 76],
      ],
      ring(50, 82, 5, 10),
      ring(50, 10, 4, 8),
    ],
    lookalikes: ['cup', 'umbrella'],
  },
];

/** Every point of a drawing, in drawing order. */
export function allPoints(d: Drawing): Pt[] {
  return d.strokes.flat();
}

/** Picks n roughly evenly spaced points along a stroke (by length). */
export function samplePath(stroke: Stroke, n: number): Pt[] {
  const lengths = [0];
  for (let i = 1; i < stroke.length; i++)
    lengths.push(
      lengths[i - 1] + Math.hypot(stroke[i][0] - stroke[i - 1][0], stroke[i][1] - stroke[i - 1][1]),
    );
  const total = lengths[lengths.length - 1];
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const target = (total * k) / Math.max(1, n - 1);
    let j = 1;
    while (j < lengths.length - 1 && lengths[j] < target) j++;
    const seg = lengths[j] - lengths[j - 1] || 1;
    const t = (target - lengths[j - 1]) / seg;
    out.push([
      r1(stroke[j - 1][0] + (stroke[j][0] - stroke[j - 1][0]) * t),
      r1(stroke[j - 1][1] + (stroke[j][1] - stroke[j - 1][1]) * t),
    ]);
  }
  return out;
}

export function strokeLength(s: Stroke): number {
  let l = 0;
  for (let i = 1; i < s.length; i++) l += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  return l;
}

/** SVG path data for a stroke. */
export const toPath = (s: Stroke) => s.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');

/** Extra wrong answers that are not drawings themselves. */
export const DECOY_NAMES = [
  'Tent',
  'Castle',
  'Bird',
  'Bus',
  'Owl',
  'Bear',
  'Banana',
  'Spoon',
  'Lock',
  'Pencil',
  'Tower',
  'Robot',
  'Book',
  'Wheel',
  'Bicycle',
  'Bucket',
  'Smile',
];
