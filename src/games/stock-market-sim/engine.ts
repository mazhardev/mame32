import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';
import { isRecord } from '../_shared/puzzle/useSavedGame';

/**
 * A fictional stock market. Prices follow a random walk with a drift per
 * company, a shared market mood and sector swings. News headlines nudge a
 * company's drift for a few days; on harder settings the news is less
 * reliable and the market noisier. All companies and data are invented.
 */
export interface CompanySpec {
  sym: string;
  name: string;
  sector: 'Tech' | 'Food' | 'Energy' | 'Health' | 'Travel';
  start: number;
  drift: number;
  vol: number;
}

export const COMPANIES: CompanySpec[] = [
  { sym: 'BFN', name: 'Bluefin Robotics', sector: 'Tech', start: 84, drift: 0.12, vol: 0.42 },
  { sym: 'QPX', name: 'Quillpoint Software', sector: 'Tech', start: 132, drift: 0.08, vol: 0.32 },
  { sym: 'CLF', name: 'Copperleaf Foods', sector: 'Food', start: 46, drift: 0.05, vol: 0.18 },
  { sym: 'ORC', name: 'Orchard & Crane', sector: 'Food', start: 23, drift: 0.04, vol: 0.22 },
  { sym: 'SOL', name: 'Sunridge Power', sector: 'Energy', start: 61, drift: 0.07, vol: 0.3 },
  { sym: 'TDL', name: 'Tidal Grid', sector: 'Energy', start: 18, drift: 0.02, vol: 0.38 },
  { sym: 'MDV', name: 'Meadowvale Health', sector: 'Health', start: 97, drift: 0.06, vol: 0.24 },
  { sym: 'SKY', name: 'Skylark Travel', sector: 'Travel', start: 39, drift: 0.03, vol: 0.36 },
];

export interface Tuning {
  days: number;
  /** Extra volatility multiplier. */
  noise: number;
  /** Chance a headline is just a rumour with no effect. */
  rumours: number;
  /** How strongly news moves the drift (annualised). */
  impact: number;
  target: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { days: 40, noise: 0.8, rumours: 0, impact: 2.6, target: 0.1 },
  normal: { days: 60, noise: 1, rumours: 0.25, impact: 2, target: 0.2 },
  hard: { days: 60, noise: 1.3, rumours: 0.45, impact: 1.6, target: 0.35 },
};

export const START_CASH = 10000;
export const FEE_FIXED = 5;
export const FEE_RATE = 0.001;

export interface Headline {
  day: number;
  sym: string;
  text: string;
  good: boolean;
}

export interface Holding {
  shares: number;
  cost: number;
}

export interface Market {
  v: 1;
  seed: number;
  day: number;
  prices: Record<string, number[]>;
  /** Extra drift from news and how many days it lasts. */
  boost: Record<string, { drift: number; days: number }>;
  cash: number;
  holdings: Record<string, Holding>;
  news: Headline[];
  /** Recent headlines, newest first. */
  log: Headline[];
  worth: number[];
  trades: number;
  savedAt: number;
}

const GOOD = [
  '{n} wins a major contract',
  '{n} beats profit forecasts',
  '{n} unveils a popular new product',
  'Analysts upgrade {n} to "buy"',
  '{n} expands into new markets',
];
const BAD = [
  '{n} recalls a faulty product',
  '{n} misses sales targets',
  '{n} chief executive resigns',
  'Regulators investigate {n}',
  '{n} loses a key customer',
];

export function newMarket(seed: number): Market {
  return {
    v: 1,
    seed,
    day: 0,
    prices: Object.fromEntries(COMPANIES.map((c) => [c.sym, [c.start]])),
    boost: Object.fromEntries(COMPANIES.map((c) => [c.sym, { drift: 0, days: 0 }])),
    cash: START_CASH,
    holdings: Object.fromEntries(COMPANIES.map((c) => [c.sym, { shares: 0, cost: 0 }])),
    news: [],
    log: [],
    worth: [START_CASH],
    trades: 0,
    savedAt: Date.now(),
  };
}

export const price = (m: Market, sym: string) => {
  const h = m.prices[sym];
  return h[h.length - 1];
};

