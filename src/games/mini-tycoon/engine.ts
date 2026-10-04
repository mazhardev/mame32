import type { DifficultySetting } from '@/types';
import { bulkCost, maxAffordable } from '../_shared/idle/format';
import { isRecord } from '../_shared/puzzle/useSavedGame';

/**
 * Mini Tycoon: businesses earn on a cycle. Without a manager you start each
 * cycle by hand; a manager keeps it running forever. Owning 25, 50, 100 and
 * 200 of a business doubles its speed each time.
 */
export interface Business {
  id: string;
  name: string;
  icon: string;
  cost: number;
  growth: number;
  cycle: number;
  profit: number;
  manager: number;
}

export const BUSINESSES: Business[] = [
  {
    id: 'lemon',
    name: 'Lemonade Cart',
    icon: '🍋',
    cost: 4,
    growth: 1.07,
    cycle: 0.6,
    profit: 1,
    manager: 1000,
  },
  {
    id: 'paper',
    name: 'Paper Round',
    icon: '📰',
    cost: 60,
    growth: 1.15,
    cycle: 3,
    profit: 60,
    manager: 15000,
  },
  {
    id: 'wash',
    name: 'Car Wash',
    icon: '🚿',
    cost: 720,
    growth: 1.14,
    cycle: 6,
    profit: 540,
    manager: 100000,
  },
  {
    id: 'bike',
    name: 'Bike Repair',
    icon: '🚲',
    cost: 8640,
    growth: 1.13,
    cycle: 12,
    profit: 4320,
    manager: 500000,
  },
  {
    id: 'cafe',
    name: 'Bakery Café',
    icon: '🥐',
    cost: 103680,
    growth: 1.12,
    cycle: 24,
    profit: 51840,
    manager: 1.2e6,
  },
  {
    id: 'cinema',
    name: 'Cinema',
    icon: '🎬',
    cost: 1.24e6,
    growth: 1.11,
    cycle: 96,
    profit: 622080,
    manager: 1e7,
  },
  {
    id: 'park',
    name: 'Theme Park',
    icon: '🎢',
    cost: 1.49e7,
    growth: 1.1,
    cycle: 384,
    profit: 7.46e6,
    manager: 1.1e8,
  },
];

export const MILESTONES = [25, 50, 100, 200];

export interface Tycoon {
  v: 1;
  money: number;
  total: number;
  owned: Record<string, number>;
  progress: Record<string, number>;
  running: Record<string, boolean>;
  managers: string[];
  played: number;
  savedAt: number;
  won: boolean;
}

export const GOALS: Record<DifficultySetting, number> = { easy: 5e7, normal: 5e8, hard: 2e9 };
/** Prices scale with difficulty. */
export const PRICE: Record<DifficultySetting, number> = { easy: 0.8, normal: 1, hard: 1.25 };

export function newTycoon(): Tycoon {
  const zero = () => Object.fromEntries(BUSINESSES.map((b) => [b.id, 0]));
  return {
    v: 1,
    money: 4,
    total: 0,
    owned: { ...zero(), lemon: 1 },
    progress: zero(),
    running: Object.fromEntries(BUSINESSES.map((b) => [b.id, false])),
    managers: [],
    played: 0,
    savedAt: Date.now(),
    won: false,
  };
}

export function cycleTime(b: Business, owned: number): number {
  const doublings = MILESTONES.filter((m) => owned >= m).length;
  return b.cycle / 2 ** doublings;
}

export function cost(b: Business, owned: number, n: number, price: number): number {
  return bulkCost(b.cost * price, b.growth, owned, n);
}

export function affordableCount(b: Business, t: Tycoon, price: number): number {
  return maxAffordable(b.cost * price, b.growth, t.owned[b.id] ?? 0, t.money);
}

export function buyBusiness(t: Tycoon, id: string, n: number, price: number): boolean {
  const b = BUSINESSES.find((x) => x.id === id);
  if (!b || n <= 0) return false;
  const c = cost(b, t.owned[id] ?? 0, n, price);
  if (c > t.money) return false;
  t.money -= c;
  t.owned[id] = (t.owned[id] ?? 0) + n;
  return true;
}

export function hireManager(t: Tycoon, id: string, price: number): boolean {
  const b = BUSINESSES.find((x) => x.id === id);
  if (!b || t.managers.includes(id) || (t.owned[id] ?? 0) === 0 || t.money < b.manager * price)
    return false;
  t.money -= b.manager * price;
  t.managers.push(id);
  return true;
}

/** Starts a cycle by hand; returns false if it is already running. */
export function run(t: Tycoon, id: string): boolean {
  if ((t.owned[id] ?? 0) === 0 || t.running[id]) return false;
  t.running[id] = true;
  return true;
}

/** Money per second while every business runs continuously. */
export function incomeRate(t: Tycoon): number {
  return BUSINESSES.reduce((a, b) => {
    const n = t.owned[b.id] ?? 0;
    return n ? a + (b.profit * n) / cycleTime(b, n) : a;
  }, 0);
}

export function tick(t: Tycoon, dt: number): number {
  let earned = 0;
  t.played += dt;
  for (const b of BUSINESSES) {
    const n = t.owned[b.id] ?? 0;
    if (!n) continue;
    const auto = t.managers.includes(b.id);
    if (!auto && !t.running[b.id]) continue;
    const ct = cycleTime(b, n);
    t.progress[b.id] += dt / ct;
    // Fast businesses can finish several cycles in one tick.
    while (t.progress[b.id] >= 1) {
      earned += b.profit * n;
      t.progress[b.id] -= 1;
      if (!auto) {
        t.progress[b.id] = 0;
        t.running[b.id] = false;
        break;
      }
    }
  }
  t.money += earned;
  t.total += earned;
  return earned;
}

export function validTycoon(v: unknown): v is Tycoon {
  if (!isRecord(v) || v.v !== 1) return false;
  for (const k of ['money', 'total', 'played', 'savedAt'])
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k] as number) || (v[k] as number) < 0)
      return false;
  if (!isRecord(v.owned) || !isRecord(v.progress) || !isRecord(v.running)) return false;
  for (const b of BUSINESSES) {
    if (!Number.isInteger(v.owned[b.id]) || (v.owned[b.id] as number) < 0) return false;
    if (typeof v.progress[b.id] !== 'number' || typeof v.running[b.id] !== 'boolean') return false;
  }
  return (
    Array.isArray(v.managers) &&
    v.managers.every((m) => BUSINESSES.some((b) => b.id === m)) &&
    typeof v.won === 'boolean'
  );
}
