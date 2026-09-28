import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Hidden Object: a cluttered scene of everyday items. The player must find
 * each item on the list; every listed item appears exactly once, hidden
 * among many others at different sizes and angles.
 */
export const W = 400;
export const H = 300;

export const ITEMS: [string, string][] = [
  ['🔑', 'key'], ['🧦', 'sock'], ['🎈', 'balloon'], ['📎', 'paper clip'], ['✏️', 'pencil'], ['🧲', 'magnet'],
  ['🕯️', 'candle'], ['🎲', 'die'], ['🧩', 'puzzle piece'], ['🔔', 'bell'], ['⌛', 'hourglass'], ['🧸', 'teddy bear'],
  ['🪁', 'kite'], ['🎩', 'top hat'], ['👓', 'glasses'], ['🧤', 'gloves'], ['🥄', 'spoon'], ['☂️', 'umbrella'],
  ['📚', 'books'], ['🖍️', 'crayon'], ['🔦', 'torch'], ['🧵', 'thread'], ['🪙', 'coin'], ['🍎', 'apple'],
  ['🍌', 'banana'], ['🍩', 'doughnut'], ['🧁', 'cupcake'], ['🥕', 'carrot'], ['🍄', 'mushroom'], ['🌵', 'cactus'],
  ['🌻', 'sunflower'], ['🐚', 'shell'], ['🦋', 'butterfly'], ['🐢', 'turtle'], ['🐟', 'fish'], ['🐞', 'ladybird'],
  ['⚽', 'football'], ['🏀', 'basketball'], ['🎾', 'tennis ball'], ['🛼', 'roller skate'], ['🎸', 'guitar'], ['🥁', 'drum'],
  ['🎺', 'trumpet'], ['📷', 'camera'], ['⏰', 'alarm clock'], ['🧭', 'compass'], ['🔭', 'telescope'], ['🪴', 'pot plant'],
  ['🧯', 'fire extinguisher'], ['🧹', 'broom'], ['🪣', 'bucket'], ['🧺', 'basket'], ['🎁', 'present'], ['🏺', 'vase'],
  ['🪑', 'chair'], ['🛏️', 'bed'], ['🚲', 'bicycle'], ['🚗', 'toy car'], ['⛵', 'sailboat'], ['✂️', 'scissors'],
];

export const LEVELS: Record<DifficultySetting, { targets: number; clutter: number; minSize: number; maxSize: number; seconds: number }> = {
  easy: { targets: 6, clutter: 34, minSize: 22, maxSize: 34, seconds: 120 },
  normal: { targets: 8, clutter: 55, minSize: 17, maxSize: 30, seconds: 150 },
  hard: { targets: 10, clutter: 85, minSize: 13, maxSize: 26, seconds: 180 },
};

export interface Placed {
  key: number;
  item: number;
  x: number;
  y: number;
  size: number;
  rot: number;
}

export interface Scene {
  placed: Placed[];
  targets: number[];
}

export function generateScene(difficulty: DifficultySetting, seed: string): Scene {
  const rng = createRng(seed);
  const level = LEVELS[difficulty];
  const order = rng.shuffle(ITEMS.map((_, i) => i));
  const targets = order.slice(0, level.targets);
  const decoys = order.slice(level.targets);
  const placed: Placed[] = [];
  const place = (item: number, key: number, spacing: number) => {
    for (let t = 0; t < 60; t++) {
      const size = rng.range(level.minSize, level.maxSize);
      const x = rng.range(size / 2, W - size / 2);
      const y = rng.range(size / 2, H - size / 2);
      // Targets keep a little clear space so they are findable, not buried.
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.size + size) * spacing)) continue;
      placed.push({ key, item, x, y, size, rot: rng.range(-35, 35) });
      return;
    }
  };
  let key = 0;
  targets.forEach((item) => place(item, key++, 0.55));
  for (let i = 0; i < level.clutter; i++) place(decoys[i % decoys.length], key++, 0.35);
  // Draw order mixed so targets are not all on top.
  return { placed: rng.shuffle(placed), targets };
}

/**
 * The topmost item under a tap. Items are drawn in array order, so the
 * last one hit is the one on top.
 */
export function itemAt(scene: Scene, x: number, y: number): Placed | null {
  let hit: Placed | null = null;
  for (const p of scene.placed) if (Math.hypot(p.x - x, p.y - y) <= p.size * 0.5) hit = p;
  return hit;
}

export function scoreFor(found: number, total: number, secondsLeft: number, misses: number, hints: number): number {
  return Math.max(0, found * 120 + (found === total ? Math.round(secondsLeft) * 5 : 0) - misses * 20 - hints * 80);
}
