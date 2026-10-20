import { Box, Circle, World } from 'planck';
import type { Body, Contact } from 'planck';
import { ENEMY_R } from './levels';
import type { Ammo, Level, Mat } from './levels';

/**
 * Slingshot Siege physics on top of planck.js (a Box2D port). Every body
 * carries a Thing as its user data. Damage comes from the energy of each
 * impact, ½·μ·v², where v is how fast the two surfaces approach each other
 * (less a soft margin, so resting and gentle nudges are harmless) and μ the
 * pair's reduced mass. Bodies that break are queued in `broken` and removed
 * by the game after the step; whatever smashed them carries on through,
 * slowed by the strength the break took.
 */
export const STEP = 1 / 60;
export const GRAVITY = 10;
/** Approach speed (m/s) a bump must exceed before it does any damage. */
export const SOFT = 1.5;
/** Grumbles are fragile: impact damage to them is multiplied by this. */
export const ENEMY_HURT = 4;
export const ENEMY_HP = [20, 40, 80] as const;
export const ENEMY_POINTS = 5000;

export interface MatInfo {
  density: number;
  friction: number;
  restitution: number;
  hp: number;
  points: number;
}

export const MATS: Record<Mat, MatInfo> = {
  wood: { density: 1, friction: 0.65, restitution: 0.1, hp: 70, points: 500 },
  stone: { density: 2.6, friction: 0.8, restitution: 0.05, hp: 210, points: 800 },
  ice: { density: 0.9, friction: 0.12, restitution: 0.1, hp: 32, points: 300 },
  tnt: { density: 0.8, friction: 0.6, restitution: 0.1, hp: 18, points: 500 },
};

export interface AmmoInfo {
  r: number;
  density: number;
  /** Damage multiplier against each material. */
  vs: Record<Mat, number>;
  name: string;
  tip: string;
}

export const AMMO: Record<Ammo, AmmoInfo> = {
  pebble: { r: 0.42, density: 5, vs: { wood: 1, stone: 1, ice: 1, tnt: 1 }, name: 'Pebble', tip: 'A sturdy all-rounder.' },
  triple: {
    r: 0.32,
    density: 5,
    vs: { wood: 0.8, stone: 0.6, ice: 1.8, tnt: 1 },
    name: 'Triplets',
    tip: 'Tap in flight to split into three. Shatters ice.',
  },
  boulder: {
    r: 0.62,
    density: 6.5,
    vs: { wood: 1.1, stone: 1.7, ice: 1, tnt: 1 },
    name: 'Boulder',
    tip: 'Big and heavy. Cracks stone.',
  },
  zoomer: {
    r: 0.4,
    density: 4,
    vs: { wood: 2, stone: 0.5, ice: 1, tnt: 1 },
    name: 'Zoomer',
    tip: 'Tap in flight to dash ahead. Splinters wood.',
  },
  kaboom: {
    r: 0.48,
    density: 4.5,
    vs: { wood: 1, stone: 1, ice: 1, tnt: 1 },
    name: 'Kaboom',
    tip: 'Tap to explode, or it blows soon after landing.',
  },
};

export type Kind = 'block' | 'enemy' | 'shot' | 'rock';

export interface Thing {
  id: number;
  kind: Kind;
  /** Blocks (TNT included); rocks are drawn as stone. */
  mat: Mat;
  ammo: Ammo;
  /** Grumble size 0–2. */
  size: number;
  w: number;
  h: number;
  r: number;
  hp: number;
  maxHp: number;
  body: Body;
  dead: boolean;
  /** Shots: has touched something hard enough to count. */
  hit: boolean;
  /** Seconds of hurt flash left. */
  hurt: number;
  /** Speed factor to apply after this step, having smashed through something. */
  through: number;
}

export interface Blast {
  x: number;
  y: number;
  r: number;
  power: number;
  damage: number;
}

export interface Phys {
  world: World;
  things: Thing[];
  /** Damage is off while a fresh level settles. */
  live: boolean;
  nextId: number;
  /** Things that broke during the last step, for the game to remove. */
  broken: Thing[];
  /** Impacts during the last step (for sound and shake). */
  impacts: { x: number; y: number; e: number }[];
}

export const thingOf = (b: Body) => b.getUserData() as Thing;

