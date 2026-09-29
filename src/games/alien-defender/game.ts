import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, rectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Alien Defender: a formation of aliens marches side to side, stepping
 * down each time it reaches an edge and speeding up as it thins out. Move
 * the cannon, fire from behind the crumbling shields and stop them before
 * they land.
 */
export const W = 480;
export const H = 560;
const COLS = 10;
const ROWS = 5;
const CELL_W = 36;
const CELL_H = 30;
const PLAYER_Y = H - 50;
const GROUND = H - 26;

export interface Alien {
  col: number;
  row: number;
  alive: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  vy: number;
}

export interface State extends BaseState {
  px: number;
  lives: number;
  aliens: Alien[];
  ox: number;
  oy: number;
  dir: number;
  stepT: number;
  frame: number;
  shots: Bullet[];
  bombs: Bullet[];
  shields: { x: number; y: number }[];
  ufo: { x: number; dir: number } | null;
  ufoT: number;
  wave: number;
  hitT: number;
  sparks: Spark[];
  bombRate: number;
  kills: number;
}

const SETTINGS: Record<DifficultySetting, { bomb: number; lives: number }> = {
  easy: { bomb: 0.7, lives: 4 },
  normal: { bomb: 1, lives: 3 },
  hard: { bomb: 1.5, lives: 3 },
};

const ROW_POINTS = [40, 30, 30, 20, 20];

function makeShields(): { x: number; y: number }[] {
  const blocks: { x: number; y: number }[] = [];
  for (let k = 0; k < 4; k++) {
    const x0 = 50 + k * 110;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 8; c++) {
        // An arch: no blocks in the bottom middle.
        if (r >= 2 && c >= 3 && c <= 4) continue;
        blocks.push({ x: x0 + c * 7, y: PLAYER_Y - 70 + r * 7 });
      }
  }
  return blocks;
}

function newWave(s: State) {
  s.aliens = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s.aliens.push({ col: c, row: r, alive: true });
  s.ox = 40;
  s.oy = 70 + Math.min(4, s.wave - 1) * 14;
  s.dir = 1;
  s.stepT = 0.6;
}

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    px: W / 2,
    lives: c.lives,
    aliens: [],
    ox: 40,
    oy: 70,
    dir: 1,
    stepT: 0.6,
    frame: 0,
    shots: [],
    bombs: [],
    shields: makeShields(),
    ufo: null,
    ufoT: 18,
    wave: 1,
    hitT: 0,
    sparks: [],
    bombRate: c.bomb,
    kills: 0,
  };
  newWave(s);
  return s;
}

export function alienRect(s: State, a: Alien) {
  return { x: s.ox + a.col * CELL_W + 5, y: s.oy + a.row * CELL_H + 4, w: CELL_W - 10, h: CELL_H - 10 };
}

