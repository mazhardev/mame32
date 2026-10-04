import type { DifficultySetting } from '@/types';

/**
 * Restaurant Simulator: a five-day cook-and-serve time-management game.
 *
 * Customers sit at tables with an order. Each dish is made at its own station:
 * tap the station to start it, tap again when it is ready to pick it up (two
 * hands), then tap the table to serve. Hot food left on a station too long
 * burns. Customers who wait too long walk out.
 */
export type DishId = 'burger' | 'smoothie' | 'salad' | 'soup' | 'pizza';

export interface Dish {
  id: DishId;
  name: string;
  icon: string;
  station: string;
  cook: number;
  price: number;
  /** Seconds a finished dish can wait on its station before it burns; null never burns. */
  burn: number | null;
  day: number;
}

export const DISHES: Dish[] = [
  {
    id: 'burger',
    name: 'Burger',
    icon: '🍔',
    station: 'Grill',
    cook: 5,
    price: 12,
    burn: 7,
    day: 1,
  },
  {
    id: 'smoothie',
    name: 'Smoothie',
    icon: '🥤',
    station: 'Blender',
    cook: 3,
    price: 7,
    burn: null,
    day: 1,
  },
  {
    id: 'salad',
    name: 'Salad',
    icon: '🥗',
    station: 'Prep board',
    cook: 2.5,
    price: 9,
    burn: null,
    day: 2,
  },
  { id: 'soup', name: 'Soup', icon: '🍲', station: 'Pot', cook: 6, price: 11, burn: 8, day: 3 },
  { id: 'pizza', name: 'Pizza', icon: '🍕', station: 'Oven', cook: 8, price: 16, burn: 6, day: 4 },
];
export const DISH = Object.fromEntries(DISHES.map((d) => [d.id, d])) as Record<DishId, Dish>;

export const DAYS = 5;
export const DAY_LENGTH = 90;
export const EAT_TIME = 4;
export const HANDS = 2;

export interface Station {
  dish: DishId;
  /** Seconds cooked so far; null when idle. */
  t: number | null;
  burnt: boolean;
}

export interface Customer {
  id: number;
  table: number;
  order: DishId[];
  served: DishId[];
  patience: number;
  max: number;
  eating: number | null;
  face: string;
}

export type UpgradeId = 'stoves' | 'chairs' | 'table' | 'grill';
export const UPGRADES: { id: UpgradeId; name: string; icon: string; desc: string; cost: number }[] =
  [
    {
      id: 'stoves',
      name: 'Faster stoves',
      icon: '🔥',
      desc: 'Everything cooks 25% faster.',
      cost: 60,
    },
    {
      id: 'chairs',
      name: 'Comfy chairs',
      icon: '🛋️',
      desc: 'Customers wait 30% longer.',
      cost: 50,
    },
    { id: 'table', name: 'Extra table', icon: '🪑', desc: 'Seat one more party.', cost: 70 },
    { id: 'grill', name: 'Second grill', icon: '🍔', desc: 'Cook two burgers at once.', cost: 45 },
  ];

export interface Tuning {
  tables: number;
  patience: number;
  /** Seconds between arrivals on day 1; it shrinks each day. */
  arrive: number;
  maxItems: number;
  goals: number[];
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { tables: 3, patience: 40, arrive: 9, maxItems: 2, goals: [100, 170, 180, 210, 250] },
  normal: { tables: 3, patience: 32, arrive: 8, maxItems: 2, goals: [120, 200, 210, 250, 290] },
  hard: { tables: 4, patience: 26, arrive: 6.5, maxItems: 3, goals: [150, 250, 230, 300, 280] },
};

export interface Kitchen {
  day: number;
  time: number;
  stations: Station[];
  customers: (Customer | null)[];
  hands: (DishId | 'burnt')[];
  nextArrival: number;
  nextId: number;
  earnedToday: number;
  total: number;
  cash: number;
  servedToday: number;
  lostToday: number;
  servedTotal: number;
  bestTip: number;
  upgrades: UpgradeId[];
  /** True between closing time and the last customer leaving. */
  closing: boolean;
  log: string;
}

const FACES = ['🧑', '👩', '👨', '🧓', '👧', '🧔', '👱', '👵', '🧑‍🦱', '👩‍🦰'];

