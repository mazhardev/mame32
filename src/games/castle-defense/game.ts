import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Castle Defense: aim the ballista on your tower and shoot the attackers
 * marching on your wall. Bolts arc under gravity. Between waves, spend gold
 * on repairs, a stronger ballista, archers and a catapult.
 */
export const W = 640;
export const H = 380;
export const GROUND = 320;
export const WALL_X = 112;
export const BOW = { x: 92, y: 168 };
const BOLT_SPEED = 720;
const GRAVITY = 320;

export type Kind = 'grunt' | 'shield' | 'ram' | 'bat' | 'giant';

export const FOES: Record<
  Kind,
  {
    hp: number;
    speed: number;
    dps: number;
    gold: number;
    r: number;
    color: string;
    flying?: boolean;
  }
> = {
  grunt: { hp: 30, speed: 42, dps: 4, gold: 3, r: 11, color: '#65a30d' },
  shield: { hp: 75, speed: 30, dps: 5, gold: 5, r: 13, color: '#0f766e' },
  ram: { hp: 170, speed: 22, dps: 16, gold: 12, r: 18, color: '#92400e' },
  bat: { hp: 14, speed: 64, dps: 3, gold: 4, r: 9, color: '#7c3aed', flying: true },
  giant: { hp: 850, speed: 15, dps: 30, gold: 60, r: 30, color: '#be123c' },
};

export interface Foe {
  kind: Kind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: number;
  hit: number;
}

export interface Bolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Shop {
  id: string;
  label: string;
  cost: (s: State) => number | null;
  buy: (s: State) => void;
}

interface Tuning {
  waves: number;
  hpScale: number;
  gold: number;
  guide: boolean;
}

const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { waves: 8, hpScale: 0.12, gold: 60, guide: true },
  normal: { waves: 10, hpScale: 0.17, gold: 40, guide: true },
  hard: { waves: 10, hpScale: 0.23, gold: 25, guide: false },
};

export interface State extends BaseState {
  tuning: Tuning;
  wave: number;
  phase: 'fight' | 'shop';
  queue: Kind[];
  spawnT: number;
  foes: Foe[];
  bolts: Bolt[];
  aim: number;
  cooldown: number;
  wall: number;
  wallMax: number;
  gold: number;
  damage: number;
  reload: number;
  triple: boolean;
  archers: number;
  archerT: number;
  catapult: number;
  catapultT: number;
  rocks: { x: number; y: number; vx: number; vy: number; target: number }[];
  shots: { x: number; y: number; t: number }[];
  sparks: Spark[];
  kills: number;
  hits: number;
  fired: number;
  message: string;
  messageT: number;
  wallLost: number;
}

export function create(difficulty: DifficultySetting): State {
  const tuning = TUNING[difficulty];
  const s: State = {
    ...baseState(),
    tuning,
    wave: 0,
    phase: 'shop',
    queue: [],
    spawnT: 0,
    foes: [],
    bolts: [],
    aim: -0.15,
    cooldown: 0,
    wall: 300,
    wallMax: 300,
    gold: tuning.gold,
    damage: 22,
    reload: 0.5,
    triple: false,
    archers: 0,
    archerT: 0,
    catapult: 0,
    catapultT: 0,
    rocks: [],
    shots: [],
    sparks: [],
    kills: 0,
    hits: 0,
    fired: 0,
    message: 'Spend your gold, then start wave 1',
    messageT: 3,
    wallLost: 0,
  };
  return s;
}

export function waveFoes(n: number, total: number): Kind[] {
  const list: Kind[] = [];
  const count = 6 + n * 3;
  for (let i = 0; i < count; i++) {
    if (n >= 4 && i % 5 === 4) list.push('ram');
    else if (n >= 3 && i % 4 === 2) list.push('bat');
    else if (n >= 2 && i % 3 === 1) list.push('shield');
    else list.push('grunt');
  }
  if (n === Math.ceil(total / 2) || n === total) list.push('giant');
  return list;
}

export function startWave(s: State) {
  if (s.phase !== 'shop') return;
  s.wave += 1;
  s.queue = waveFoes(s.wave, s.tuning.waves);
  s.spawnT = 0.5;
  s.phase = 'fight';
  s.message = `Wave ${s.wave}`;
  s.messageT = 1.4;
  s.events.push('powerup');
}

