import type { Ground } from '../_shared/hill/vehicle';

/**
 * Motocross stages built from features — kickers, tabletops, whoops,
 * step-ups and drops — joined with smooth curves. Deterministic per stage.
 */
export interface Track {
  ground: Ground;
  length: number;
  checkpoints: number[];
}

type Feature = 'kicker' | 'table' | 'whoops' | 'step' | 'drop' | 'hill' | 'flat';

const STAGE_FEATURES: Feature[][] = [
  [
    'flat',
    'whoops',
    'kicker',
    'flat',
    'hill',
    'table',
    'flat',
    'whoops',
    'kicker',
    'flat',
    'drop',
    'table',
    'flat',
    'hill',
    'kicker',
    'flat',
  ],
  [
    'flat',
    'kicker',
    'whoops',
    'step',
    'flat',
    'table',
    'drop',
    'kicker',
    'hill',
    'whoops',
    'table',
    'step',
    'flat',
    'kicker',
    'drop',
    'hill',
    'kicker',
    'flat',
  ],
  [
    'flat',
    'step',
    'kicker',
    'whoops',
    'table',
    'drop',
    'step',
    'kicker',
    'hill',
    'whoops',
    'kicker',
    'table',
    'step',
    'drop',
    'whoops',
    'kicker',
    'hill',
    'table',
    'kicker',
    'flat',
  ],
];

export const STAGES = STAGE_FEATURES.length;

/** Builds a stage; `scale` (0.8–1.2) makes every feature bigger or smaller. */
export function buildTrack(stage: number, scale = 1): Track {
  const pts: [number, number][] = [
    [-400, 300],
    [300, 300],
  ];
  let x = 300;
  let y = 300;
  const add = (dx: number, dy: number) => {
    x += dx;
    y += dy;
    pts.push([x, y]);
  };
  const h = (v: number) => v * scale * (1 + stage * 0.12);
  for (const f of STAGE_FEATURES[stage]) {
    switch (f) {
      case 'flat':
        add(260, 0);
        break;
      case 'kicker':
        add(150, -h(55));
        add(40, h(5));
        add(70, h(50));
        add(160, 0);
        break;
      case 'table':
        add(150, -h(60));
        add(220, 0);
        add(150, h(60));
        add(80, 0);
        break;
      case 'whoops':
        for (let i = 0; i < 5; i++) {
          add(45, -h(16));
          add(45, h(16));
        }
        add(60, 0);
        break;
      case 'step':
        add(90, -h(38));
        add(140, 0);
        add(60, 0);
        break;
      case 'drop':
        add(120, 0);
        add(110, h(70));
        add(120, 0);
        break;
      case 'hill':
        add(260, -h(110));
        add(80, 0);
        add(260, h(110));
        add(60, 0);
        break;
    }
  }
  add(600, 0);
  const length = x - 400;
  // Cosine interpolation between the points keeps the surface smooth enough to ride.
  const ground: Ground = (px) => {
    let lo = 0;
    let hi = pts.length - 1;
    if (px <= pts[0][0]) return pts[0][1];
    if (px >= pts[hi][0]) return pts[hi][1];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid][0] <= px) lo = mid;
      else hi = mid;
    }
    const [x0, y0] = pts[lo];
    const [x1, y1] = pts[hi];
    const t = (px - x0) / (x1 - x0);
    const k = (1 - Math.cos(t * Math.PI)) / 2;
    return y0 + (y1 - y0) * k;
  };
  const checkpoints: number[] = [];
  for (let c = 1500; c < length; c += 1500) checkpoints.push(c);
  return { ground, length, checkpoints };
}
