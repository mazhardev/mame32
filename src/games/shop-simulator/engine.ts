import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Shop Simulator: run a corner shop for two weeks.
 *
 * Each morning you restock from the wholesaler and set prices; then the day
 * plays out customer by customer. Every customer has a private idea of what
 * each item is worth around its "fair" price: price low and you sell more
 * for less, price high and people walk away grumbling. Empty shelves and
 * high prices hurt your reputation, which decides how many people come in.
 */
export type ProductId =
  'bread' | 'milk' | 'apples' | 'paper' | 'cereal' | 'icecream' | 'coffee' | 'toys';
export type Weather = 'sunny' | 'hot' | 'rainy' | 'cold';

export interface Product {
  id: ProductId;
  name: string;
  icon: string;
  cost: number;
  fair: number;
  /** Days on the shelf before it spoils; null keeps forever. */
  life: number | null;
  demand: number;
  /** Requires the "Wider range" upgrade. */
  extra?: boolean;
}

export const PRODUCTS: Product[] = [
  { id: 'bread', name: 'Bread', icon: '🍞', cost: 2, fair: 5, life: 2, demand: 1.2 },
  { id: 'milk', name: 'Milk', icon: '🥛', cost: 3, fair: 6, life: 3, demand: 1.1 },
  { id: 'apples', name: 'Apples', icon: '🍎', cost: 1, fair: 3, life: 5, demand: 1 },
  { id: 'paper', name: 'Newspaper', icon: '📰', cost: 1, fair: 3, life: 1, demand: 0.8 },
  { id: 'cereal', name: 'Cereal', icon: '🥣', cost: 4, fair: 9, life: null, demand: 0.6 },
  { id: 'icecream', name: 'Ice cream', icon: '🍦', cost: 3, fair: 8, life: null, demand: 0.5 },
  {
    id: 'coffee',
    name: 'Coffee',
    icon: '☕',
    cost: 6,
    fair: 14,
    life: null,
    demand: 0.6,
    extra: true,
  },
  {
    id: 'toys',
    name: 'Toys',
    icon: '🧸',
    cost: 10,
    fair: 25,
    life: null,
    demand: 0.3,
    extra: true,
  },
];
export const PRODUCT = Object.fromEntries(PRODUCTS.map((p) => [p.id, p])) as Record<
  ProductId,
  Product
>;

export const WEATHER: Record<
  Weather,
  { icon: string; label: string; crowd: number; boost: Partial<Record<ProductId, number>> }
> = {
  sunny: { icon: '☀️', label: 'Sunny', crowd: 1.1, boost: { icecream: 1.6, apples: 1.2 } },
  hot: { icon: '🥵', label: 'Heatwave', crowd: 1, boost: { icecream: 3, milk: 0.8, coffee: 0.5 } },
  rainy: {
    icon: '🌧️',
    label: 'Rainy',
    crowd: 0.8,
    boost: { paper: 1.5, coffee: 1.3, icecream: 0.4 },
  },
  cold: { icon: '❄️', label: 'Cold', crowd: 0.9, boost: { coffee: 2, icecream: 0.2, cereal: 1.3 } },
};

export type UpgradeId = 'shelves' | 'range' | 'advert' | 'fridge';
export const UPGRADES: { id: UpgradeId; name: string; icon: string; desc: string; cost: number }[] =
  [
    {
      id: 'shelves',
      name: 'Bigger shelves',
      icon: '🗄️',
      desc: 'Hold 30 of each item instead of 15.',
      cost: 120,
    },
    {
      id: 'fridge',
      name: 'Chiller cabinet',
      icon: '🧊',
      desc: 'Bread, milk and apples last two days longer.',
      cost: 100,
    },
    { id: 'range', name: 'Wider range', icon: '🧸', desc: 'Stock coffee and toys.', cost: 150 },
    {
      id: 'advert',
      name: 'Shop sign',
      icon: '🪧',
      desc: '25% more customers every day.',
      cost: 180,
    },
  ];

export const DAYS = 14;

export interface Tuning {
  cash: number;
  goal: number;
  customers: number;
  /** How far above the fair price a typical customer will still pay. */
  tolerance: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { cash: 100, goal: 2400, customers: 30, tolerance: 0.45 },
  normal: { cash: 80, goal: 2000, customers: 28, tolerance: 0.35 },
  hard: { cash: 60, goal: 1700, customers: 26, tolerance: 0.25 },
};

/** Stock is kept as batches so that older items spoil first. */
export interface Batch {
  qty: number;
  age: number;
}