function makeThing(p: Phys, kind: Kind, body: Body, fields: Partial<Thing>): Thing {
  const t: Thing = {
    id: p.nextId++,
    kind,
    mat: 'stone',
    ammo: 'pebble',
    size: 0,
    w: 0,
    h: 0,
    r: 0,
    hp: Infinity,
    maxHp: Infinity,
    body,
    dead: false,
    hit: false,
    hurt: 0,
    through: 1,
    ...fields,
  };
  body.setUserData(t);
  p.things.push(t);
  return t;
}

export function addRock(p: Phys, x: number, y: number, w: number, h: number): Thing {
  const body = p.world.createBody({ type: 'static', position: { x, y } });
  body.createFixture({ shape: new Box(w / 2, h / 2), friction: 0.9 });
  return makeThing(p, 'rock', body, { w, h });
}

export function addBox(p: Phys, mat: Mat, x: number, y: number, w: number, h: number, a = 0): Thing {
  const m = MATS[mat];
  const body = p.world.createBody({ type: 'dynamic', position: { x, y }, angle: a, angularDamping: 0.1, linearDamping: 0.02 });
  body.createFixture({ shape: new Box(w / 2, h / 2), density: m.density, friction: m.friction, restitution: m.restitution });
  return makeThing(p, 'block', body, { mat, w, h, hp: m.hp, maxHp: m.hp });
}

export function addEnemy(p: Phys, size: number, x: number, y: number): Thing {
  const r = ENEMY_R[size];
  const body = p.world.createBody({ type: 'dynamic', position: { x, y }, angularDamping: 2.5, linearDamping: 0.02 });
  body.createFixture({ shape: new Circle(r), density: 1.2, friction: 0.6, restitution: 0.2 });
  return makeThing(p, 'enemy', body, { size, r, hp: ENEMY_HP[size], maxHp: ENEMY_HP[size] });
}

export function addShot(p: Phys, ammo: Ammo, x: number, y: number, vx: number, vy: number): Thing {
  const a = AMMO[ammo];
  const body = p.world.createBody({
    type: 'dynamic',
    position: { x, y },
    linearVelocity: { x: vx, y: vy },
    bullet: true,
    angularDamping: 1.2,
  });
  body.createFixture({ shape: new Circle(a.r), density: a.density, friction: 0.6, restitution: 0.25 });
  return makeThing(p, 'shot', body, { ammo, r: a.r });
}

/** Applies damage; true when this blow breaks the thing. */
export function hurt(p: Phys, t: Thing, amount: number): boolean {
  if (t.dead || t.kind === 'shot' || t.kind === 'rock' || amount < 0.5) return false;
  t.hp -= amount;
  t.hurt = 0.25;
  if (t.hp > 0) return false;
  t.dead = true;
  p.broken.push(t);
  return true;
}

function factor(target: Thing, other: Thing): number {
  if (target.kind === 'enemy') return ENEMY_HURT;
  if (target.kind !== 'block') return 0;
  return other.kind === 'shot' ? AMMO[other.ammo].vs[target.mat] : 1;
}

function preSolve(p: Phys, contact: Contact) {
  const ba = contact.getFixtureA().getBody();
  const bb = contact.getFixtureB().getBody();
  const a = thingOf(ba);
  const b = thingOf(bb);
  if (a.dead || b.dead) {
    // Already broken this step: let things fall through the wreck.
    contact.setEnabled(false);
    return;
  }
  if (!p.live) return;
  const n = contact.getManifold().pointCount;
  if (!n) return;
  const wm = contact.getWorldManifold(null);
  if (!wm) return;
  // Approach speed along the normal (which points from A to B).
  let vn = 0;
  for (let i = 0; i < n; i++) {
    const pt = wm.points[i];
    const va = ba.getLinearVelocityFromWorldPoint(pt);
    const vb = bb.getLinearVelocityFromWorldPoint(pt);
    vn = Math.max(vn, (va.x - vb.x) * wm.normal.x + (va.y - vb.y) * wm.normal.y);
  }
  if (vn <= SOFT) return;
  if (a.kind === 'shot') a.hit = true;
  if (b.kind === 'shot') b.hit = true;
  const ma = ba.isStatic() ? 0 : ba.getMass();
  const mb = bb.isStatic() ? 0 : bb.getMass();
  const mu = ma === 0 ? mb : mb === 0 ? ma : (ma * mb) / (ma + mb);
  const e = 0.5 * mu * (vn - SOFT) ** 2;
  p.impacts.push({ x: wm.points[0].x, y: wm.points[0].y, e });
  const da = e * factor(a, b);
  const db = e * factor(b, a);
  const hpA = a.hp;
  const hpB = b.hp;
  const brokeA = hurt(p, a, da);
  const brokeB = hurt(p, b, db);
  if (!brokeA && !brokeB) return;
  contact.setEnabled(false);
  // The survivor ploughs on, slowed by the strength it took to break through.
  if (brokeA && !brokeB) b.through = Math.min(b.through, Math.sqrt(Math.max(0.15, 1 - hpA / da)));
  if (brokeB && !brokeA) a.through = Math.min(a.through, Math.sqrt(Math.max(0.15, 1 - hpB / db)));
}

