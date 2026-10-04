import type { DifficultySetting } from '@/types';
import { shuffleWith } from '@/utils/random';

export type Theme = 'beach' | 'snow' | 'party' | 'sports' | 'space';
export type Slot = 'hat' | 'top' | 'bottom' | 'shoes' | 'extra';

export const SLOTS: Slot[] = ['hat', 'top', 'bottom', 'shoes', 'extra'];

export const THEMES: Record<Theme, { name: string; emoji: string; sky: string; ground: string }> = {
  beach: { name: 'Beach day', emoji: '🏖️', sky: '#7dd3fc', ground: '#fde68a' },
  snow: { name: 'Snow day', emoji: '❄️', sky: '#cbd5e1', ground: '#f8fafc' },
  party: { name: 'Party night', emoji: '🎉', sky: '#4c1d95', ground: '#7c3aed' },
  sports: { name: 'Sports day', emoji: '🏅', sky: '#86efac', ground: '#16a34a' },
  space: { name: 'Space trip', emoji: '🚀', sky: '#0f172a', ground: '#475569' },
};

export const THEME_IDS = Object.keys(THEMES) as Theme[];

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  icon: string;
  themes: Theme[];
}

/** Every theme has at least one matching item in every slot, so 100 is always reachable. */
export const ITEMS: Item[] = [
  { id: 'hat-none', slot: 'hat', name: 'No hat', icon: '🚫', themes: [] },
  { id: 'sunhat', slot: 'hat', name: 'Sun hat', icon: '👒', themes: ['beach'] },
  { id: 'beanie', slot: 'hat', name: 'Beanie', icon: '🧶', themes: ['snow'] },
  { id: 'party-hat', slot: 'hat', name: 'Party hat', icon: '🥳', themes: ['party'] },
  { id: 'crown', slot: 'hat', name: 'Crown', icon: '👑', themes: ['party'] },
  { id: 'cap', slot: 'hat', name: 'Sports cap', icon: '🧢', themes: ['sports', 'beach'] },
  { id: 'helmet', slot: 'hat', name: 'Space helmet', icon: '🪐', themes: ['space'] },

  { id: 'tshirt', slot: 'top', name: 'T-shirt', icon: '👕', themes: [] },
  { id: 'tank', slot: 'top', name: 'Tank top', icon: '🎽', themes: ['beach', 'sports'] },
  { id: 'flower-shirt', slot: 'top', name: 'Flower shirt', icon: '🌺', themes: ['beach'] },
  { id: 'sweater', slot: 'top', name: 'Woolly jumper', icon: '🐑', themes: ['snow'] },
  { id: 'parka', slot: 'top', name: 'Puffy parka', icon: '🧥', themes: ['snow'] },
  { id: 'sparkle-top', slot: 'top', name: 'Sparkle top', icon: '✨', themes: ['party'] },
  { id: 'jersey', slot: 'top', name: 'Team jersey', icon: '⚽', themes: ['sports'] },
  { id: 'suit-top', slot: 'top', name: 'Space suit', icon: '👨‍🚀', themes: ['space'] },

  { id: 'jeans', slot: 'bottom', name: 'Jeans', icon: '👖', themes: [] },
  { id: 'shorts', slot: 'bottom', name: 'Shorts', icon: '🩳', themes: ['beach', 'sports'] },
  { id: 'snow-pants', slot: 'bottom', name: 'Snow trousers', icon: '⛷️', themes: ['snow'] },
  { id: 'skirt', slot: 'bottom', name: 'Party skirt', icon: '💃', themes: ['party'] },
  { id: 'track', slot: 'bottom', name: 'Track pants', icon: '🏃', themes: ['sports'] },
  { id: 'suit-pants', slot: 'bottom', name: 'Space trousers', icon: '🛰️', themes: ['space'] },

  { id: 'loafers', slot: 'shoes', name: 'Loafers', icon: '👞', themes: [] },
  { id: 'flipflops', slot: 'shoes', name: 'Flip-flops', icon: '🩴', themes: ['beach'] },
  { id: 'snow-boots', slot: 'shoes', name: 'Snow boots', icon: '🥾', themes: ['snow'] },
  { id: 'shiny', slot: 'shoes', name: 'Shiny shoes', icon: '👠', themes: ['party'] },
  { id: 'sneakers', slot: 'shoes', name: 'Sneakers', icon: '👟', themes: ['sports'] },
  { id: 'moon-boots', slot: 'shoes', name: 'Moon boots', icon: '🌙', themes: ['space'] },

  { id: 'extra-none', slot: 'extra', name: 'Nothing', icon: '🚫', themes: [] },
  { id: 'backpack', slot: 'extra', name: 'Backpack', icon: '🎒', themes: [] },
  { id: 'shades', slot: 'extra', name: 'Sunglasses', icon: '🕶️', themes: ['beach', 'party'] },
  { id: 'scarf', slot: 'extra', name: 'Scarf', icon: '🧣', themes: ['snow'] },
  { id: 'bowtie', slot: 'extra', name: 'Bow tie', icon: '🎀', themes: ['party'] },
  { id: 'medal', slot: 'extra', name: 'Medal', icon: '🥇', themes: ['sports'] },
  { id: 'jetpack', slot: 'extra', name: 'Jetpack', icon: '🚀', themes: ['space'] },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, Item>;

export const COLORS = [
  { id: 'red', name: 'red', hex: '#ef4444' },
  { id: 'orange', name: 'orange', hex: '#f97316' },
  { id: 'yellow', name: 'yellow', hex: '#facc15' },
  { id: 'green', name: 'green', hex: '#22c55e' },
  { id: 'blue', name: 'blue', hex: '#3b82f6' },
  { id: 'purple', name: 'purple', hex: '#a855f7' },
  { id: 'pink', name: 'pink', hex: '#ec4899' },
  { id: 'white', name: 'white', hex: '#f1f5f9' },
  { id: 'black', name: 'black', hex: '#1e293b' },
] as const;

export type ColorId = (typeof COLORS)[number]['id'];
export const COLOR_HEX = Object.fromEntries(COLORS.map((c) => [c.id, c.hex])) as Record<
  ColorId,
  string
>;

export const SKINS = ['#fde0c5', '#f1c27d', '#d7a06a', '#a8714a', '#7a4b2a', '#4b2e1a'];
export const HAIR_STYLES = ['short', 'long', 'bun', 'curly', 'spiky'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];
export const HAIR_COLORS = ['#1f1308', '#5b3a1e', '#a0522d', '#e2b659', '#d1d5db', '#ec4899'];

export interface Look {
  skin: number;
  hair: HairStyle;
  hairColor: number;
  items: Record<Slot, string>;
  colors: Record<Slot, ColorId>;
}

export function defaultLook(): Look {
  return {
    skin: 1,
    hair: 'short',
    hairColor: 1,
    items: {
      hat: 'hat-none',
      top: 'tshirt',
      bottom: 'jeans',
      shoes: 'loafers',
      extra: 'extra-none',
    },
    colors: { hat: 'red', top: 'white', bottom: 'blue', shoes: 'black', extra: 'black' },
  };
}

export interface Request {
  theme: Theme;
  /** A colour the client would like to see somewhere in the outfit (normal and hard). */
  color: ColorId | null;
}

export const TUNING: Record<
  DifficultySetting,
  { hints: boolean; wish: boolean; seconds: number | null; rounds: number }
> = {
  easy: { hints: true, wish: false, seconds: null, rounds: 5 },
  normal: { hints: false, wish: true, seconds: null, rounds: 5 },
  hard: { hints: false, wish: true, seconds: 40, rounds: 5 },
};

/** Five clients, one per theme in a random order, each with an optional colour wish. */
export function makeRequests(difficulty: DifficultySetting, random: () => number): Request[] {
  const t = TUNING[difficulty];
  const wishes = COLORS.filter((c) => c.id !== 'white' && c.id !== 'black');
  return shuffleWith(THEME_IDS, random)
    .slice(0, t.rounds)
    .map((theme) => ({
      theme,
      color: t.wish ? wishes[Math.floor(random() * wishes.length)].id : null,
    }));
}

export const SLOT_POINTS = 18;
export const WISH_POINTS = 10;

export interface Rating {
  score: number;
  stars: 0 | 1 | 2 | 3;
  slots: Record<Slot, 'match' | 'plain' | 'clash'>;
  wish: boolean | null;
}

/**
 * Each slot scores 18 if the item suits the theme, 6 if it is plain (no theme at
 * all), and 0 if it belongs to some other theme. Without a colour wish the slot
 * points are scaled up so that a perfect outfit is still worth 100.
 */
export function rateLook(look: Look, req: Request): Rating {
  let pts = 0;
  const slots = {} as Rating['slots'];
  for (const slot of SLOTS) {
    const item = ITEM_BY_ID[look.items[slot]];
    const kind = item.themes.includes(req.theme) ? 'match' : item.themes.length ? 'clash' : 'plain';
    slots[slot] = kind;
    pts += kind === 'match' ? SLOT_POINTS : kind === 'plain' ? 6 : 0;
  }
  let wish: boolean | null = null;
  let score: number;
  if (req.color) {
    wish = SLOTS.some((s) => look.colors[s] === req.color && !look.items[s].endsWith('-none'));
    score = pts + (wish ? WISH_POINTS : 0);
  } else {
    score = Math.round((pts * 100) / (SLOT_POINTS * SLOTS.length));
  }
  const stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 45 ? 1 : 0;
  return { score, stars, slots, wish };
}

export function itemsFor(slot: Slot): Item[] {
  return ITEMS.filter((i) => i.slot === slot);
}

export function randomLook(random: () => number): Look {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)];
  const look = defaultLook();
  look.skin = Math.floor(random() * SKINS.length);
  look.hair = pick(HAIR_STYLES);
  look.hairColor = Math.floor(random() * HAIR_COLORS.length);
  for (const slot of SLOTS) {
    look.items[slot] = pick(itemsFor(slot)).id;
    look.colors[slot] = pick(COLORS).id;
  }
  return look;
}
