import { burst, dive, grab, hammer, normals, projectile, rising, rush, slide, spin, stomp, vanish } from './moves';
import type { Move, Normal } from './moves';

/** The Dojo Duel roster: eight original fighters and the final boss. */
export type HairStyle = 'spiky' | 'ponytail' | 'bald' | 'mask' | 'dreads' | 'short' | 'flame' | 'long';

export interface Style {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  /** Top (gi, vest, robe…) and trousers. */
  top: string;
  pants: string;
  belt: string;
  gloves: string;
  /** Bare-chested fighters show skin instead of a top. */
  bare?: boolean;
  beard?: boolean;
  staff?: boolean;
  headband?: string;
  /** Glow drawn around the hands or the body. */
  aura?: string;
  eyes?: string;
}

export interface Specials {
  /** Special button alone (or held back). */
  neutral: Move;
  /** Toward the opponent + special. */
  fwd: Move;
  /** Down + special. */
  down: Move;
  /** Special in the air, if the fighter has one. */
  air?: Move;
  super: Move;
}

export interface FighterDef {
  id: string;
  name: string;
  title: string;
  hp: number;
  /** Walking speeds and jump (px per frame). */
  walk: number;
  back: number;
  jumpX: number;
  jumpY: number;
  /** Drawing scale (1 = 88 px tall). */
  scale: number;
  style: Style;
  normals: Record<Normal, Move>;
  specials: Specials;
  /** CPU personality: 0 keeps away and fires, 1 charges in. */
  rushdown: number;
  stage: number;
  quote: string;
}

function fighter(
  base: Omit<FighterDef, 'normals'>,
  reach = 1,
  power = 1,
): FighterDef {
  return { ...base, normals: normals(reach, power, !!base.style.staff) };
}

