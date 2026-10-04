import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleRectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { actor, aim, chase, crosshair, cursor, damage, hpBar, separate, shoot, steerPlayer, tickActor, touching, trackCursor, updateBullets, wantsFire } from '../_shared/shooter/kit';
import type { Actor, Bullet, Cursor } from '../_shared/shooter/kit';
import { GRID, OPPOSITE, makeFloor, neighbour } from './dungeon';
import type { Floor } from './dungeon';

/**
 * Dungeon Shooter: a little roguelite. Each floor is a set of rooms. Walk
 * into a room and its doors lock until every monster is down. Find the
 * stairs in the furthest room to go deeper. Health carries over between
 * floors, so the run gets tense.
 */
export const TILE = 40;
export const COLS = 13;
export const ROWS = 9;
export const W = COLS * TILE;
export const H = ROWS * TILE;
const DOOR = 80;

type Kind = 'skeleton' | 'mage' | 'bat';
export interface Monster extends Actor {
  kind: Kind;
}

export interface State extends BaseState {
  floor: Floor;
  depth: number;
  room: number;
  player: Actor;
  monsters: Monster[];
  bullets: Bullet[];
  potions: { x: number; y: number; r: number }[];
  roomsCleared: number;
  kills: number;
  hpMul: number;
  between: number;
  cursor: Cursor;
  sparks: Spark[];
}

const HP_MUL: Record<DifficultySetting, number> = { easy: 0.75, normal: 1, hard: 1.4 };

function pillars(random: () => number): number[] {
  const out: number[] = [];
  const n = Math.floor(random() * 4);
  for (let i = 0; i < n; i++) {
    const c = 3 + Math.floor(random() * (COLS - 6));
    const r = 2 + Math.floor(random() * (ROWS - 4));
    out.push(r * COLS + c);
  }
  return out;
}

const pillarRects = (s: State) =>
  (s.floor.rooms.get(s.room)?.pillars ?? []).map((i) => ({ x: (i % COLS) * TILE, y: Math.floor(i / COLS) * TILE, w: TILE, h: TILE }));

function blocked(s: State, x: number, y: number, r: number) {
  return pillarRects(s).some((rect) => circleRectHit(x, y, r, rect));
}

export function newFloor(s: State, random: () => number) {
  s.floor = makeFloor(Math.min(12, 6 + s.depth), random, pillars);
  s.room = s.floor.start;
  s.player.x = W / 2;
  s.player.y = H / 2;
  s.monsters = [];
  s.bullets = [];
  s.potions = [];
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s = {
    ...baseState(),
    depth: 1,
    room: 0,
    player: actor(W / 2, H / 2, 11, 6),
    monsters: [],
    bullets: [],
    potions: [],
    roomsCleared: 0,
    kills: 0,
    hpMul: HP_MUL[difficulty],
    between: 0,
    cursor: cursor(),
    sparks: [],
  } as unknown as State;
  newFloor(s, random);
  return s;
}

function populate(s: State, random: () => number) {
  const count = 3 + Math.floor(random() * 3) + Math.floor(s.depth / 2);
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    do {
      x = TILE * 1.5 + random() * (W - TILE * 3);
      y = TILE * 1.5 + random() * (H - TILE * 3);
    } while (Math.hypot(x - s.player.x, y - s.player.y) < 150 || blocked(s, x, y, 14));
    const r = random();
    const kind: Kind = s.depth >= 2 && r < 0.3 ? 'mage' : r < 0.55 ? 'bat' : 'skeleton';
    const hp = Math.ceil((kind === 'skeleton' ? 3 : kind === 'mage' ? 2 : 1) * s.hpMul * (1 + (s.depth - 1) * 0.25));
    const m = actor(x, y, kind === 'bat' ? 9 : 12, hp) as Monster;
    m.kind = kind;
    m.cooldown = 1 + random();
    s.monsters.push(m);
  }
}

/** Door rectangles that are open (room cleared and a neighbour exists). */
function doorAt(s: State, dir: 'n' | 'e' | 's' | 'w') {
  const room = s.floor.rooms.get(s.room)!;
  return room.doors[dir] && room.cleared;
}

