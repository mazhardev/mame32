import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';

/**
 * Road Hopper: hop forward across an endless strip of grass, roads,
 * rivers and railways. Dodge the traffic, ride the logs across the water,
 * and don't dawdle — the view keeps creeping forward.
 */
export const COLS = 9;
export const CELL = 40;
export const W = COLS * CELL;
export const H = 640;

type LaneKind = 'grass' | 'road' | 'river' | 'rail';

export interface Mover {
  x: number;
  w: number;
}

export interface Lane {
  kind: LaneKind;
  /** Pixels per second; sign is the direction. */
  speed: number;
  movers: Mover[];
  trees: number[];
  /** Rail: seconds until the next train; warning shows below 1.2 s. */
  trainT: number;
  coin: number;
}

export interface State extends BaseState {
  col: number;
  row: number;
  /** Fractional x while riding a log. */
  x: number;
  hop: number;
  lanes: Map<number, Lane>;
  camera: number;
  creep: number;
  coins: number;
  best: number;
  swipe: { x: number; y: number } | null;
  cause: string;
  speedScale: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number; creep: number }> = {
  easy: { speed: 0.75, creep: 10 },
  normal: { speed: 1, creep: 16 },
  hard: { speed: 1.3, creep: 24 },
};

export function makeLane(row: number, random: () => number, speedScale: number): Lane {
  const lane: Lane = { kind: 'grass', speed: 0, movers: [], trees: [], trainT: 0, coin: -1 };
  if (row <= 2) return lane;
  const level = Math.min(1, row / 150);
  const r = random();
  if (r < 0.3) {
    for (let c = 0; c < COLS; c++) if (c !== 4 && random() < 0.18) lane.trees.push(c);
    if (random() < 0.15) lane.coin = Math.floor(random() * COLS);
    return lane;
  }
  const dir = random() < 0.5 ? -1 : 1;
  if (r < 0.62) {
    lane.kind = 'road';
    lane.speed = dir * (60 + random() * 70 + level * 80) * speedScale;
    const count = 2 + Math.floor(random() * 2);
    const w = random() < 0.25 ? CELL * 2 : CELL * 1.3;
    for (let i = 0; i < count; i++) lane.movers.push({ x: (i * (W + 120)) / count + random() * 30, w });
  } else if (r < 0.88) {
    lane.kind = 'river';
    lane.speed = dir * (40 + random() * 45 + level * 40) * speedScale;
    const count = 3;
    const w = CELL * (2 + Math.floor(random() * 2));
    for (let i = 0; i < count; i++) lane.movers.push({ x: (i * (W + 160)) / count, w });
  } else {
    lane.kind = 'rail';
    lane.speed = dir * 900;
    lane.trainT = 2 + random() * 4;
  }
  return lane;
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const c = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    col: 4,
    row: 0,
    x: 4 * CELL,
    hop: 0,
    lanes: new Map(),
    // Start with the hopper about two thirds of the way down the view.
    camera: CELL - H * 0.35,
    creep: c.creep,
    coins: 0,
    best: 0,
    swipe: null,
    cause: '',
    speedScale: c.speed,
  };
  for (let r = -4; r < 20; r++) s.lanes.set(r, makeLane(r, random, c.speed));
  return s;
}

export function lane(s: State, row: number, random: () => number): Lane {
  let l = s.lanes.get(row);
  if (!l) {
    l = makeLane(row, random, s.speedScale);
    s.lanes.set(row, l);
  }
  return l;
}

/** Tries to hop one cell. Trees block sideways and forward moves. */
export function hop(s: State, dc: number, dr: number, random: () => number): boolean {
  const col = Math.round(s.x / CELL) + dc;
  const row = s.row + dr;
  if (col < 0 || col >= COLS || row < s.best - 6 || row < -3) return false;
  const target = lane(s, row, random);
  if (target.kind === 'grass' && target.trees.includes(col)) return false;
  s.col = col;
  s.row = row;
  s.x = col * CELL;
  s.hop = 0.12;
  if (row > s.best) {
    s.best = row;
    s.score = s.best + s.coins * 5;
  }
  if (target.coin === col) {
    target.coin = -1;
    s.coins += 1;
    s.score = s.best + s.coins * 5;
    s.events.push('coin');
  }
  s.events.push('jump');
  return true;
}