export function netWorth(m: Market): number {
  return m.cash + COMPANIES.reduce((a, c) => a + m.holdings[c.sym].shares * price(m, c.sym), 0);
}

export const fee = (value: number) => FEE_FIXED + value * FEE_RATE;

function gaussian(r: Rng) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, r.next()))) * Math.cos(2 * Math.PI * r.next());
}

/** Advances the market by one trading day; returns today's headlines. */
export function nextDay(m: Market, t: Tuning): Headline[] {
  const r = createRng(`${m.seed}-${m.day}`);
  m.day += 1;
  const mood = gaussian(r) * 0.006;
  const sectors: Record<string, number> = {};
  for (const c of COMPANIES) sectors[c.sector] ??= gaussian(r) * 0.008;
  // News for tomorrow's moves is published today, so a quick reader can act on it.
  const news: Headline[] = [];
  const count = r.next() < 0.7 ? 1 + (r.next() < 0.35 ? 1 : 0) : 0;
  for (let i = 0; i < count; i++) {
    const c = r.pick(COMPANIES);
    const good = r.next() < 0.5;
    const text = r.pick(good ? GOOD : BAD).replace('{n}', c.name);
    news.push({ day: m.day, sym: c.sym, text, good });
    if (r.next() >= t.rumours)
      m.boost[c.sym] = {
        drift: (good ? 1 : -1) * t.impact * (0.6 + r.next() * 0.8),
        days: 3 + r.int(0, 4),
      };
  }
  for (const c of COMPANIES) {
    const b = m.boost[c.sym];
    const drift = c.drift + (b.days > 0 ? b.drift : 0);
    const daily =
      drift / 252 + ((c.vol * t.noise) / Math.sqrt(252)) * gaussian(r) + mood + sectors[c.sector];
    const p = Math.max(0.5, price(m, c.sym) * Math.exp(daily));
    m.prices[c.sym].push(Math.round(p * 100) / 100);
    if (b.days > 0) b.days -= 1;
  }
  m.news = news;
  m.log = [...news, ...m.log].slice(0, 12);
  m.worth.push(Math.round(netWorth(m) * 100) / 100);
  return news;
}

export function buy(m: Market, sym: string, shares: number): boolean {
  if (shares <= 0) return false;
  const value = shares * price(m, sym);
  const total = value + fee(value);
  if (total > m.cash + 1e-9) return false;
  const h = m.holdings[sym];
  h.cost += total;
  h.shares += shares;
  m.cash -= total;
  m.trades += 1;
  return true;
}

export function sell(m: Market, sym: string, shares: number): boolean {
  const h = m.holdings[sym];
  if (shares <= 0 || shares > h.shares) return false;
  const value = shares * price(m, sym);
  h.cost *= (h.shares - shares) / h.shares;
  h.shares -= shares;
  m.cash += value - fee(value);
  m.trades += 1;
  return true;
}

export function maxBuy(m: Market, sym: string): number {
  const p = price(m, sym);
  let n = Math.floor((m.cash - FEE_FIXED) / (p * (1 + FEE_RATE)));
  while (n > 0 && n * p + fee(n * p) > m.cash) n--;
  return Math.max(0, n);
}

export function validMarket(v: unknown): v is Market {
  if (!isRecord(v) || v.v !== 1) return false;
  for (const k of ['seed', 'day', 'cash', 'trades', 'savedAt'])
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k] as number)) return false;
  if (
    !isRecord(v.prices) ||
    !isRecord(v.holdings) ||
    !isRecord(v.boost) ||
    !Array.isArray(v.worth) ||
    !Array.isArray(v.news) ||
    !Array.isArray(v.log)
  )
    return false;
  return COMPANIES.every((c) => {
    const p = (v.prices as Record<string, unknown>)[c.sym];
    const h = (v.holdings as Record<string, unknown>)[c.sym];
    const b = (v.boost as Record<string, unknown>)[c.sym];
    return (
      Array.isArray(p) &&
      p.length === (v.day as number) + 1 &&
      p.every((x) => typeof x === 'number' && x > 0) &&
      isRecord(h) &&
      Number.isInteger(h.shares) &&
      (h.shares as number) >= 0 &&
      typeof h.cost === 'number' &&
      isRecord(b)
    );
  });
}