export function enterRoom(s: State, dir: 'n' | 'e' | 's' | 'w', random: () => number) {
  const next = neighbour(s.room, dir);
  if (next === null) return;
  s.room = next;
  const room = s.floor.rooms.get(next)!;
  room.visited = true;
  const from = OPPOSITE[dir];
  const p = s.player;
  if (from === 'n') [p.x, p.y] = [W / 2, TILE + p.r + 2];
  if (from === 's') [p.x, p.y] = [W / 2, H - TILE - p.r - 2];
  if (from === 'w') [p.x, p.y] = [TILE + p.r + 2, H / 2];
  if (from === 'e') [p.x, p.y] = [W - TILE - p.r - 2, H / 2];
  s.bullets = [];
  s.potions = [];
  if (!room.cleared) populate(s, random);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  trackCursor(s.cursor, input);
  if (s.between > 0) {
    s.between -= dt;
    if (s.between <= 0) newFloor(s, random);
    return;
  }
  const p = s.player;
  tickActor(p, dt);
  const ox = p.x;
  const oy = p.y;
  steerPlayer(p, input, 150, dt, W, H);
  const room = s.floor.rooms.get(s.room)!;
  // Walls: the border is solid except for open doorways.
  const inDoorX = Math.abs(p.x - W / 2) < DOOR / 2 - p.r;
  const inDoorY = Math.abs(p.y - H / 2) < DOOR / 2 - p.r;
  if (p.y < TILE + p.r && !(inDoorX && doorAt(s, 'n'))) p.y = Math.max(p.y, TILE + p.r);
  if (p.y > H - TILE - p.r && !(inDoorX && doorAt(s, 's'))) p.y = Math.min(p.y, H - TILE - p.r);
  if (p.x < TILE + p.r && !(inDoorY && doorAt(s, 'w'))) p.x = Math.max(p.x, TILE + p.r);
  if (p.x > W - TILE - p.r && !(inDoorY && doorAt(s, 'e'))) p.x = Math.min(p.x, W - TILE - p.r);
  if (blocked(s, p.x, p.y, p.r)) [p.x, p.y] = blocked(s, p.x, oy, p.r) ? (blocked(s, ox, p.y, p.r) ? [ox, oy] : [ox, p.y]) : [p.x, oy];
  if (p.y <= p.r + 1) return enterRoom(s, 'n', random);
  if (p.y >= H - p.r - 1) return enterRoom(s, 's', random);
  if (p.x <= p.r + 1) return enterRoom(s, 'w', random);
  if (p.x >= W - p.r - 1) return enterRoom(s, 'e', random);

  aim(p, input);
  if (wantsFire(input) && p.cooldown === 0) {
    shoot(s.bullets, p, p.angle, 480, { color: '#a5f3fc', life: 1 });
    p.cooldown = 0.2;
    s.events.push('shoot');
  }

  for (const m of s.monsters) {
    tickActor(m, dt);
    const mx = m.x;
    const my = m.y;
    if (m.kind === 'bat') chase(m, p.x + Math.sin(s.time * 4 + m.maxHp) * 50, p.y + Math.cos(s.time * 3) * 50, 105, dt);
    else if (m.kind === 'mage') {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      chase(m, p.x, p.y, d < 150 ? -50 : d > 260 ? 40 : 0, dt);
      if (m.cooldown === 0) {
        const a = Math.atan2(p.y - m.y, p.x - m.x);
        for (const spread of [-0.25, 0, 0.25]) shoot(s.bullets, m, a + spread, 170, { friendly: false, color: '#c084fc', r: 5, life: 3 });
        m.cooldown = 2.2 + random();
      }
    } else chase(m, p.x, p.y, 55 + s.depth * 3, dt);
    if (blocked(s, m.x, m.y, m.r)) [m.x, m.y] = [mx, my];
    m.x = Math.max(TILE + m.r, Math.min(W - TILE - m.r, m.x));
    m.y = Math.max(TILE + m.r, Math.min(H - TILE - m.r, m.y));
    if (touching(m, p)) {
      if (damage(p, 1, 1)) return die(s, random);
      if (p.hurt > 0.95) s.events.push('hit');
    }
  }
  separate(s.monsters);

  updateBullets(s.bullets, dt, W, H);
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    if (blocked(s, b.x, b.y, b.r) || b.x < TILE - 4 || b.x > W - TILE + 4 || b.y < TILE - 4 || b.y > H - TILE + 4) {
      s.bullets.splice(i, 1);
      continue;
    }
    if (b.friendly) {
      const m = s.monsters.find((mm) => touching(mm, b));
      if (!m) continue;
      s.bullets.splice(i, 1);
      if (damage(m, 1)) {
        s.monsters.splice(s.monsters.indexOf(m), 1);
        s.kills += 1;
        s.score += m.kind === 'mage' ? 25 : m.kind === 'skeleton' ? 20 : 10;
        s.events.push('explosion');
        burst(s.sparks, m.x, m.y, m.kind === 'mage' ? '#c084fc' : '#e7e5e4', 12, 150, random);
        if (random() < 0.12) s.potions.push({ x: m.x, y: m.y, r: 9 });
      }
    } else if (touching(b, p)) {
      s.bullets.splice(i, 1);
      if (damage(p, 1, 1)) return die(s, random);
      s.events.push('hit');
    }
  }
  if (!room.cleared && s.monsters.length === 0) {
    room.cleared = true;
    s.roomsCleared += 1;
    s.score += 30 * s.depth;
    s.events.push('success');
  }
  for (let i = s.potions.length - 1; i >= 0; i--) {
    if (touching(s.potions[i], p)) {
      p.hp = Math.min(p.maxHp, p.hp + 2);
      s.potions.splice(i, 1);
      s.events.push('powerup');
    }
  }
  if (room.stairs && room.cleared && Math.hypot(p.x - W / 2, p.y - H / 2) < 22) {
    s.depth += 1;
    s.score += 200;
    s.between = 1.5;
    s.events.push('levelComplete');
  }
  updateSparks(s.sparks, dt);
}