export const ROSTER: FighterDef[] = [
  fighter({
    id: 'kenta',
    name: 'Kenta',
    title: 'The Blazing Fist',
    hp: 1000,
    walk: 2.3,
    back: 1.8,
    jumpX: 3.2,
    jumpY: 9.4,
    scale: 1,
    style: { skin: '#f1c7a1', hair: '#1d1a1a', hairStyle: 'spiky', top: '#d23b2f', pants: '#d23b2f', belt: '#1c1c1c', gloves: '#f1c7a1' },
    specials: {
      neutral: projectile('Ember Wave', 'orb'),
      fwd: rush('Tiger Rush'),
      down: rising('Rising Flame'),
      super: projectile('Inferno Storm', 'storm', { speed: 5.2, dmg: 48, hits: 5, w: 48, h: 40, stun: 30, block: 20 }, { super: true, invuln: 14, chip: 0.3, sound: 'explosion' }),
    },
    rushdown: 0.5,
    stage: 0,
    quote: 'Every fight is a lesson. Ready for yours?',
  }),
  fighter(
    {
      id: 'mei',
      name: 'Mei',
      title: 'Whirlwind Kicker',
      hp: 920,
      walk: 2.8,
      back: 2.2,
      jumpX: 3.6,
      jumpY: 10,
      scale: 0.96,
      style: { skin: '#e9b98f', hair: '#3b2416', hairStyle: 'ponytail', top: '#2f8fd8', pants: '#1f2a44', belt: '#f0c03a', gloves: '#f6f6f6' },
      specials: {
        neutral: spin('Whirlwind'),
        fwd: hammer('Swallow Drop', { pose: 'hammer', dmg: 80 }),
        down: rising('Crescent Flip', { pose: 'rise', dmg: 100, box: { x: 0, y: 40, w: 40, h: 50 } }),
        air: dive('Falcon Dive'),
        super: rush('Thousand Petals', { super: true, hits: 7, every: 4, dmg: 34, move: [5.5, 4, 34], active: 30, invuln: 12, pose: 'flurry', chip: 0.3, sound: 'explosion' }),
      },
      rushdown: 0.75,
      stage: 2,
      quote: 'Too slow! Try to keep up.',
    },
    1.05,
    0.92,
  ),
  fighter(
    {
      id: 'bruno',
      name: 'Bruno',
      title: 'The Iron Bear',
      hp: 1150,
      walk: 1.8,
      back: 1.4,
      jumpX: 2.8,
      jumpY: 8.8,
      scale: 1.12,
      style: { skin: '#d9a07a', hair: '#5a3218', hairStyle: 'bald', top: '#3d8c4a', pants: '#2c3e2f', belt: '#c9a227', gloves: '#3a3a3a', beard: true },
      specials: {
        neutral: grab('Bear Hug'),
        fwd: rush('Shoulder Charge', { dmg: 100, move: [5.2, 6, 22], box: { x: 6, y: 36, w: 40, h: 40 } }),
        down: stomp('Quake Stomp'),
        super: grab('Mountain Drop', { super: true, dmg: 380, range: 46, invuln: 8, sound: 'explosion' }),
      },
      rushdown: 0.8,
      stage: 1,
      quote: 'Come closer. I will not bite. Much.',
    },
    1.05,
    1.15,
  ),
  fighter(
    {
      id: 'zara',
      name: 'Zara',
      title: 'Night Blade',
      hp: 900,
      walk: 2.7,
      back: 2.3,
      jumpX: 3.6,
      jumpY: 10.2,
      scale: 0.97,
      style: { skin: '#c99a76', hair: '#4b2a66', hairStyle: 'mask', top: '#4b2a66', pants: '#2d1a3d', belt: '#9e2b2b', gloves: '#2d1a3d', eyes: '#ffe680' },
      specials: {
        neutral: projectile('Star Toss', 'star', { speed: 6, dmg: 50, w: 18, h: 16, stun: 18, block: 12, y: 58 }, { startup: 9, recovery: 18 }),
        fwd: vanish('Shadow Step'),
        down: rising('Crescent Blade', { dmg: 95, box: { x: 0, y: 50, w: 36, h: 56 } }),
        super: rush('Smoke Barrage', { super: true, teleport: true, hits: 6, every: 5, dmg: 36, active: 30, move: [3, 1, 30], invuln: 16, pose: 'flurry', chip: 0.3, sound: 'explosion' }),
      },
      rushdown: 0.55,
      stage: 3,
      quote: 'You never saw me coming.',
    },
    0.98,
    0.9,
  ),
  fighter(
    {
      id: 'tobu',
      name: 'Tobu',
      title: 'Monk of the Long Staff',
      hp: 1000,
      walk: 2.0,
      back: 1.7,
      jumpX: 3,
      jumpY: 9.2,
      scale: 1,
      style: { skin: '#e2b58b', hair: '#e2b58b', hairStyle: 'bald', top: '#e07b22', pants: '#b85d14', belt: '#7a3b0d', gloves: '#e2b58b', staff: true },
      specials: {
        neutral: spin('Staff Whirl', { move: [0, 0, 0], hits: 4, every: 7, dmg: 30, box: { x: -44, y: 30, w: 96, h: 50 } }),
        fwd: hammer('Pole Vault', { dmg: 95, box: { x: 8, y: 6, w: 52, h: 44 } }),
        down: slide('Low Sweep', { move: [2.4, 6, 18], box: { x: 8, y: 0, w: 64, h: 14 } }),
        super: spin('Hundred Staves', { super: true, hits: 8, every: 4, dmg: 30, active: 34, move: [1.5, 8, 40], box: { x: -50, y: 20, w: 110, h: 64 }, invuln: 12, chip: 0.3, sound: 'explosion' }),
      },
      rushdown: 0.4,
      stage: 1,
      quote: 'Patience is the longest weapon.',
    },
    1.12,
    1,
  ),
  fighter(
    {
      id: 'luna',
      name: 'Luna',
      title: 'Moonlight Dancer',
      hp: 950,
      walk: 2.5,
      back: 2.1,
      jumpX: 3.4,
      jumpY: 9.8,
      scale: 0.98,
      style: { skin: '#8d5a3b', hair: '#1f1410', hairStyle: 'dreads', top: '#f2c12e', pants: '#2f9a5a', belt: '#f2f2f2', gloves: '#8d5a3b' },
      specials: {
        neutral: spin('Moon Wheel', { pose: 'spin', move: [3.6, 8, 38], dmg: 32 }),
        fwd: slide('Ginga Slide'),
        down: rising('Half-Moon', { dmg: 100, pose: 'rise' }),
        super: rush('Eclipse', { super: true, hits: 5, every: 6, dmg: 44, active: 30, move: [4.5, 4, 34], invuln: 12, pose: 'spin', chip: 0.3, sound: 'explosion' }),
      },
      rushdown: 0.65,
      stage: 2,
      quote: 'Fighting is just dancing with a partner who disagrees.',
    },
    1.04,
    0.96,
  ),
  fighter(
    {
      id: 'rex',
      name: 'Rex',
      title: 'Thunder Knuckles',
      hp: 1050,
      walk: 2.4,
      back: 1.9,
      jumpX: 3,
      jumpY: 9,
      scale: 1.03,
      style: { skin: '#b9825a', hair: '#2a1a12', hairStyle: 'short', top: '#b9825a', pants: '#2b5fd9', belt: '#f2f2f2', gloves: '#d83434', bare: true, headband: '#f2f2f2' },
      specials: {
        neutral: rush('Rush Jab', { dmg: 70, kd: false, stun: 20, startup: 6, active: 10, recovery: 14, move: [6.4, 6, 16], box: { x: 10, y: 52, w: 36, h: 16 } }),
        fwd: hammer('Overhand', { dmg: 85, startup: 14 }),
        down: rising('Thunder Upper', { dmg: 115 }),
        super: rush('Lightning Flurry', { super: true, hits: 8, every: 4, dmg: 32, active: 32, move: [3.2, 4, 36], invuln: 12, pose: 'flurry', chip: 0.3, sound: 'explosion' }),
      },
      rushdown: 0.85,
      stage: 3,
      quote: 'Gloves on. Let us dance.',
    },
    0.95,
    1.08,
  ),
  fighter(
    {
      id: 'volt',
      name: 'Volt',
      title: 'Storm Gauntlet',
      hp: 980,
      walk: 2.2,
      back: 1.8,
      jumpX: 3.1,
      jumpY: 9.3,
      scale: 1,
      style: { skin: '#f0c9a6', hair: '#f4f4f4', hairStyle: 'flame', top: '#f2c230', pants: '#22252c', belt: '#22252c', gloves: '#41b8ff', aura: '#7fd6ff' },
      specials: {
        neutral: projectile('Spark Ball', 'spark', { speed: 2.8, dmg: 80, life: 190, w: 30, h: 28 }, { recovery: 22 }),
        fwd: burst('Static Field'),
        down: rising('Volt Upper', { dmg: 105 }),
        super: burst('Overload', { super: true, hits: 5, every: 6, dmg: 50, active: 30, box: { x: -60, y: 0, w: 120, h: 110 }, invuln: 14, chip: 0.3 }),
      },
      rushdown: 0.35,
      stage: 3,
      quote: 'Feel that tingle? That is me winning.',
    },
    1,
    1,
  ),
];