/** Seconds between formation steps: fewer aliens march faster. */
export function stepInterval(alive: number, wave: number): number {
  return Math.max(0.04, 0.55 * (alive / (ROWS * COLS)) ** 0.9 * Math.pow(0.9, wave - 1) + 0.03);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt);
  if (s.hitT > 0) {
    s.hitT -= dt;
    return;
  }
  const move = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (input.pointer.down) s.px += Math.sign(input.pointer.x - s.px) * Math.min(Math.abs(input.pointer.x - s.px), 260 * dt);
  s.px = Math.max(20, Math.min(W - 20, s.px + move * 260 * dt));
  if ((input.pressed.has('action') || input.pressed.has('up') || input.pointer.pressed) && s.shots.length < 2) {
    s.shots.push({ x: s.px, y: PLAYER_Y - 12, vy: -520 });
    s.events.push('shoot');
  }

  const alive = s.aliens.filter((a) => a.alive);
  s.stepT -= dt;
  if (s.stepT <= 0) {
    s.stepT = stepInterval(alive.length, s.wave);
    s.frame ^= 1;
    const minCol = Math.min(...alive.map((a) => a.col));
    const maxCol = Math.max(...alive.map((a) => a.col));
    const left = s.ox + minCol * CELL_W;
    const right = s.ox + (maxCol + 1) * CELL_W;
    if ((s.dir > 0 && right + 8 > W - 6) || (s.dir < 0 && left - 8 < 6)) {
      s.dir *= -1;
      s.oy += 14;
    } else s.ox += s.dir * 8;
    s.events.push('tick');
  }

  // The lowest alien in a random column drops a bomb now and then.
  if (random() < dt * s.bombRate * (1.2 + s.wave * 0.2)) {
    const cols = [...new Set(alive.map((a) => a.col))];
    const col = cols[Math.floor(random() * cols.length)];
    const shooter = alive.filter((a) => a.col === col).sort((a, b) => b.row - a.row)[0];
    if (shooter) {
      const r = alienRect(s, shooter);
      s.bombs.push({ x: r.x + r.w / 2, y: r.y + r.h, vy: 170 + s.wave * 15 });
    }
  }

  s.ufoT -= dt;
  if (!s.ufo && s.ufoT <= 0) {
    s.ufo = random() < 0.5 ? { x: -30, dir: 1 } : { x: W + 30, dir: -1 };
    s.ufoT = 20 + random() * 10;
  }
  if (s.ufo) {
    s.ufo.x += s.ufo.dir * 110 * dt;
    if (s.ufo.x < -40 || s.ufo.x > W + 40) s.ufo = null;
  }

  for (const b of s.shots) b.y += b.vy * dt;
  for (const b of s.bombs) b.y += b.vy * dt;

  // Shots against aliens, the mothership and shields.
  for (const b of s.shots) {
    const shot = { x: b.x - 1.5, y: b.y - 6, w: 3, h: 10 };
    const hit = alive.find((a) => a.alive && rectHit(shot, alienRect(s, a)));
    if (hit) {
      hit.alive = false;
      b.y = -99;
      s.score += ROW_POINTS[hit.row];
      s.kills += 1;
      const r = alienRect(s, hit);
      burst(s.sparks, r.x + r.w / 2, r.y + r.h / 2, '#a3e635', 10, 140, random);
      s.events.push('explosion');
      continue;
    }
    if (s.ufo && rectHit(shot, { x: s.ufo.x - 20, y: 34, w: 40, h: 16 })) {
      s.score += [50, 100, 150, 300][Math.floor(random() * 4)];
      burst(s.sparks, s.ufo.x, 42, '#f472b6', 20, 160, random);
      s.ufo = null;
      b.y = -99;
      s.events.push('coin');
      continue;
    }
    const block = s.shields.findIndex((k) => rectHit(shot, { x: k.x, y: k.y, w: 7, h: 7 }));
    if (block >= 0) {
      s.shields.splice(block, 1);
      b.y = -99;
    }
  }
  for (const b of s.bombs) {
    const bomb = { x: b.x - 2, y: b.y - 5, w: 4, h: 10 };
    const block = s.shields.findIndex((k) => rectHit(bomb, { x: k.x, y: k.y, w: 7, h: 7 }));
    if (block >= 0) {
      s.shields.splice(block, 1);
      b.y = H + 99;
      continue;
    }
    if (rectHit(bomb, { x: s.px - 16, y: PLAYER_Y - 8, w: 32, h: 16 })) {
      b.y = H + 99;
      s.lives -= 1;
      s.hitT = 1;
      s.bombs = [];
      burst(s.sparks, s.px, PLAYER_Y, '#38bdf8', 24, 180, random);
      s.events.push('hit');
      if (s.lives <= 0) s.over = true;
      break;
    }
  }
  s.shots = s.shots.filter((b) => b.y > 0);
  s.bombs = s.bombs.filter((b) => b.y < GROUND);

  // Aliens eat through shields they touch, and win if they land.
  for (const a of s.aliens) {
    if (!a.alive) continue;
    const r = alienRect(s, a);
    s.shields = s.shields.filter((k) => !rectHit(r, { x: k.x, y: k.y, w: 7, h: 7 }));
    if (r.y + r.h >= PLAYER_Y - 10) {
      s.over = true;
      s.events.push('gameOver');
    }
  }
  if (!s.aliens.some((a) => a.alive) && !s.over) {
    s.wave += 1;
    s.score += 100;
    s.events.push('levelComplete');
    newWave(s);
  }
}