/** Builds the world for a level: flat ground at y = 0 plus the level's pieces. */
export function buildWorld(level: Level): Phys {
  const world = new World({ gravity: { x: 0, y: -GRAVITY } });
  const p: Phys = { world, things: [], live: false, nextId: 1, broken: [], impacts: [] };
  addRock(p, 40, -1, 160, 2);
  for (const piece of level.pieces) {
    if (piece.t === 'rock') addRock(p, piece.x, piece.y, piece.w, piece.h);
    else if (piece.t === 'enemy') addEnemy(p, piece.size, piece.x, piece.y);
    else addBox(p, piece.mat, piece.x, piece.y, piece.w, piece.h, piece.a);
  }
  world.on('pre-solve', (contact) => preSolve(p, contact));
  return p;
}

/**
 * An explosion: a push away from the centre and damage, both falling off
 * linearly to nothing at radius `r`. Breaks are queued like impact breaks.
 */
export function explode(p: Phys, bl: Blast) {
  for (const t of p.things) {
    if (t.dead || t.kind === 'rock') continue;
    const c = t.body.getWorldCenter();
    const dx = c.x - bl.x;
    const dy = c.y - bl.y;
    const dist = Math.hypot(dx, dy);
    const d = Math.max(0, dist - (t.kind === 'block' ? Math.min(t.w, t.h) / 2 : t.r));
    if (d >= bl.r) continue;
    const f = 1 - d / bl.r;
    const len = dist || 1;
    const j = bl.power * f * Math.sqrt(t.body.getMass());
    t.body.applyLinearImpulse({ x: (dx / len) * j, y: (dy / len) * j + 0.25 * j }, c, true);
    if (t.kind !== 'shot') hurt(p, t, bl.damage * f * (t.kind === 'enemy' ? 2 : 1));
  }
}

/** Advances the world one fixed step and applies any smash-through slowdowns. */
export function stepWorld(p: Phys) {
  p.impacts.length = 0;
  p.world.step(STEP, 10, 4);
  for (const t of p.things) {
    if (t.through < 1 && !t.dead) {
      const v = t.body.getLinearVelocity();
      t.body.setLinearVelocity({ x: v.x * t.through, y: v.y * t.through });
      t.body.setAngularVelocity(t.body.getAngularVelocity() * t.through);
    }
    t.through = 1;
  }
}

/** Removes a thing's body from the world and the list. */
export function removeThing(p: Phys, t: Thing) {
  t.dead = true;
  const i = p.things.indexOf(t);
  if (i >= 0) p.things.splice(i, 1);
  p.world.destroyBody(t.body);
}

/** Fastest movement of any awake body (m/s, rotation counted at the rim). */
export function restless(p: Phys): number {
  let max = 0;
  for (const t of p.things) {
    if (t.dead || t.kind === 'rock' || !t.body.isAwake()) continue;
    const v = t.body.getLinearVelocity();
    const rim = t.kind === 'block' ? Math.max(t.w, t.h) / 2 : t.r;
    const s = Math.hypot(v.x, v.y) + Math.abs(t.body.getAngularVelocity()) * rim;
    if (s > max) max = s;
  }
  return max;
}

export const enemiesLeft = (p: Phys) => p.things.reduce((n, t) => n + (t.kind === 'enemy' && !t.dead ? 1 : 0), 0);
