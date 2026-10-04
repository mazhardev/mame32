import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Business Simulator: run a gadget start-up for twelve quarters.
 *
 * Engineers develop products; a product's quality is fixed when you launch
 * it, and every quarter the competition's quality bar rises, so each launch
 * is a trade-off between shipping now and polishing for longer. Sales staff
 * sell more units, support staff keep older products selling, marketing
 * raises awareness, and prices trade volume against margin. Money is in
 * thousands of coins (k).
 */
export type Tier = 'budget' | 'standard' | 'premium';
export type Dept = 'engineers' | 'sales' | 'support';

export const TIERS: Record<Tier, { label: string; price: number; cost: number; pull: number }> = {
  budget: { label: 'Budget', price: 60, cost: 34, pull: 1.35 },
  standard: { label: 'Standard', price: 100, cost: 50, pull: 1 },
  premium: { label: 'Premium', price: 170, cost: 68, pull: 0.55 },
};

export const SALARY = 20;
export const HIRE = 8;
export const QUARTERS = 12;
export const MARKETING = [0, 20, 50, 90];

export interface Product {
  id: number;
  name: string;
  quality: number;
  tier: Tier;
  age: number;
  sold: number;
}

export interface Project {
  name: string;
  points: number;
  /** Points needed before the product can launch at all. */
  needed: number;
}

export interface Company {
  quarter: number;
  cash: number;
  loan: number;
  staff: Record<Dept, number>;
  marketing: number;
  products: Product[];
  project: Project | null;
  nextId: number;
  seed: number;
  awareness: number;
  history: QuarterReport[];
  over: 'won' | 'bankrupt' | 'time' | null;
  news: string;
  savedAt?: number;
}

export interface QuarterReport {
  quarter: number;
  revenue: number;
  costs: number;
  profit: number;
  units: number;
  rival: number;
}

export interface Tuning {
  cash: number;
  goal: number;
  rivalGrowth: number;
  demand: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { cash: 300, goal: 5000, rivalGrowth: 3, demand: 4 },
  normal: { cash: 220, goal: 5000, rivalGrowth: 3.5, demand: 4.5 },
  hard: { cash: 160, goal: 5000, rivalGrowth: 4, demand: 5 },
};

const NAMES = [
  'Pebble',
  'Nimbus',
  'Sprocket',
  'Lumen',
  'Quark',
  'Tidal',
  'Ember',
  'Vortex',
  'Comet',
  'Prism',
  'Orbit',
  'Zephyr',
];

/** Quality of the best rival gadget in a quarter. */
export const rivalQuality = (q: number, d: DifficultySetting) => 40 + q * TUNING[d].rivalGrowth;

export function newCompany(seed: number, difficulty: DifficultySetting): Company {
  return {
    quarter: 1,
    cash: TUNING[difficulty].cash,
    loan: 0,
    staff: { engineers: 2, sales: 1, support: 0 },
    marketing: 1,
    products: [],
    project: { name: NAMES[0], points: 0, needed: 30 },
    nextId: 1,
    seed,
    awareness: 0.3,
    history: [],
    over: null,
    news: 'Your first gadget, the Pebble, is on the drawing board.',
  };
}

/** Quality a project would have if launched now: base from work done, beyond the minimum each point polishes. */
export function projectQuality(c: Company) {
  const p = c.project;
  if (!p) return 0;
  return Math.round(
    35 +
      c.products.length * 4 +
      Math.min(p.points, p.needed) * 0.6 +
      Math.max(0, p.points - p.needed) * 0.45,
  );
}

export const devPoints = (c: Company) => c.staff.engineers * 12;
export const payroll = (c: Company) =>
  (c.staff.engineers + c.staff.sales + c.staff.support) * SALARY;
export const interest = (c: Company) => Math.round(c.loan * 0.05);

export function hire(c: Company, dept: Dept, delta: 1 | -1) {
  const n = c.staff[dept] + delta;
  if (n < 0 || n > 12) return false;
  if (delta > 0) {
    if (c.cash < HIRE) return false;
    c.cash -= HIRE;
  }
  c.staff[dept] = n;
  return true;
}

export function borrow(c: Company, amount: number) {
  if (c.loan + amount > 600) return false;
  c.loan += amount;
  c.cash += amount;
  return true;
}

export function repay(c: Company, amount: number) {
  const n = Math.min(amount, c.loan, c.cash);
  if (n <= 0) return false;
  c.loan -= n;
  c.cash -= n;
  return true;
}

export function canLaunch(c: Company) {
  return !!c.project && c.project.points >= c.project.needed;
}

export function launch(c: Company, tier: Tier) {
  if (!canLaunch(c)) return null;
  const p: Product = {
    id: c.nextId++,
    name: c.project!.name,
    quality: projectQuality(c),
    tier,
    age: 0,
    sold: 0,
  };
  c.products.push(p);
  const gen = c.products.length;
  c.project = {
    name: `${NAMES[gen % NAMES.length]}${gen >= NAMES.length ? ` ${Math.floor(gen / NAMES.length) + 1}` : ''}`,
    points: 0,
    needed: 30 + gen * 6,
  };
  return p;
}

export function setTier(c: Company, id: number, tier: Tier) {
  const p = c.products.find((x) => x.id === id);
  if (p) p.tier = tier;
}

export function retire(c: Company, id: number) {
  c.products = c.products.filter((x) => x.id !== id);
}

/** A product's share of the market this quarter. */
export function share(c: Company, p: Product, rival: number) {
  const edge = (p.quality - rival) / 12;
  const appeal = 1 / (1 + Math.exp(-edge));
  const premiumFit = p.tier === 'premium' ? (p.quality >= rival + 12 ? 1.4 : 0.8) : 1;
  const ageing = Math.max(0.1, 1 - p.age * Math.max(0.08, 0.22 - c.staff.support * 0.03));
  return appeal * TIERS[p.tier].pull * premiumFit * ageing * c.awareness * 0.9;
}