export const SHOP: Shop[] = [
  {
    id: 'repair',
    label: 'Repair wall +100',
    cost: (s) => (s.wall >= s.wallMax ? null : 25),
    buy: (s) => (s.wall = Math.min(s.wallMax, s.wall + 100)),
  },
  {
    id: 'stone',
    label: 'Thicker wall +100',
    cost: (s) => 40 + (s.wallMax - 300) * 0.5,
    buy: (s) => ((s.wallMax += 100), (s.wall += 100)),
  },
  {
    id: 'damage',
    label: 'Heavier bolts',
    cost: (s) => Math.round(30 + (s.damage - 22) * 4),
    buy: (s) => (s.damage = Math.round(s.damage * 1.35)),
  },
  {
    id: 'reload',
    label: 'Faster reload',
    cost: (s) => (s.reload <= 0.2 ? null : Math.round(40 / s.reload)),
    buy: (s) => (s.reload = Math.max(0.2, s.reload * 0.82)),
  },
  {
    id: 'archer',
    label: 'Hire an archer',
    cost: (s) => (s.archers >= 6 ? null : 50 + s.archers * 35),
    buy: (s) => (s.archers += 1),
  },
  {
    id: 'catapult',
    label: 'Catapult',
    cost: (s) => (s.catapult >= 3 ? null : 120 + s.catapult * 100),
    buy: (s) => (s.catapult += 1),
  },
  {
    id: 'triple',
    label: 'Triple shot',
    cost: (s) => (s.triple ? null : 180),
    buy: (s) => (s.triple = true),
  },
];

export function buy(s: State, id: string): boolean {
  const item = SHOP.find((x) => x.id === id);
  if (!item || s.phase !== 'shop') return false;
  const cost = item.cost(s);
  if (cost === null || s.gold < cost) return false;
  s.gold -= cost;
  item.buy(s);
  return true;
}

export function fire(s: State) {
  if (s.cooldown > 0 || s.phase !== 'fight') return;
  s.cooldown = s.reload;
  const angles = s.triple ? [s.aim - 0.06, s.aim, s.aim + 0.06] : [s.aim];
  for (const a of angles)
    s.bolts.push({
      x: BOW.x,
      y: BOW.y,
      vx: Math.cos(a) * BOLT_SPEED,
      vy: Math.sin(a) * BOLT_SPEED,
    });
  s.fired += 1;
  s.events.push('shoot');
}