function drawAlien(ctx: CanvasRenderingContext2D, x: number, y: number, row: number, frame: number) {
  const color = row === 0 ? '#f472b6' : row < 3 ? '#a3e635' : '#38bdf8';
  ctx.fillStyle = color;
  if (row === 0) {
    ctx.beginPath();
    ctx.moveTo(x + 13, y);
    ctx.lineTo(x + 26, y + 12);
    ctx.lineTo(x + 20, y + 20);
    ctx.lineTo(x + 6, y + 20);
    ctx.lineTo(x, y + 12);
    ctx.fill();
  } else if (row < 3) {
    ctx.fillRect(x + 3, y + 4, 20, 12);
    ctx.fillRect(x, y + 8, 26, 6);
    ctx.fillRect(x + (frame ? 0 : 3), y + 16, 5, 5);
    ctx.fillRect(x + (frame ? 21 : 18), y + 16, 5, 5);
  } else {
    ctx.beginPath();
    ctx.ellipse(x + 13, y + 9, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 3 + (frame ? 2 : 0), y + 15, 4, 6);
    ctx.fillRect(x + 19 - (frame ? 2 : 0), y + 15, 4, 6);
  }
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + 8, y + 7, 3, 3);
  ctx.fillRect(x + 15, y + 7, 3, 3);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, W, H, 0, 50);
  for (const a of s.aliens) {
    if (!a.alive) continue;
    const r = alienRect(s, a);
    drawAlien(ctx, r.x, r.y, a.row, s.frame);
  }
  if (s.ufo) {
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(s.ufo.x, 44, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(s.ufo.x, 38, 9, 6, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = '#22c55e';
  for (const k of s.shields) ctx.fillRect(k.x, k.y, 7, 7);
  ctx.fillStyle = '#fde047';
  for (const b of s.shots) ctx.fillRect(b.x - 1.5, b.y - 6, 3, 10);
  ctx.fillStyle = '#f87171';
  for (const b of s.bombs) {
    ctx.fillRect(b.x - 2, b.y - 5, 4, 4);
    ctx.fillRect(b.x, b.y - 1, 4, 4);
  }
  if (s.hitT <= 0 || Math.floor(s.hitT * 10) % 2) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(s.px - 16, PLAYER_Y - 2, 32, 10);
    ctx.fillRect(s.px - 10, PLAYER_Y - 7, 20, 6);
    ctx.fillRect(s.px - 2, PLAYER_Y - 13, 4, 7);
  }
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, GROUND, W, 2);
  drawSparks(ctx, s.sparks);
  text(ctx, String(s.score), 16, 18, { size: 16, align: 'left' });
  text(ctx, `Wave ${s.wave}`, W / 2, 18, { size: 14, color: '#a5b4fc' });
  text(ctx, '▲'.repeat(Math.max(0, s.lives)), W - 16, 18, { size: 14, align: 'right', color: '#38bdf8' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Lives', value: s.lives },
    { label: 'Wave', value: s.wave },
  ],
  result: (s) => ({
    score: s.score,
    title: s.lives <= 0 ? 'Cannon destroyed' : 'The aliens have landed',
    details: [
      { label: 'Wave reached', value: String(s.wave) },
      { label: 'Aliens stopped', value: String(s.kills) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('alien-defender.wave-2', s.wave);
    void reportProgress('alien-defender.wave-5', s.wave);
    void reportProgress('alien-defender.score', s.score);
    void incrementProgress('alien-defender.kills', s.kills);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Fire' }] },
  pointerStarts: false,
  startHint: '← → move, Space fires. Hide behind the shields!',
};
