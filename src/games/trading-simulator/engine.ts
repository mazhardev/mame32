import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';
import { isRecord } from '../_shared/puzzle/useSavedGame';

/**
 * Sea trading between five invented ports. Each port produces some goods
 * (cheap there) and wants others (dear there). Your buying and selling move
 * prices — big trades get worse prices — and markets drift back over time.
 */
export const GOODS = ['grain', 'spice', 'silk', 'tea', 'iron', 'wine'] as const;
export type Good = (typeof GOODS)[number];

export const GOOD_INFO: Record<Good, { name: string; icon: string; base: number }> = {
  grain: { name: 'Grain', icon: '🌾', base: 8 },
  spice: { name: 'Spice', icon: '🌶️', base: 40 },
  silk: { name: 'Silk', icon: '🧵', base: 65 },
  tea: { name: 'Tea', icon: '🍵', base: 26 },
  iron: { name: 'Iron', icon: '⛓️', base: 18 },
  wine: { name: 'Wine', icon: '🍷', base: 32 },
};

export interface Port {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Price factor per good: < 1 produced here, > 1 in demand. */
  factor: Record<Good, number>;
}

export const PORTS: Port[] = [
  {
    id: 'salt',
    name: 'Saltmere',
    x: 18,
    y: 30,
    factor: { grain: 0.4, spice: 1.45, silk: 1.38, tea: 1.0, iron: 1.3, wine: 0.85 },
  },
  {
    id: 'bright',
    name: 'Brightharbour',
    x: 50,
    y: 14,
    factor: { grain: 1.15, spice: 1.15, silk: 0.48, tea: 1.45, iron: 0.92, wine: 1.3 },
  },
  {
    id: 'amber',
    name: 'Ambercove',
    x: 84,
    y: 30,
    factor: { grain: 1.45, spice: 0.4, silk: 1.15, tea: 0.77, iron: 1.38, wine: 1.08 },
  },
  {
    id: 'stone',
    name: 'Stonequay',
    x: 70,
    y: 76,
    factor: { grain: 1.3, spice: 1.22, silk: 1.45, tea: 1.15, iron: 0.4, wine: 0.7 },
  },
  {
    id: 'wind',
    name: 'Windhollow',
    x: 26,
    y: 78,
    factor: { grain: 0.85, spice: 1.38, silk: 1.08, tea: 0.4, iron: 1.15, wine: 1.53 },
  },
];

export interface Tuning {
  days: number;
  goal: number;
  /** Price change per unit traded, as a fraction of the base. */
  impact: number;
  storms: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { days: 70, goal: 2500, impact: 0.006, storms: 0.05 },
  normal: { days: 60, goal: 2400, impact: 0.008, storms: 0.1 },
  hard: { days: 60, goal: 2000, impact: 0.011, storms: 0.16 },
};

export const START_GOLD = 500;
export const UPKEEP = 8;
export const HOLD_UPGRADE = { size: 25, cost: (cap: number) => Math.round(cap * 6) };

export interface Trader {
  v: 1;
  seed: number;
  day: number;
  gold: number;
  port: string;
  capacity: number;
  cargo: Record<Good, number>;
  /** Each port's pressure on each good: positive = scarce (dearer). */
  pressure: Record<string, Record<Good, number>>;
  /** Mood swings from events. */
  mood: Record<string, Record<Good, number>>;
  log: string[];
  sailing: { to: string; arrive: number } | null;
  profit: number;
  bestTrade: number;
  /** Prices you saw on your last visit to each port. */
  known: Record<string, { day: number; buy: Record<Good, number>; sell: Record<Good, number> }>;
  savedAt: number;
}

const zeroGoods = (): Record<Good, number> => ({
  grain: 0,
  spice: 0,
  silk: 0,
  tea: 0,
  iron: 0,
  wine: 0,
});

export function newTrader(seed: number): Trader {
  return {
    v: 1,
    seed,
    day: 1,
    gold: START_GOLD,
    port: 'salt',
    capacity: 50,
    cargo: zeroGoods(),
    pressure: Object.fromEntries(PORTS.map((p) => [p.id, zeroGoods()])),
    mood: Object.fromEntries(PORTS.map((p) => [p.id, zeroGoods()])),
    log: ['Your ship is ready in Saltmere harbour.'],
    sailing: null,
    profit: 0,
    bestTrade: 0,
    known: {},
    savedAt: Date.now(),
  };
}

/** Notes today's prices in the current port. */
export function see(t: Trader) {
  const buyP = zeroGoods();
  const sellP = zeroGoods();
  for (const g of GOODS) {
    buyP[g] = priceOf(t, t.port, g);
    sellP[g] = sellPrice(t, t.port, g);
  }
  t.known[t.port] = { day: t.day, buy: buyP, sell: sellP };
}

export function distance(a: string, b: string): number {
  const pa = PORTS.find((p) => p.id === a)!;
  const pb = PORTS.find((p) => p.id === b)!;
  return Math.max(1, Math.round(Math.hypot(pa.x - pb.x, pa.y - pb.y) / 14));
}

/** Price to buy one unit here now (selling gets 90% of it). */
export function priceOf(t: Trader, portId: string, g: Good): number {
  const port = PORTS.find((p) => p.id === portId)!;
  const base = GOOD_INFO[g].base * port.factor[g];
  const k = 1 + t.pressure[portId][g] + t.mood[portId][g];
  return Math.max(1, Math.round(base * Math.max(0.35, k) * 10) / 10);
}