function damageFoe(s: State, f: Foe, dmg: number, random: () => number) {
  f.hp -= dmg;
  f.hit = 0.12;
  if (f.hp <= 0) {
    s.gold += FOES[f.kind].gold;
    s.kills += 1;
    burst(s.sparks, f.x, f.y, FOES[f.kind].color, 10, 140, random);
    s.events.push('pop');
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.messageT = Math.max(0, s.messageT - dt);
  updateSparks(s.sparks, dt, 300);
  const p = input.pointer;
  if (s.phase === 'shop') {
    if (p.pressed) {
      const i = Math.floor((p.y - 88) / 30);
      if (p.x > 170 && p.x < 470 && i >= 0 && i < SHOP.length) {
        if (buy(s, SHOP[i].id)) s.events.push('coin');
      } else if (
        p.x > 200 &&
        p.x < 440 &&
        p.y > 88 + SHOP.length * 30 + 6 &&
        p.y < 88 + SHOP.length * 30 + 44
      )
        startWave(s);
    }
    for (let i = 0; i < SHOP.length; i++)
      if (input.keys.has(String(i + 1)) && buy(s, SHOP[i].id)) s.events.push('coin');
    if (input.pressed.has('action')) startWave(s);
    return;
  }

  // Aim: pointer sets the angle directly; arrows nudge it.
  if (p.active && p.x > BOW.x + 20) s.aim = clamp(Math.atan2(p.y - BOW.y, p.x - BOW.x), -1.2, 1.1);
  if (input.held.has('up')) s.aim = clamp(s.aim - 1.2 * dt, -1.2, 1.1);
  if (input.held.has('down')) s.aim = clamp(s.aim + 1.2 * dt, -1.2, 1.1);
  s.cooldown -= dt;
  if (input.held.has('action') || p.down) fire(s);

  // Spawning.
  if (s.queue.length) {
    s.spawnT -= dt;
    if (s.spawnT <= 0) {
      const kind = s.queue.shift() as Kind;
      const f = FOES[kind];
      const hp = f.hp * (1 + s.tuning.hpScale * (s.wave - 1));
      s.foes.push({
        kind,
        x: W + 30,
        y: f.flying ? 120 + random() * 90 : GROUND - f.r,
        hp,
        maxHp: hp,
        phase: random() * 6,
        hit: 0,
      });
      s.spawnT = 0.55 + random() * 0.9;
    }
  }
  // Movement and attacks on the wall.
  for (const f of s.foes) {
    const spec = FOES[f.kind];
    f.hit = Math.max(0, f.hit - dt);
    f.phase += dt * 3;
    const stop = WALL_X + spec.r + 2;
    if (f.x > stop) f.x = Math.max(stop, f.x - spec.speed * dt);
    else {
      s.wall -= spec.dps * dt;
      s.wallLost += spec.dps * dt;
    }
    if (spec.flying) f.y += Math.sin(f.phase) * 30 * dt;
  }
  // Bolts.
  for (const b of s.bolts) {
    b.vy += GRAVITY * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    for (const f of s.foes) {
      if (f.hp <= 0) continue;
      if (Math.hypot(f.x - b.x, f.y - b.y) < FOES[f.kind].r + 4) {
        damageFoe(s, f, f.kind === 'shield' ? s.damage * 0.6 : s.damage, random);
        s.hits += 1;
        b.x = W * 3;
        break;
      }
    }
  }
  s.bolts = s.bolts.filter((b) => b.x < W + 40 && b.y < GROUND + 10 && b.x > 0);
  // Archers on the wall pick the nearest attacker.
  if (s.archers > 0) {
    s.archerT -= dt;
    if (s.archerT <= 0) {
      s.archerT = 1.4 / s.archers;
      const near = s.foes.filter((f) => f.hp > 0).sort((a, b) => a.x - b.x)[0];
      if (near) {
        damageFoe(s, near, 9, random);
        s.shots.push({ x: near.x, y: near.y, t: 0.1 });
      }
    }
  }
  // The catapult lobs a rock into the thickest crowd.
  if (s.catapult > 0) {
    s.catapultT -= dt;
    if (s.catapultT <= 0) {
      s.catapultT = 4.5 - s.catapult;
      const ground = s.foes.filter((f) => f.hp > 0 && !FOES[f.kind].flying);
      let best: Foe | null = null;
      let bestN = 0;
      for (const f of ground) {
        const n = ground.filter((g) => Math.abs(g.x - f.x) < 50).length;
        if (n > bestN) {
          best = f;
          bestN = n;
        }
      }
      if (best) {
        // Flight time from (60, 200) to the ground with vy = -260 and g = 470; lead the target.
        const t = 1.44;
        const lead =
          best.x - (best.x > WALL_X + FOES[best.kind].r + 4 ? FOES[best.kind].speed * t : 0);
        s.rocks.push({ x: 60, y: 200, vx: (lead - 60) / t, vy: -260, target: lead });
      }
    }
  }
  for (const r of s.rocks) {
    r.vy += 470 * dt;
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    if (r.y >= GROUND - 6) {
      for (const f of s.foes)
        if (f.hp > 0 && !FOES[f.kind].flying && Math.abs(f.x - r.x) < 55)
          damageFoe(s, f, 45, random);
      burst(s.sparks, r.x, GROUND - 6, '#a8a29e', 14, 160, random);
      s.events.push('explosion');
      r.y = H * 3;
    }
  }
  s.rocks = s.rocks.filter((r) => r.y < H * 2);
  for (const sh of s.shots) sh.t -= dt;
  s.shots = s.shots.filter((x) => x.t > 0);
  s.foes = s.foes.filter((f) => f.hp > 0);

  s.score = s.kills * 10 + s.wave * 100;
  if (s.wall <= 0) {
    s.wall = 0;
    s.over = true;
    s.events.push('gameOver');
    return;
  }
  if (!s.queue.length && !s.foes.length) {
    const bonus = 30 + s.wave * 8;
    s.gold += bonus;
    if (s.wave >= s.tuning.waves) {
      s.score += 500 + Math.round(s.wall);
      s.over = true;
      s.events.push('levelComplete');
      return;
    }
    s.phase = 'shop';
    s.bolts = [];
    s.message = `Wave ${s.wave} repelled! +${bonus} gold`;
    s.messageT = 2.5;
    s.events.push('success');
  }
}

function drawCastle(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(30, 120, 60, GROUND - 120);
  ctx.fillRect(WALL_X - 30, 190, 32, GROUND - 190);
  for (let i = 0; i < 4; i++) ctx.fillRect(30 + i * 16, 108, 10, 14);
  for (let i = 0; i < 2; i++) ctx.fillRect(WALL_X - 30 + i * 18, 180, 10, 12);
  ctx.fillStyle = '#6b7280';
  for (let y = 130; y < GROUND; y += 18)
    for (let x = (y / 18) % 2 ? 30 : 38; x < 88; x += 16) ctx.fillRect(x, y, 12, 2);
  fillRound(ctx, 52, 260, 18, 60, 8, '#78350f');
  // Wall health colouring.
  const k = s.wall / s.wallMax;
  if (k < 0.5) {
    ctx.fillStyle = `rgba(239,68,68,${(0.5 - k) * 0.6})`;
    ctx.fillRect(WALL_X - 30, 190, 32, GROUND - 190);
  }
  for (let i = 0; i < s.archers; i++)
    circle(ctx, WALL_X - 24 + (i % 3) * 10, 176 - Math.floor(i / 3) * 10, 4, '#1d4ed8');
  if (s.catapult) {
    fillRound(ctx, 6, 190, 26, 10, 3, '#78350f');
    text(ctx, `×${s.catapult}`, 19, 210, { size: 10, color: '#111827' });
  }
  // Ballista.
  ctx.save();
  ctx.translate(BOW.x, BOW.y);
  ctx.rotate(s.aim);
  fillRound(ctx, -6, -4, 38, 8, 3, '#7c2d12');
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, -14);
  ctx.quadraticCurveTo(10, 0, 22, 14);
  ctx.stroke();
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#fca5a5');
  sky.addColorStop(1, '#fde68a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND);
  ctx.fillStyle = '#a3a3a3';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(180 + i * 110, GROUND);
    ctx.lineTo(240 + i * 110, GROUND - 90 - (i % 2) * 40);
    ctx.lineTo(300 + i * 110, GROUND);
    ctx.fill();
  }
  ctx.fillStyle = '#4d7c0f';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  drawCastle(ctx, s);
  if (s.phase === 'fight' && s.tuning.guide) {
    let x = BOW.x;
    let y = BOW.y;
    const vx = Math.cos(s.aim) * BOLT_SPEED;
    let vy = Math.sin(s.aim) * BOLT_SPEED;
    ctx.fillStyle = 'rgba(15,23,42,0.35)';
    for (let i = 0; i < 26 && y < GROUND && x < W; i++) {
      vy += GRAVITY * 0.025;
      x += vx * 0.025;
      y += vy * 0.025;
      if (i % 2 === 0) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }
  for (const f of s.foes) {
    const spec = FOES[f.kind];
    const bob = spec.flying ? 0 : Math.abs(Math.sin(f.phase * 2)) * 3;
    if (spec.flying) {
      ctx.fillStyle = f.hit > 0 ? '#fff' : spec.color;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, spec.r, spec.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      const flap = Math.sin(f.phase * 6) * 8;
      ctx.beginPath();
      ctx.moveTo(f.x - 4, f.y);
      ctx.lineTo(f.x - 20, f.y - 6 - flap);
      ctx.lineTo(f.x - 10, f.y + 2);
      ctx.moveTo(f.x + 4, f.y);
      ctx.lineTo(f.x + 20, f.y - 6 - flap);
      ctx.lineTo(f.x + 10, f.y + 2);
      ctx.fill();
    } else {
      circle(ctx, f.x, f.y - bob, spec.r, f.hit > 0 ? '#fff' : spec.color);
      circle(ctx, f.x - spec.r * 0.35, f.y - bob - spec.r * 0.25, spec.r * 0.22, '#fef3c7');
      if (f.kind === 'shield')
        fillRound(ctx, f.x - spec.r - 6, f.y - bob - spec.r, 8, spec.r * 2, 3, '#94a3b8');
      if (f.kind === 'ram') fillRound(ctx, f.x - spec.r - 18, f.y - 6, 30, 10, 4, '#57534e');
    }
    fillRound(ctx, f.x - 14, f.y - spec.r - 12, 28, 4, 2, '#1f2937');
    fillRound(ctx, f.x - 14, f.y - spec.r - 12, 28 * Math.max(0, f.hp / f.maxHp), 4, 2, '#22c55e');
  }
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  for (const b of s.bolts) {
    const a = Math.atan2(b.vy, b.vx);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - Math.cos(a) * 16, b.y - Math.sin(a) * 16);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(30,64,175,0.7)';
  ctx.lineWidth = 1;
  for (const sh of s.shots) {
    ctx.beginPath();
    ctx.moveTo(WALL_X - 14, 172);
    ctx.lineTo(sh.x, sh.y);
    ctx.stroke();
  }
  for (const r of s.rocks) circle(ctx, r.x, r.y, 6, '#57534e');
  drawSparks(ctx, s.sparks);

  // HUD.
  fillRound(ctx, 8, 8, 200, 28, 8, 'rgba(15,23,42,0.8)');
  fillRound(ctx, 14, 16, 120, 12, 6, '#334155');
  fillRound(
    ctx,
    14,
    16,
    120 * Math.max(0, s.wall / s.wallMax),
    12,
    6,
    s.wall / s.wallMax < 0.3 ? '#ef4444' : '#22c55e',
  );
  text(ctx, `🪙 ${s.gold}`, 144, 22, { size: 13, align: 'left' });
  text(ctx, `Wave ${s.wave}/${s.tuning.waves}`, W - 12, 22, {
    size: 14,
    align: 'right',
    color: '#7c2d12',
  });
  if (s.messageT > 0 && s.phase === 'fight')
    text(ctx, s.message, W / 2, 60, { size: 20, color: '#7c2d12' });

  if (s.phase === 'shop') {
    fillRound(ctx, 150, 36, 340, 88 + SHOP.length * 30 + 52 - 36, 14, 'rgba(15,23,42,0.92)');
    text(ctx, s.messageT > 0 ? s.message : 'Armoury', W / 2, 56, { size: 15, color: '#fde68a' });
    text(ctx, `Wall ${Math.round(s.wall)}/${s.wallMax} · gold ${s.gold}`, W / 2, 80, {
      size: 12,
      color: '#cbd5e1',
    });
    SHOP.forEach((item, i) => {
      const cost = item.cost(s);
      const y = 88 + i * 30;
      const ok = cost !== null && s.gold >= cost;
      fillRound(ctx, 170, y, 300, 26, 8, ok ? '#1e40af' : '#334155');
      text(ctx, `${i + 1}. ${item.label}`, 182, y + 13, {
        size: 13,
        align: 'left',
        color: ok ? '#fff' : '#94a3b8',
      });
      text(ctx, cost === null ? 'max' : `🪙 ${cost}`, 458, y + 13, {
        size: 12,
        align: 'right',
        color: ok ? '#fde68a' : '#94a3b8',
      });
    });
    const by = 88 + SHOP.length * 30 + 6;
    fillRound(ctx, 200, by, 240, 38, 10, '#dc2626');
    text(ctx, `Start wave ${s.wave + 1} (Space)`, W / 2, by + 19, { size: 15 });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Wave', value: `${s.wave}/${s.tuning.waves}` },
    { label: 'Wall', value: `${Math.round(s.wall)}/${s.wallMax}` },
    { label: 'Gold', value: s.gold },
  ],
  result: (s) => {
    const win = s.wall > 0 && s.wave >= s.tuning.waves;
    return {
      score: s.score,
      won: win,
      lost: !win,
      title: win ? 'The castle holds!' : `The wall fell on wave ${s.wave}`,
      details: [
        { label: 'Attackers defeated', value: String(s.kills) },
        {
          label: 'Accuracy',
          value: `${s.fired ? Math.round((s.hits / s.fired / (s.triple ? 1.5 : 1)) * 100) : 0}%`,
        },
        { label: 'Wall left', value: `${Math.round(s.wall)}/${s.wallMax}` },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    void incrementProgress('castle-defense.kills', s.kills);
    void reportProgress('castle-defense.archers', s.archers);
    const win = s.wall > 0 && s.wave >= s.tuning.waves;
    if (!win) return;
    void reportProgress('castle-defense.win', 1);
    if (s.wallLost < 1) void reportProgress('castle-defense.untouched', 1);
    if (difficulty === 'hard') void reportProgress('castle-defense.hard', 1);
  },
  touch: { pad: 'vertical', buttons: [{ action: 'action', label: 'Fire' }] },
  pointerStarts: false,
  customKeys: ['1', '2', '3', '4', '5', '6', '7'],
  startHint:
    'Aim with the mouse or ↑ ↓ and fire (click/hold or Space). Between waves, buy upgrades in the armoury.',
};