function die(s: State, cause: string) {
  if (s.over) return;
  s.over = true;
  s.cause = cause;
  s.events.push(cause === 'water' ? 'failure' : 'hit');
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.hop = Math.max(0, s.hop - dt);
  if (input.pressed.has('up')) hop(s, 0, 1, random);
  else if (input.pressed.has('down')) hop(s, 0, -1, random);
  else if (input.pressed.has('left')) hop(s, -1, 0, random);
  else if (input.pressed.has('right')) hop(s, 1, 0, random);
  else if (input.pressed.has('action')) hop(s, 0, 1, random);
  // Tap to hop forward, swipe to hop in a direction.
  if (input.pointer.pressed) s.swipe = { x: input.pointer.x, y: input.pointer.y };
  if (input.pointer.released && s.swipe) {
    const dx = input.pointer.x - s.swipe.x;
    const dy = input.pointer.y - s.swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) hop(s, 0, 1, random);
    else if (Math.abs(dx) > Math.abs(dy)) hop(s, Math.sign(dx), 0, random);
    else hop(s, 0, dy < 0 ? 1 : -1, random);
    s.swipe = null;
  }

  for (let r = s.row - 8; r < s.row + 18; r++) {
    const l = lane(s, r, random);
    if (l.kind === 'road' || l.kind === 'river') {
      for (const m of l.movers) {
        m.x += l.speed * dt;
        const span = W + 160;
        if (l.speed > 0 && m.x > W + 40) m.x -= span;
        if (l.speed < 0 && m.x + m.w < -40) m.x += span;
      }
    } else if (l.kind === 'rail') {
      l.trainT -= dt;
      if (l.trainT <= 0 && !l.movers.length) l.movers.push({ x: l.speed > 0 ? -CELL * 8 : W, w: CELL * 8 });
      for (const m of l.movers) m.x += l.speed * dt;
      const train = l.movers[0];
      if (train && (l.speed > 0 ? train.x > W + 20 : train.x + train.w < -20)) {
        l.movers = [];
        l.trainT = 3 + random() * 4;
      }
    }
  }

  const here = lane(s, s.row, random);
  const px = s.x + CELL / 2;
  if (here.kind === 'road' || here.kind === 'rail') {
    if (here.movers.some((m) => px + 12 > m.x && px - 12 < m.x + m.w)) die(s, here.kind === 'rail' ? 'train' : 'car');
  } else if (here.kind === 'river' && s.hop <= 0) {
    const log = here.movers.find((m) => px > m.x + 4 && px < m.x + m.w - 4);
    if (!log) die(s, 'water');
    else {
      s.x += here.speed * dt;
      if (s.x < -CELL / 2 || s.x > W - CELL / 2) die(s, 'water');
    }
  }

  // The view creeps forward; being left behind is fatal.
  const target = s.row * CELL - H * 0.35 + CELL;
  s.camera = Math.max(s.camera + s.creep * dt, Math.min(target, s.camera + 200 * dt));
  const screenY = H - (s.row * CELL - s.camera) - CELL;
  if (screenY > H - 4) die(s, 'eagle');
  for (const key of s.lanes.keys()) if (key < s.row - 12) s.lanes.delete(key);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const rowY = (row: number) => H - (row * CELL - s.camera) - CELL;
  const first = Math.floor(s.camera / CELL) - 1;
  for (let r = first; r < first + H / CELL + 3; r++) {
    const l = s.lanes.get(r);
    const y = rowY(r);
    if (!l) continue;
    if (l.kind === 'grass') {
      ctx.fillStyle = r % 2 ? '#86efac' : '#7ddc98';
      ctx.fillRect(0, y, W, CELL);
      for (const c of l.trees) {
        circle(ctx, c * CELL + 20, y + 16, 15, '#15803d');
        ctx.fillStyle = '#78350f';
        ctx.fillRect(c * CELL + 16, y + 26, 8, 12);
      }
      if (l.coin >= 0) circle(ctx, l.coin * CELL + 20, y + 20, 8, '#facc15');
    } else if (l.kind === 'road') {
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, y, W, CELL);
      ctx.fillStyle = '#6b7280';
      for (let x = 10; x < W; x += 40) ctx.fillRect(x, y + CELL - 3, 20, 2);
      for (const m of l.movers) {
        const hue = (Math.abs(Math.round(m.w * 7 + r * 53)) % 360);
        fillRound(ctx, m.x, y + 6, m.w, CELL - 12, 6, `hsl(${hue} 70% 55%)`);
        ctx.fillStyle = 'rgba(224,242,254,0.85)';
        const front = l.speed > 0 ? m.x + m.w - 12 : m.x + 4;
        ctx.fillRect(front, y + 10, 8, CELL - 20);
      }
    } else if (l.kind === 'river') {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, y, W, CELL);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(((s.time * 30 + r * 40) % W), y + 12, 20, 2);
      for (const m of l.movers) {
        fillRound(ctx, m.x, y + 7, m.w, CELL - 14, 8, '#92400e');
        ctx.fillStyle = '#b45309';
        ctx.fillRect(m.x + 6, y + 12, m.w - 12, 3);
      }
    } else {
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(0, y, W, CELL);
      ctx.fillStyle = '#57534e';
      ctx.fillRect(0, y + 10, W, 3);
      ctx.fillRect(0, y + 27, W, 3);
      const warning = !l.movers.length && l.trainT < 1.2;
      circle(ctx, 12, y + 20, 6, warning && Math.floor(s.time * 8) % 2 ? '#ef4444' : '#44403c');
      for (const m of l.movers) {
        fillRound(ctx, m.x, y + 4, m.w, CELL - 8, 4, '#dc2626');
        ctx.fillStyle = '#fef3c7';
        for (let x = m.x + 12; x < m.x + m.w - 10; x += 30) ctx.fillRect(x, y + 10, 16, 8);
      }
    }
  }
  // The hopper: a chunky white bird.
  const lift = s.hop > 0 ? Math.sin((s.hop / 0.12) * Math.PI) * 10 : 0;
  const x = s.x + CELL / 2;
  const y = rowY(s.row) + CELL / 2 - lift;
  if (!(s.over && s.cause === 'water')) {
    fillRound(ctx, x - 13, y - 12, 26, 24, 8, '#f8fafc');
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - 3, y - 17, 6, 6);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(x - 3, y - 4, 6, 5);
    circle(ctx, x - 5, y - 6, 2, '#111827');
    circle(ctx, x + 5, y - 6, 2, '#111827');
  }
  text(ctx, String(s.score), 14, 26, { size: 24, align: 'left', color: '#fff' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Coins', value: s.coins },
  ],
  result: (s) => ({
    score: s.score,
    title:
      s.cause === 'water' ? 'Splash!' : s.cause === 'train' ? 'Hit by a train!' : s.cause === 'eagle' ? 'Too slow!' : 'Squashed!',
    details: [
      { label: 'Rows crossed', value: String(s.best) },
      { label: 'Coins', value: String(s.coins) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('road-hopper.fifty', s.best);
    void reportProgress('road-hopper.two-hundred', s.best);
    void reportProgress('road-hopper.coins', s.coins);
    void incrementProgress('road-hopper.hops', s.best);
  },
  touch: { pad: 'dpad' },
  startHint: 'Tap or press ↑ to hop forward. Swipe or use the arrow keys to hop any way.',
};
