import { circle, ellipse, path, poly, rect } from '../_shared/creative/regions';
import type { Region } from '../_shared/creative/regions';

/** Original colouring pages, each on a 200 × 150 canvas. */
export interface Page {
  id: string;
  name: string;
  icon: string;
  regions: Region[];
}

const flower = (id: string, x: number, y: number, r: number): Region[] => [
  ...[0, 1, 2, 3, 4].map((k) => {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    return circle(`${id}p${k}`, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75);
  }),
  circle(`${id}c`, x, y, r * 0.7),
];

export const PAGES: Page[] = [
  {
    id: 'cottage',
    name: 'Cottage',
    icon: '🏡',
    regions: [
      rect('sky', 0, 0, 200, 150),
      path('hill2', 'M0,100 Q60,70 120,95 Q160,80 200,92 L200,150 L0,150 Z'),
      path('hill1', 'M0,118 Q70,96 130,116 Q170,108 200,118 L200,150 L0,150 Z'),
      circle('sun', 168, 26, 14),
      ellipse('cloud1', 40, 24, 18, 8),
      ellipse('cloud2', 56, 20, 12, 7),
      ellipse('cloud3', 110, 30, 16, 6),
      rect('chimney', 84, 36, 10, 20),
      poly('roof', [
        [52, 64],
        [86, 34],
        [120, 64],
      ]),
      rect('wall', 58, 64, 56, 44),
      rect('door', 78, 82, 16, 26, 2),
      circle('knob', 91, 96, 1.5),
      rect('win1', 63, 72, 11, 11),
      rect('win2', 98, 72, 11, 11),
      rect('trunk', 148, 80, 8, 30),
      circle('crown1', 152, 70, 14),
      circle('crown2', 141, 78, 9),
      circle('crown3', 163, 78, 9),
      path('path', 'M80,108 L92,108 Q96,128 108,150 L74,150 Q82,128 80,108 Z'),
      ...flower('f1', 30, 120, 3.5),
      ...flower('f2', 44, 132, 3.5),
      ...flower('f3', 172, 128, 3.5),
    ],
  },
  {
    id: 'sea',
    name: 'Under the Sea',
    icon: '🐠',
    regions: [
      rect('water', 0, 0, 200, 150),
      path('sand', 'M0,128 Q50,118 100,126 Q150,134 200,124 L200,150 L0,150 Z'),
      path('weed1', 'M22,130 Q14,110 24,94 Q32,80 24,62 Q36,80 32,96 Q26,110 30,130 Z'),
      path('weed2', 'M176,128 Q186,108 176,90 Q170,76 178,58 Q188,76 184,92 Q190,108 184,128 Z'),
      ellipse('fish1', 78, 58, 26, 15),
      poly('tail1', [
        [102, 58],
        [122, 44],
        [122, 72],
      ]),
      poly('fin1', [
        [70, 44],
        [84, 34],
        [90, 46],
      ]),
      circle('eye1', 62, 54, 3.5),
      ellipse('fish2', 132, 98, 18, 10),
      poly('tail2', [
        [114, 98],
        [100, 88],
        [100, 108],
      ]),
      circle('eye2', 143, 95, 2.5),
      poly('star', [
        [60, 120],
        [64, 129],
        [74, 130],
        [66, 136],
        [69, 146],
        [60, 140],
        [51, 146],
        [54, 136],
        [46, 130],
        [56, 129],
      ]),
      path('shell', 'M120,140 Q130,120 140,140 Z'),
      ellipse('rock', 160, 136, 16, 8),
      circle('b1', 40, 40, 4),
      circle('b2', 46, 28, 3),
      circle('b3', 150, 40, 5),
      circle('b4', 158, 26, 3),
    ],
  },
  {
    id: 'rocket',
    name: 'Rocket Trip',
    icon: '🚀',
    regions: [
      rect('space', 0, 0, 200, 150),
      circle('planet', 160, 110, 22),
      ellipse('ring', 160, 110, 34, 7),
      circle('moon', 32, 30, 14),
      circle('crater1', 27, 26, 3),
      circle('crater2', 37, 35, 2),
      path('body', 'M88,40 Q100,10 112,40 L112,100 L88,100 Z'),
      circle('window', 100, 58, 7),
      circle('window2', 100, 58, 4),
      poly('fin1', [
        [88, 78],
        [74, 104],
        [88, 100],
      ]),
      poly('fin2', [
        [112, 78],
        [126, 104],
        [112, 100],
      ]),
      rect('band', 88, 86, 24, 6),
      poly('flame1', [
        [90, 100],
        [100, 132],
        [110, 100],
      ]),
      poly('flame2', [
        [95, 100],
        [100, 118],
        [105, 100],
      ]),
      ...[
        [60, 20],
        [140, 30],
        [180, 60],
        [40, 90],
        [70, 130],
      ].map(([x, y], i) =>
        poly(`star${i}`, [
          [x, y - 5],
          [x + 1.5, y - 1.5],
          [x + 5, y],
          [x + 1.5, y + 1.5],
          [x, y + 5],
          [x - 1.5, y + 1.5],
          [x - 5, y],
          [x - 1.5, y - 1.5],
        ]),
      ),
    ],
  },
  {
    id: 'icecream',
    name: 'Ice Cream',
    icon: '🍦',
    regions: [
      rect('bg', 0, 0, 200, 150),
      rect('table', 0, 128, 200, 22),
      poly('cone', [
        [80, 76],
        [100, 132],
        [120, 76],
      ]),
      circle('scoop1', 100, 70, 22),
      circle('scoop2', 88, 52, 16),
      circle('scoop3', 112, 50, 15),
      path('drip', 'M84,82 Q86,96 90,84 Q94,98 98,86 L98,80 Z'),
      circle('cherry', 102, 30, 6),
      path('stem', 'M102,24 Q106,14 114,12 L115,14 Q108,16 104,25 Z'),
      ...[
        [88, 46, 20],
        [110, 44, -30],
        [96, 66, 60],
        [112, 66, 10],
        [80, 60, -50],
      ].map(([x, y, a], i) => ({
        id: `spr${i}`,
        shape: 'rect' as const,
        attrs: {
          x: x - 3,
          y: y - 1,
          width: 6,
          height: 2,
          rx: 1,
          transform: `rotate(${a} ${x} ${y})`,
        },
      })),
      circle('dot1', 30, 30, 10),
      circle('dot2', 170, 40, 14),
      circle('dot3', 160, 100, 8),
      circle('dot4', 40, 100, 12),
    ],
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    icon: '🦋',
    regions: [
      rect('bg', 0, 0, 200, 150),
      path('wingUL', 'M98,70 Q60,10 40,40 Q30,70 98,76 Z'),
      path('wingUR', 'M102,70 Q140,10 160,40 Q170,70 102,76 Z'),
      path('wingLL', 'M98,80 Q50,90 60,120 Q80,136 98,86 Z'),
      path('wingLR', 'M102,80 Q150,90 140,120 Q120,136 102,86 Z'),
      circle('spotUL', 62, 46, 8),
      circle('spotUR', 138, 46, 8),
      circle('spotLL', 74, 108, 6),
      circle('spotLR', 126, 108, 6),
      ellipse('body', 100, 84, 5, 26),
      circle('head', 100, 54, 6),
      path('ant1', 'M98,50 Q90,34 84,30 L85,28 Q92,32 100,49 Z'),
      path('ant2', 'M102,50 Q110,34 116,30 L115,28 Q108,32 100,49 Z'),
      ...flower('fa', 24, 130, 4),
      ...flower('fb', 176, 128, 4),
    ],
  },
  {
    id: 'castle',
    name: 'Castle',
    icon: '🏰',
    regions: [
      rect('sky', 0, 0, 200, 150),
      path('ground', 'M0,120 Q100,110 200,120 L200,150 L0,150 Z'),
      path('moat', 'M30,128 Q100,118 170,128 Q100,140 30,128 Z'),
      rect('towerL', 40, 50, 24, 74),
      rect('towerR', 136, 50, 24, 74),
      poly('roofL', [
        [36, 50],
        [52, 22],
        [68, 50],
      ]),
      poly('roofR', [
        [132, 50],
        [148, 22],
        [164, 50],
      ]),
      rect('wall', 64, 72, 72, 52),
      ...[0, 1, 2, 3, 4].map((k) => rect(`bat${k}`, 66 + k * 14, 64, 8, 8)),
      path('gate', 'M88,124 L88,100 Q100,86 112,100 L112,124 Z'),
      rect('winL', 47, 70, 10, 14, 5),
      rect('winR', 143, 70, 10, 14, 5),
      poly('flagL', [
        [52, 22],
        [52, 8],
        [64, 13],
      ]),
      poly('flagR', [
        [148, 22],
        [148, 8],
        [160, 13],
      ]),
      circle('sun', 20, 20, 10),
    ],
  },
];