function die(s: State, random: () => number) {
  s.over = true;
  s.events.push('gameOver');
  burst(s.sparks, s.player.x, s.player.y, '#38bdf8', 24, 200, random);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const room = s.floor.rooms.get(s.room)!;
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#44403c';
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) if ((r + c) % 2 === 0) ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
  ctx.fillStyle = '#57534e';
  ctx.fillRect(0, 0, W, TILE);
  ctx.fillRect(0, H - TILE, W, TILE);
  ctx.fillRect(0, 0, TILE, H);
  ctx.fillRect(W - TILE, 0, TILE, H);
  // Doorways: dark if open, barred if the room still has monsters.
  for (const d of ['n', 'e', 's', 'w'] as const) {
    if (!room.doors[d]) continue;
    ctx.fillStyle = room.cleared ? '#0c0a09' : '#b45309';
    if (d === 'n') ctx.fillRect(W / 2 - DOOR / 2, 0, DOOR, TILE);
    if (d === 's') ctx.fillRect(W / 2 - DOOR / 2, H - TILE, DOOR, TILE);
    if (d === 'w') ctx.fillRect(0, H / 2 - DOOR / 2, TILE, DOOR);
    if (d === 'e') ctx.fillRect(W - TILE, H / 2 - DOOR / 2, TILE, DOOR);
  }
  for (const r of pillarRects(s)) fillRound(ctx, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 4, '#78716c');
  if (room.stairs) {
    fillRound(ctx, W / 2 - 22, H / 2 - 22, 44, 44, 6, room.cleared ? '#0f172a' : '#292524');
    text(ctx, room.cleared ? '⬇' : '🔒', W / 2, H / 2 + 1, { size: 22 });
  }
  for (const pt of s.potions) text(ctx, '🧪', pt.x, pt.y, { size: 18 });
  for (const m of s.monsters) {
    const col = m.kind === 'mage' ? '#a855f7' : m.kind === 'bat' ? '#57534e' : '#e7e5e4';
    circle(ctx, m.x, m.y, m.r, m.hurt > 0 ? '#fff' : col);
    circle(ctx, m.x - 3, m.y - 2, 2, '#ef4444');
    circle(ctx, m.x + 3, m.y - 2, 2, '#ef4444');
    hpBar(ctx, m, '#ef4444');
  }
  for (const b of s.bullets) circle(ctx, b.x, b.y, b.r, b.color);
  const p = s.player;
  if (!s.over) {
    circle(ctx, p.x, p.y, p.r, p.hurt > 0 && Math.floor(s.time * 20) % 2 ? '#fecaca' : '#0ea5e9');
    circle(ctx, p.x + Math.cos(p.angle) * 6, p.y + Math.sin(p.angle) * 6, 3, '#e0f2fe');
  }
  drawSparks(ctx, s.sparks);
  crosshair(ctx, s.cursor);
  // Minimap of visited rooms.
  const mm = 8;
  for (const r of s.floor.rooms.values()) {
    if (!r.visited && ![...s.floor.rooms.values()].some((o) => o.visited && [-1, 1, -GRID, GRID].includes(o.cell - r.cell))) continue;
    const x = W - 10 - (GRID - (r.cell % GRID)) * (mm + 2);
    const y = 8 + Math.floor(r.cell / GRID) * (mm + 2);
    ctx.fillStyle = r.cell === s.room ? '#38bdf8' : r.visited ? (r.cleared ? '#a8a29e' : '#b45309') : '#44403c';
    ctx.fillRect(x, y, mm, mm);
    if (r.stairs && r.visited) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x + 2, y + 2, mm - 4, mm - 4);
    }
  }
  text(ctx, '❤'.repeat(Math.max(0, p.hp)), 8, 16, { size: 14, color: '#ef4444', align: 'left' });
  text(ctx, `Floor ${s.depth}`, W / 2, 16, { size: 14, color: '#e7e5e4' });
  if (s.between > 0) text(ctx, `Descending to floor ${s.depth}…`, W / 2, H / 2 - 50, { size: 22, color: '#fde047' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Floor', value: s.depth },
    { label: 'Health', value: s.player.hp },
    { label: 'Rooms', value: s.roomsCleared },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: `Fell on floor ${s.depth}`,
    details: [
      { label: 'Rooms cleared', value: String(s.roomsCleared) },
      { label: 'Monsters defeated', value: String(s.kills) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('dungeon-shooter.floor-3', s.depth);
    void reportProgress('dungeon-shooter.floor-6', s.depth);
    void reportProgress('dungeon-shooter.rooms-20', s.roomsCleared);
    void incrementProgress('dungeon-shooter.total', s.kills);
  },
  touch: { pad: 'dpad' },
  startHint: 'Move with WASD / arrows, aim with the mouse and hold to shoot. Clear rooms, find the stairs ⬇.',
};
