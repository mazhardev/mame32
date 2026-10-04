import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Alien Invasion: defend the city with a free-aiming turret. Saucers fly in
 * arcs dropping bombs on the buildings; abductor ships hover over a building
 * and slowly beam it up — shoot them before the building is gone. The game
 * ends when every building is lost.
 */
export const W = 520;
export const H = 420;
export const GROUND = H - 40;
const TURRET_X = W / 2;
const TURRET_Y = GROUND - 6;

export interface Building {
  x: number;
  w: number;
  h: number;
  hp: number;
  /** 0..1 progress of an abduction in progress. */
  lift: number;
  alive: boolean;
}

type Kind = 'saucer' | 'abductor';
export interface Ufo {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  phase: number;
  hp: number;
  target: number;
  cd: number;
}

export interface Bolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface State extends BaseState {
  aim: number;
  cd: number;
  buildings: Building[];
  ufos: Ufo[];
  bolts: Bolt[];
  bombs: Bolt[];
  wave: number;
  toSpawn: number;
  spawnIn: number;
  kills: number;
  rescued: number;
  pace: number;
  sparks: Spark[];
}

const PACE: Record<DifficultySetting, number> = { easy: 0.75, normal: 1, hard: 1.3 };

export function create(difficulty: DifficultySetting): State {
  const buildings: Building[] = [40, 120, 200, 300, 380, 460].map((x, i) => ({ x, w: 44, h: 40 + ((i * 37) % 50), hp: 3, lift: 0, alive: true }));
  return { ...baseState(), aim: -Math.PI / 2, cd: 0, buildings, ufos: [], bolts: [], bombs: [], wave: 1, toSpawn: 6, spawnIn: 1, kills: 0, rescued: 0, pace: PACE[difficulty], sparks: [] };
}

function spawn(s: State, random: () => number) {
  const alive = s.buildings.map((b, i) => (b.alive ? i : -1)).filter((i) => i >= 0);
  const abduct = s.wave >= 2 && random() < 0.3 && alive.length > 0;
  const fromLeft = random() < 0.5;
  s.ufos.push({
    kind: abduct ? 'abductor' : 'saucer',
    x: fromLeft ? -30 : W + 30,
    y: 50 + random() * 90,
    vx: (fromLeft ? 1 : -1) * (60 + random() * 50) * s.pace,
    phase: random() * 6,
    hp: abduct ? 3 : 1,
    target: abduct ? alive[Math.floor(random() * alive.length)] : -1,
    cd: 1 + random() * 2,
  });
}

export const centre = (b: Building) => b.x + b.w / 2;