export const sellPrice = (t: Trader, portId: string, g: Good) =>
  Math.round(priceOf(t, portId, g) * 0.9 * 10) / 10;

export const cargoUsed = (t: Trader) => GOODS.reduce((a, g) => a + t.cargo[g], 0);

/** Buys `n` units one at a time, each nudging the price up. Returns units bought. */
export function buy(t: Trader, g: Good, n: number, tune: Tuning): number {
  if (t.sailing) return 0;
  let bought = 0;
  for (let i = 0; i < n; i++) {
    const p = priceOf(t, t.port, g);
    if (p > t.gold || cargoUsed(t) >= t.capacity) break;
    t.gold -= p;
    t.cargo[g] += 1;
    t.pressure[t.port][g] += tune.impact;
    bought++;
  }
  return bought;
}

export function sell(t: Trader, g: Good, n: number, tune: Tuning): number {
  if (t.sailing) return 0;
  let earned = 0;
  const count = Math.min(n, t.cargo[g]);
  for (let i = 0; i < count; i++) {
    earned += sellPrice(t, t.port, g);
    t.cargo[g] -= 1;
    t.pressure[t.port][g] -= tune.impact;
  }
  t.gold += earned;
  return earned;
}

export function upgradeHold(t: Trader): boolean {
  const cost = HOLD_UPGRADE.cost(t.capacity);
  if (t.sailing || t.gold < cost) return false;
  t.gold -= cost;
  t.capacity += HOLD_UPGRADE.size;
  return true;
}

const EVENTS: { text: string; good: Good; delta: number }[] = [
  { text: 'A harvest festival in {p} — wine is in demand', good: 'wine', delta: 0.35 },
  { text: 'Drought in {p} sends grain prices soaring', good: 'grain', delta: 0.5 },
  { text: 'A tea clipper unloads in {p} — tea is cheap', good: 'tea', delta: -0.35 },
  { text: 'Shipwrights in {p} buy up all the iron', good: 'iron', delta: 0.4 },
  { text: 'A royal wedding in {p} — silk is wanted', good: 'silk', delta: 0.35 },
  { text: 'Spice caravans flood {p}', good: 'spice', delta: -0.35 },
];

/** Moves time on one day: markets relax, events happen, the ship sails. */
export function passDay(t: Trader, tune: Tuning) {
  const r = createRng(`${t.seed}-${t.day}`);
  t.day += 1;
  t.gold = Math.max(0, t.gold - UPKEEP);
  for (const p of PORTS) {
    for (const g of GOODS) {
      t.pressure[p.id][g] *= 0.85;
      t.mood[p.id][g] *= 0.8;
      t.mood[p.id][g] += (r.next() - 0.5) * 0.06;
    }
  }
  if (r.next() < 0.35) {
    const e = r.pick(EVENTS);
    const p = r.pick(PORTS);
    t.mood[p.id][e.good] += e.delta;
    t.log.unshift(`Day ${t.day}: ${e.text.replace('{p}', p.name)}.`);
  }
  if (t.sailing && t.day >= t.sailing.arrive) {
    if (r.next() < tune.storms) {
      t.sailing.arrive += 1;
      t.log.unshift(`Day ${t.day}: A storm delays your ship by a day.`);
    } else {
      t.port = t.sailing.to;
      t.sailing = null;
      see(t);
      t.log.unshift(`Day ${t.day}: You arrive in ${PORTS.find((p) => p.id === t.port)!.name}.`);
    }
  }
  t.log = t.log.slice(0, 10);
}

/** Sets sail; days pass until arrival. */
export function sail(t: Trader, to: string, tune: Tuning): number {
  if (t.sailing || to === t.port) return 0;
  const days = distance(t.port, to);
  t.sailing = { to, arrive: t.day + days };
  t.log.unshift(
    `Day ${t.day}: Setting sail for ${PORTS.find((p) => p.id === to)!.name} (${days} day${days > 1 ? 's' : ''}).`,
  );
  while (t.sailing) passDay(t, tune);
  return days;
}

export const cargoValue = (t: Trader) =>
  GOODS.reduce((a, g) => a + t.cargo[g] * GOOD_INFO[g].base * 0.8, 0);

export function validTrader(v: unknown): v is Trader {
  if (!isRecord(v) || v.v !== 1) return false;
  for (const k of ['seed', 'day', 'gold', 'capacity', 'profit', 'bestTrade', 'savedAt'])
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k] as number)) return false;
  if (
    !PORTS.some((p) => p.id === v.port) ||
    !isRecord(v.cargo) ||
    !isRecord(v.pressure) ||
    !isRecord(v.mood) ||
    !Array.isArray(v.log)
  )
    return false;
  if (
    !GOODS.every(
      (g) =>
        Number.isInteger((v.cargo as Record<string, unknown>)[g]) &&
        ((v.cargo as Record<string, number>)[g] ?? -1) >= 0,
    )
  )
    return false;
  return (
    PORTS.every(
      (p) =>
        isRecord((v.pressure as Record<string, unknown>)[p.id]) &&
        isRecord((v.mood as Record<string, unknown>)[p.id]),
    ) &&
    (v.sailing === null || isRecord(v.sailing)) &&
    isRecord(v.known)
  );
}