export interface Shop {
  day: number;
  cash: number;
  reputation: number;
  stock: Record<ProductId, Batch[]>;
  prices: Record<ProductId, number>;
  upgrades: UpgradeId[];
  seed: number;
  weather: Weather;
  forecast: Weather;
  sold: number;
  spoiled: number;
  profitBest: number;
  savedAt?: number;
}

export interface Visit {
  face: string;
  wants: ProductId[];
  bought: ProductId[];
  /** Short reaction shown in the feed. */
  say: string;
  mood: 'happy' | 'ok' | 'sad';
}

export interface DayResult {
  visits: Visit[];
  revenue: number;
  spoiled: number;
  repBefore: number;
  repAfter: number;
}

const WEATHERS: Weather[] = ['sunny', 'sunny', 'hot', 'rainy', 'rainy', 'cold'];
const FACES = ['🧑', '👩', '👨', '🧓', '👧', '🧔', '👱', '👵', '👴', '🧑‍🦱', '👩‍🦰', '🧑‍🦳'];

function weatherFor(seed: number, day: number): Weather {
  const r = createRng(seed * 31 + day);
  return WEATHERS[Math.floor(r.next() * WEATHERS.length)];
}

export function newShop(seed: number, difficulty: DifficultySetting): Shop {
  const stock = {} as Shop['stock'];
  const prices = {} as Shop['prices'];
  for (const p of PRODUCTS) {
    stock[p.id] = [];
    prices[p.id] = p.fair;
  }
  return {
    day: 1,
    cash: TUNING[difficulty].cash,
    reputation: 50,
    stock,
    prices,
    upgrades: [],
    seed,
    weather: weatherFor(seed, 1),
    forecast: weatherFor(seed, 2),
    sold: 0,
    spoiled: 0,
    profitBest: 0,
  };
}

export const capacity = (s: Shop) => (s.upgrades.includes('shelves') ? 30 : 15);
export const onShelf = (s: Shop, id: ProductId) => s.stock[id].reduce((a, b) => a + b.qty, 0);
export const available = (s: Shop) =>
  PRODUCTS.filter((p) => !p.extra || s.upgrades.includes('range'));
export const lifeOf = (s: Shop, p: Product) =>
  p.life === null ? null : p.life + (s.upgrades.includes('fridge') && p.life >= 2 ? 2 : 0);

/** Buys `qty` units at wholesale; returns how many were actually bought. */
export function restock(s: Shop, id: ProductId, qty: number): number {
  const p = PRODUCT[id];
  const room = capacity(s) - onShelf(s, id);
  const n = Math.max(0, Math.min(qty, room, Math.floor(s.cash / p.cost)));
  if (!n) return 0;
  s.cash -= n * p.cost;
  const fresh = s.stock[id].find((b) => b.age === 0);
  if (fresh) fresh.qty += n;
  else s.stock[id].push({ qty: n, age: 0 });
  return n;
}

export function setPrice(s: Shop, id: ProductId, price: number) {
  const p = PRODUCT[id];
  s.prices[id] = Math.max(1, Math.min(p.fair * 3, Math.round(price)));
}

function take(s: Shop, id: ProductId) {
  // Oldest first.
  s.stock[id].sort((a, b) => b.age - a.age);
  const b = s.stock[id].find((x) => x.qty > 0);
  if (!b) return false;
  b.qty -= 1;
  s.stock[id] = s.stock[id].filter((x) => x.qty > 0);
  return true;
}

export function expectedCustomers(s: Shop, difficulty: DifficultySetting) {
  const t = TUNING[difficulty];
  const weekend = s.day % 7 === 6 || s.day % 7 === 0 ? 1.3 : 1;
  const rep = 0.75 + s.reputation / 200;
  return Math.round(
    t.customers *
      rep *
      weekend *
      WEATHER[s.weather].crowd *
      (s.upgrades.includes('advert') ? 1.25 : 1),
  );
}