export function update(s: State, dt: number, input: Input, random: () => number) {
  // Aim: keys rotate the turret; the pointer points it directly.
  const turn = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (turn) s.aim += turn * 2.2 * dt;
  else if (input.pointer.active) s.aim = Math.atan2(input.pointer.y - TURRET_Y, input.pointer.x - TURRET_X);
  s.aim = clamp(s.aim, -Math.PI + 0.15, -0.15);
  s.cd = Math.max(0, s.cd - dt);
  if ((input.held.has('action') || input.pointer.down) && s.cd === 0) {
    s.bolts.push({ x: TURRET_X + Math.cos(s.aim) * 22, y: TURRET_Y + Math.sin(s.aim) * 22, vx: Math.cos(s.aim) * 520, vy: Math.sin(s.aim) * 520 });
    s.cd = 0.2;
    s.events.push('shoot');
  }

  s.spawnIn -= dt;
  if (s.toSpawn > 0 && s.spawnIn <= 0) {
    spawn(s, random);
    s.toSpawn -= 1;
    s.spawnIn = (1.4 - Math.min(0.8, s.wave * 0.08)) / s.pace;
  }
  if (s.toSpawn === 0 && s.ufos.length === 0) {
    s.wave += 1;
    s.toSpawn = 5 + s.wave * 2;
    s.spawnIn = 2;
    s.score += 100 * s.buildings.filter((b) => b.alive).length;
    s.events.push('levelComplete');
  }

  for (const u of s.ufos) {
    u.phase += dt;
    if (u.kind === 'abductor' && u.target >= 0 && s.buildings[u.target].alive) {
      const b = s.buildings[u.target];
      const tx = centre(b);
      u.x += clamp(tx - u.x, -70 * dt, 70 * dt);
      u.y += clamp(GROUND - b.h - 90 - u.y, -40 * dt, 40 * dt);
      if (Math.abs(tx - u.x) < 4) {
        b.lift += dt / (6 / s.pace);
        if (b.lift >= 1) {
          b.alive = false;
          b.lift = 0;
          u.target = -1;
          s.events.push('failure');
        }
      }
    } else {
      u.x += u.vx * dt;
      u.y += Math.sin(u.phase * 2) * 30 * dt;
      u.cd -= dt;
      if (u.cd <= 0) {
        u.cd = (2 + random() * 2) / s.pace;
        s.bombs.push({ x: u.x, y: u.y + 10, vx: 0, vy: 0 });
      }
    }
  }
  s.ufos = s.ufos.filter((u) => u.x > -60 && u.x < W + 60);

  for (const b of s.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  s.bolts = s.bolts.filter((b) => {
    if (b.y < -10 || b.x < -10 || b.x > W + 10) return false;
    const u = s.ufos.find((uu) => Math.abs(uu.x - b.x) < 22 && Math.abs(uu.y - b.y) < 12);
    if (!u) return true;
    u.hp -= 1;
    s.events.push('hit');
    if (u.hp <= 0) {
      s.ufos.splice(s.ufos.indexOf(u), 1);
      s.kills += 1;
      s.score += u.kind === 'abductor' ? 75 : 25;
      if (u.kind === 'abductor' && u.target >= 0 && s.buildings[u.target].lift > 0) {
        s.buildings[u.target].lift = 0;
        s.rescued += 1;
        s.score += 100;
        s.events.push('coin');
      } else s.events.push('explosion');
      burst(s.sparks, u.x, u.y, '#a3e635', 18, 180, random);
    }
    return false;
  });

  for (const bomb of s.bombs) {
    bomb.vy += 260 * dt;
    bomb.y += bomb.vy * dt;
  }
  s.bombs = s.bombs.filter((bomb) => {
    // Bolts can shoot bombs down too.
    const shot = s.bolts.findIndex((bo) => Math.hypot(bo.x - bomb.x, bo.y - bomb.y) < 10);
    if (shot >= 0) {
      s.bolts.splice(shot, 1);
      s.score += 5;
      burst(s.sparks, bomb.x, bomb.y, '#fde047', 6, 80, random);
      return false;
    }
    const b = s.buildings.find((bb) => bb.alive && bomb.x > bb.x && bomb.x < bb.x + bb.w && bomb.y > GROUND - bb.h);
    if (b) {
      b.hp -= 1;
      if (b.hp <= 0) b.alive = false;
      s.events.push('explosion');
      burst(s.sparks, bomb.x, bomb.y, '#f97316', 14, 160, random);
      return false;
    }
    return bomb.y < GROUND;
  });
  if (!s.buildings.some((b) => b.alive)) {
    s.over = true;
    s.events.push('gameOver');
  }
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#0f172a', '#312e81');
  starfield(ctx, W, GROUND, 0, 50);
  for (const b of s.buildings) {
    if (!b.alive) {
      ctx.fillStyle = '#44403c';
      ctx.fillRect(b.x, GROUND - 8, b.w, 8);
      continue;
    }
    const lifted = b.lift * 70;
    const y = GROUND - b.h - lifted;
    fillRound(ctx, b.x, y, b.w, b.h, 3, b.hp === 3 ? '#64748b' : b.hp === 2 ? '#78716c' : '#7f1d1d');
    ctx.fillStyle = '#fde68a';
    for (let wy = y + 8; wy < y + b.h - 6; wy += 12) for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 12) ctx.fillRect(wx, wy, 5, 6);
  }
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  for (const u of s.ufos) {
    if (u.kind === 'abductor' && u.target >= 0 && s.buildings[u.target]?.lift > 0) {
      ctx.fillStyle = 'rgba(163,230,53,0.25)';
      ctx.beginPath();
      ctx.moveTo(u.x - 10, u.y + 8);
      ctx.lineTo(u.x + 10, u.y + 8);
      ctx.lineTo(u.x + 28, GROUND);
      ctx.lineTo(u.x - 28, GROUND);
      ctx.fill();
    }
    ctx.fillStyle = u.kind === 'abductor' ? '#a3e635' : '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(u.x, u.y, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, u.x, u.y - 6, 8, '#bae6fd');
  }
  for (const b of s.bolts) circle(ctx, b.x, b.y, 3, '#67e8f9');
  for (const b of s.bombs) circle(ctx, b.x, b.y, 4, '#f87171');
  ctx.save();
  ctx.translate(TURRET_X, TURRET_Y);
  ctx.rotate(s.aim);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, -4, 24, 8);
  ctx.restore();
  circle(ctx, TURRET_X, TURRET_Y, 14, '#475569');
  drawSparks(ctx, s.sparks);
  text(ctx, `Wave ${s.wave}`, W / 2, 18, { size: 15, color: '#c7d2fe' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Wave', value: s.wave },
    { label: 'Buildings', value: s.buildings.filter((b) => b.alive).length },
    { label: 'Saucers', value: s.kills },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: `The city fell in wave ${s.wave}`,
    details: [
      { label: 'Saucers downed', value: String(s.kills) },
      { label: 'Buildings rescued', value: String(s.rescued) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('alien-invasion.wave-5', s.wave);
    void reportProgress('alien-invasion.rescue', s.rescued);
    void incrementProgress('alien-invasion.total', s.kills);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Fire' }] },
  startHint: 'Aim with the mouse (or ← →) and hold to fire. Shoot green abductors before they lift a building!',
};