export function valuation(c: Company) {
  const recent = c.history.slice(-2);
  const profit = recent.length ? recent.reduce((a, r) => a + r.profit, 0) / recent.length : 0;
  return Math.round(
    c.cash - c.loan + Math.max(0, profit) * 6 + c.products.reduce((a, p) => a + p.quality, 0),
  );
}

/** Plays out a quarter. */
export function endQuarter(c: Company, difficulty: DifficultySetting): QuarterReport {
  const t = TUNING[difficulty];
  const rng = createRng(c.seed * 37 + c.quarter);
  let demand = t.demand * Math.pow(1.04, c.quarter - 1);
  let news = '';
  const roll = rng.next();
  if (roll < 0.12) {
    demand *= 0.7;
    news = '📉 A slow economy: shoppers are holding back.';
  } else if (roll < 0.22) {
    demand *= 1.3;
    news = '📈 Gadget fever! Demand is booming this quarter.';
  } else if (roll < 0.3 && c.products.length) {
    const best = [...c.products].sort((a, b) => b.quality - a.quality)[0];
    best.quality += 6;
    news = `⭐ A glowing review of the ${best.name}! (+6 quality)`;
  } else if (roll < 0.36) {
    news = '🚚 Parts shortage: unit costs up 15% this quarter.';
  }
  const shortage = news.startsWith('🚚') ? 1.15 : 1;
  const rival = rivalQuality(c.quarter, difficulty);
  c.awareness = Math.min(1.6, c.awareness * 0.85 + MARKETING[c.marketing] / 120 + 0.05);
  let units = 0;
  let revenue = 0;
  let unitCosts = 0;
  const salesBoost = 1 + c.staff.sales * 0.12;
  for (const p of c.products) {
    const u = Math.round(demand * share(c, p, rival) * salesBoost * 10) / 10;
    p.sold += u;
    units += u;
    revenue += u * TIERS[p.tier].price;
    unitCosts += u * TIERS[p.tier].cost * shortage;
    p.age += 1;
  }
  if (c.project) c.project.points += devPoints(c);
  const costs = Math.round(unitCosts + payroll(c) + MARKETING[c.marketing] + interest(c) + 15);
  revenue = Math.round(revenue);
  const profit = revenue - costs;
  c.cash += profit;
  const report = {
    quarter: c.quarter,
    revenue,
    costs,
    profit,
    units: Math.round(units * 10) / 10,
    rival,
  };
  c.history.push(report);
  c.quarter += 1;
  c.news = news || (profit >= 0 ? 'Steady quarter.' : 'A loss this quarter — watch your costs.');
  if (c.cash < 0) {
    // An emergency loan keeps the lights on, if the bank still lends.
    if (c.loan + 100 <= 600) {
      borrow(c, Math.ceil(-c.cash / 50) * 50);
      c.news += ' The bank covered the shortfall with a loan.';
    } else c.over = 'bankrupt';
  }
  if (!c.over && c.quarter > QUARTERS) c.over = valuation(c) >= t.goal ? 'won' : 'time';
  return report;
}

/** A steady CEO for the balance tests. */
export function botQuarter(c: Company, difficulty: DifficultySetting) {
  const rival = rivalQuality(c.quarter, difficulty);
  const onSale = c.products.filter((p) => p.age < 4).length;
  if (
    canLaunch(c) &&
    (projectQuality(c) >= rival + 8 || (onSale === 0 && projectQuality(c) >= rival))
  )
    launch(c, projectQuality(c) >= rival + 14 ? 'premium' : 'standard');
  // Older products drop to budget, very old ones are retired.
  for (const p of c.products) if (p.age >= 3 && p.tier !== 'budget') p.tier = 'budget';
  for (const p of [...c.products]) if (p.age >= 7) retire(c, p.id);
  if (c.quarter >= 3 && c.staff.engineers < 4 && c.cash > 120) hire(c, 'engineers', 1);
  if (c.products.length && c.staff.sales < 3 && c.cash > 150) hire(c, 'sales', 1);
  if (c.products.length >= 2 && c.staff.support < 2 && c.cash > 150) hire(c, 'support', 1);
  c.marketing = c.products.length ? (c.cash > 200 ? 2 : 1) : 0;
  if (c.loan && c.cash > 300) repay(c, c.loan);
  endQuarter(c, difficulty);
}

const DEPTS: Dept[] = ['engineers', 'sales', 'support'];
export function validCompany(v: unknown): v is Company {
  if (!v || typeof v !== 'object') return false;
  const c = v as Company;
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  return (
    Number.isInteger(c.quarter) &&
    c.quarter >= 1 &&
    c.quarter <= QUARTERS &&
    num(c.cash) &&
    num(c.loan) &&
    !!c.staff &&
    DEPTS.every((dp) => Number.isInteger(c.staff[dp]) && c.staff[dp] >= 0) &&
    Number.isInteger(c.marketing) &&
    c.marketing >= 0 &&
    c.marketing < MARKETING.length &&
    Array.isArray(c.products) &&
    c.products.every(
      (p) =>
        typeof p.name === 'string' &&
        num(p.quality) &&
        p.tier in TIERS &&
        num(p.age) &&
        num(p.sold),
    ) &&
    (c.project === null ||
      (typeof c.project.name === 'string' && num(c.project.points) && num(c.project.needed))) &&
    Array.isArray(c.history) &&
    num(c.seed) &&
    num(c.awareness) &&
    c.over === null
  );
}