/** Plays out the day, then ages stock (spoiling old items) and moves to the next morning. */
export function runDay(s: Shop, difficulty: DifficultySetting): DayResult {
  const t = TUNING[difficulty];
  const rng = createRng(s.seed * 7919 + s.day);
  const repBefore = s.reputation;
  const n = expectedCustomers(s, difficulty);
  const range = available(s);
  const weights = range.map((p) => p.demand * (WEATHER[s.weather].boost[p.id] ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const pickProduct = () => {
    let r = rng.next() * total;
    for (let i = 0; i < range.length; i++) {
      r -= weights[i];
      if (r <= 0) return range[i].id;
    }
    return range[range.length - 1].id;
  };
  const visits: Visit[] = [];
  let revenue = 0;
  for (let c = 0; c < n; c++) {
    const wants = [...new Set(Array.from({ length: 1 + Math.floor(rng.next() * 3) }, pickProduct))];
    const bought: ProductId[] = [];
    let missing = 0;
    let pricey = 0;
    let bargain = 0;
    for (const id of wants) {
      const p = PRODUCT[id];
      const price = s.prices[id];
      // Each shopper's limit is spread around fair × (1 + tolerance).
      const limit = p.fair * (1 + t.tolerance * (0.2 + rng.next() * 1.6));
      if (onShelf(s, id) === 0) missing++;
      else if (price > limit) pricey++;
      else {
        take(s, id);
        bought.push(id);
        revenue += price;
        if (price <= p.fair) bargain++;
      }
    }
    let rep = 0;
    let say: string;
    let mood: Visit['mood'];
    if (missing) {
      rep -= 0.4 * missing;
      say = `No ${PRODUCT[wants.find((w) => onShelf(s, w) === 0 && !bought.includes(w)) ?? wants[0]].name.toLowerCase()}?`;
      mood = 'sad';
    } else if (pricey) {
      rep -= 0.25 * pricey;
      say = 'Too expensive!';
      mood = 'sad';
    } else if (bargain === bought.length) {
      rep += 0.25;
      say = 'Great prices!';
      mood = 'happy';
    } else {
      rep += 0.1;
      say = 'Thanks!';
      mood = 'ok';
    }
    s.reputation = Math.max(0, Math.min(100, s.reputation + rep));
    visits.push({ face: FACES[Math.floor(rng.next() * FACES.length)], wants, bought, say, mood });
  }
  s.cash += revenue;
  s.sold += visits.reduce((a, v) => a + v.bought.length, 0);
  // Age stock and throw away anything past its life.
  let spoiled = 0;
  for (const p of PRODUCTS) {
    const life = lifeOf(s, p);
    for (const b of s.stock[p.id]) b.age += 1;
    if (life !== null) {
      spoiled += s.stock[p.id].filter((b) => b.age >= life).reduce((a, b) => a + b.qty, 0);
      s.stock[p.id] = s.stock[p.id].filter((b) => b.age < life);
    }
  }
  s.spoiled += spoiled;
  s.profitBest = Math.max(s.profitBest, revenue);
  s.day += 1;
  s.weather = s.forecast;
  s.forecast = weatherFor(s.seed, s.day + 1);
  return { visits, revenue, spoiled, repBefore, repAfter: s.reputation };
}

export function buyUpgrade(s: Shop, id: UpgradeId) {
  const u = UPGRADES.find((x) => x.id === id)!;
  if (s.upgrades.includes(id) || s.cash < u.cost) return false;
  s.cash -= u.cost;
  s.upgrades.push(id);
  return true;
}

/** Rough demand for one product today, used for the restock hint. */
export function demandHint(s: Shop, id: ProductId, difficulty: DifficultySetting) {
  const range = available(s);
  if (!range.some((p) => p.id === id)) return 0;
  const w = (p: Product) => p.demand * (WEATHER[s.weather].boost[p.id] ?? 1);
  const total = range.reduce((a, p) => a + w(p), 0);
  return Math.round(expectedCustomers(s, difficulty) * 2 * (w(PRODUCT[id]) / total) * 0.9);
}

const IDS = PRODUCTS.map((p) => p.id);
export function validShop(v: unknown): v is Shop {
  if (!v || typeof v !== 'object') return false;
  const s = v as Shop;
  return (
    Number.isInteger(s.day) &&
    s.day >= 1 &&
    s.day <= DAYS + 1 &&
    Number.isFinite(s.cash) &&
    Number.isFinite(s.reputation) &&
    Number.isFinite(s.seed) &&
    !!s.stock &&
    !!s.prices &&
    IDS.every(
      (id) =>
        Array.isArray(s.stock[id]) &&
        s.stock[id].every(
          (b) => Number.isInteger(b.qty) && b.qty >= 0 && Number.isInteger(b.age),
        ) &&
        Number.isFinite(s.prices[id]),
    ) &&
    Array.isArray(s.upgrades) &&
    s.upgrades.every((u) => UPGRADES.some((x) => x.id === u)) &&
    s.weather in WEATHER &&
    s.forecast in WEATHER
  );
}