export function menu(day: number) {
  return DISHES.filter((d) => d.day <= day);
}

export function newKitchen(difficulty: DifficultySetting): Kitchen {
  const k: Kitchen = {
    day: 1,
    time: 0,
    stations: [],
    customers: [],
    hands: [],
    nextArrival: 1.5,
    nextId: 1,
    earnedToday: 0,
    total: 0,
    cash: 0,
    servedToday: 0,
    lostToday: 0,
    servedTotal: 0,
    bestTip: 0,
    upgrades: [],
    closing: false,
    log: 'Doors open!',
  };
  setupDay(k, difficulty);
  return k;
}

/** Rebuilds stations and tables for the current day and upgrades. */
export function setupDay(k: Kitchen, difficulty: DifficultySetting) {
  const t = TUNING[difficulty];
  k.stations = menu(k.day).map((d) => ({ dish: d.id, t: null, burnt: false }));
  if (k.upgrades.includes('grill'))
    k.stations.splice(1, 0, { dish: 'burger', t: null, burnt: false });
  k.customers = Array.from(
    { length: t.tables + (k.upgrades.includes('table') ? 1 : 0) },
    () => null,
  );
  k.hands = [];
  k.time = 0;
  k.nextArrival = 1.5;
  k.earnedToday = 0;
  k.servedToday = 0;
  k.lostToday = 0;
  k.closing = false;
}

export function cookTime(k: Kitchen, dish: DishId) {
  return DISH[dish].cook * (k.upgrades.includes('stoves') ? 0.75 : 1);
}

export const ready = (k: Kitchen, s: Station) =>
  s.t !== null && !s.burnt && s.t >= cookTime(k, s.dish);

function spawn(k: Kitchen, difficulty: DifficultySetting, random: () => number) {
  const free = k.customers.findIndex((c) => c === null);
  if (free < 0) return;
  const t = TUNING[difficulty];
  const options = menu(k.day);
  const items = 1 + Math.floor(random() * Math.min(t.maxItems, 1 + Math.floor(k.day / 2)));
  const order: DishId[] = [];
  for (let i = 0; i < items; i++) order.push(options[Math.floor(random() * options.length)].id);
  const max = t.patience * (k.upgrades.includes('chairs') ? 1.3 : 1) + items * 6;
  k.customers[free] = {
    id: k.nextId++,
    table: free,
    order,
    served: [],
    patience: max,
    max,
    eating: null,
    face: FACES[Math.floor(random() * FACES.length)],
  };
}

export type TickEvent = 'arrive' | 'leave' | 'pay' | 'burn' | 'ding';

/** Advances the kitchen by dt seconds; returns what happened for sounds. */
export function tick(
  k: Kitchen,
  dt: number,
  difficulty: DifficultySetting,
  random: () => number,
): TickEvent[] {
  const ev: TickEvent[] = [];
  const t = TUNING[difficulty];
  k.time += dt;
  if (k.time < DAY_LENGTH) {
    k.nextArrival -= dt;
    if (k.nextArrival <= 0) {
      const before = k.customers.filter(Boolean).length;
      spawn(k, difficulty, random);
      if (k.customers.filter(Boolean).length > before) ev.push('arrive');
      const gap = t.arrive * Math.pow(0.9, k.day - 1);
      k.nextArrival = gap * (0.7 + random() * 0.6);
    }
  } else k.closing = true;

  for (const s of k.stations) {
    if (s.t === null || s.burnt) continue;
    const was = ready(k, s);
    s.t += dt;
    if (!was && ready(k, s)) ev.push('ding');
    const burn = DISH[s.dish].burn;
    if (burn !== null && s.t >= cookTime(k, s.dish) + burn) {
      s.burnt = true;
      ev.push('burn');
    }
  }

  k.customers.forEach((c, i) => {
    if (!c) return;
    if (c.eating !== null) {
      c.eating -= dt;
      if (c.eating <= 0) {
        const base = c.order.reduce((a, d) => a + DISH[d].price, 0);
        const tip = Math.round((base * 0.5 * c.patience) / c.max);
        k.earnedToday += base + tip;
        k.total += base + tip;
        k.cash += base + tip;
        k.bestTip = Math.max(k.bestTip, tip);
        k.servedToday += 1;
        k.servedTotal += 1;
        k.customers[i] = null;
        k.log = `${c.face} paid ${base} + ${tip} tip`;
        ev.push('pay');
      }
      return;
    }
    c.patience -= dt;
    if (c.patience <= 0) {
      k.customers[i] = null;
      k.lostToday += 1;
      k.log = `${c.face} got tired of waiting and left`;
      ev.push('leave');
    }
  });
  return ev;
}