export const BOSS: FighterDef = fighter(
  {
    id: 'oni',
    name: 'Master Oni',
    title: 'Keeper of the Last Gate',
    hp: 1350,
    walk: 2.3,
    back: 2,
    jumpX: 3.3,
    jumpY: 9.6,
    scale: 1.08,
    style: { skin: '#b8a48e', hair: '#eeeeee', hairStyle: 'long', top: '#2b2b33', pants: '#1c1c22', belt: '#9e1f1f', gloves: '#b8a48e', beard: true, eyes: '#ff3b3b', aura: '#b03030' },
    specials: {
      neutral: projectile('Dark Orb', 'dark', { speed: 4.8, dmg: 85, w: 30, h: 28 }),
      fwd: vanish('Phantom Step'),
      down: rising('Gate Breaker', { dmg: 125, invuln: 9 }),
      super: projectile('Final Judgment', 'storm', { speed: 5.6, dmg: 55, hits: 6, w: 54, h: 46, stun: 30, block: 20 }, { super: true, invuln: 16, chip: 0.35, sound: 'explosion' }),
    },
    rushdown: 0.6,
    stage: 4,
    quote: 'Many have climbed these steps. None have passed.',
  },
  1.05,
  1.15,
);

export const ALL_FIGHTERS = [...ROSTER, BOSS];

export function fighterById(id: string): FighterDef {
  return ALL_FIGHTERS.find((f) => f.id === id) ?? ROSTER[0];
}

/** Arcade opponents for a chosen fighter: the other seven, then the boss. */
export function ladderFor(id: string): FighterDef[] {
  return [...ROSTER.filter((f) => f.id !== id), BOSS];
}

export const STAGES = ['Dojo', 'Temple Steps', 'Bamboo Grove', 'Night Rooftop', 'Volcano Shrine'];