/** Day is over once closing time has passed and every table is empty. */
export const dayOver = (k: Kitchen) => k.closing && k.customers.every((c) => c === null);

export function tapStation(k: Kitchen, i: number): 'start' | 'pick' | 'trash' | 'busy' | 'full' {
  const s = k.stations[i];
  if (s.burnt) {
    s.t = null;
    s.burnt = false;
    return 'trash';
  }
  if (s.t === null) {
    s.t = 0;
    return 'start';
  }
  if (!ready(k, s)) return 'busy';
  if (k.hands.length >= HANDS) return 'full';
  k.hands.push(s.dish);
  s.t = null;
  return 'pick';
}

export const missing = (c: Customer) => {
  const left = [...c.order];
  for (const d of c.served) left.splice(left.indexOf(d), 1);
  return left;
};

/** Serves whatever the player is holding that this table still needs. */
export function serve(k: Kitchen, table: number): number {
  const c = k.customers[table];
  if (!c || c.eating !== null) return 0;
  let n = 0;
  for (const d of [...k.hands]) {
    if (d === 'burnt') continue;
    if (missing(c).includes(d)) {
      c.served.push(d);
      k.hands.splice(k.hands.indexOf(d), 1);
      n++;
    }
  }
  if (n && missing(c).length === 0) c.eating = EAT_TIME;
  return n;
}

export function trash(k: Kitchen) {
  k.hands = [];
}

export function buy(k: Kitchen, id: UpgradeId) {
  const u = UPGRADES.find((x) => x.id === id)!;
  if (k.upgrades.includes(id) || k.cash < u.cost) return false;
  k.cash -= u.cost;
  k.upgrades.push(id);
  return true;
}

/**
 * A capable player used by the balance tests: it reacts every `reaction`
 * seconds, serving held food, collecting finished dishes for waiting
 * customers, and starting the dishes that are needed and not yet cooking.
 */
export function botStep(k: Kitchen) {
  for (let i = 0; i < k.customers.length; i++) if (k.hands.length && serve(k, i)) return;
  if (k.hands.length) {
    const wanted = new Set(k.customers.flatMap((c) => (c && c.eating === null ? missing(c) : [])));
    if (k.hands.some((h) => !wanted.has(h as DishId))) return trash(k);
  }
  for (let i = 0; i < k.stations.length; i++) {
    const s = k.stations[i];
    if (s.burnt) return void tapStation(k, i);
    if (ready(k, s) && k.hands.length < HANDS) return void tapStation(k, i);
  }
  // Start a station for the most impatient unmet need.
  const needs = k.customers
    .filter((c): c is Customer => !!c && c.eating === null)
    .sort((a, b) => a.patience - b.patience)
    .flatMap((c) => missing(c));
  const counts = new Map<DishId, number>();
  for (const d of needs) counts.set(d, (counts.get(d) ?? 0) + 1);
  for (const h of k.hands) if (h !== 'burnt') counts.set(h, (counts.get(h) ?? 0) - 1);
  for (const s of k.stations)
    if (s.t !== null && !s.burnt) counts.set(s.dish, (counts.get(s.dish) ?? 0) - 1);
  for (const d of needs) {
    if ((counts.get(d) ?? 0) <= 0) continue;
    const i = k.stations.findIndex((s) => s.dish === d && s.t === null);
    if (i >= 0) return void tapStation(k, i);
  }
}

export function validKitchen(v: unknown): v is Kitchen {
  if (!v || typeof v !== 'object') return false;
  const k = v as Kitchen;
  return (
    Number.isInteger(k.day) &&
    k.day >= 1 &&
    k.day <= DAYS &&
    Number.isFinite(k.total) &&
    Number.isFinite(k.cash) &&
    Number.isFinite(k.servedTotal) &&
    Number.isFinite(k.bestTip) &&
    Array.isArray(k.upgrades) &&
    k.upgrades.every((u) => UPGRADES.some((x) => x.id === u))
  );
}
