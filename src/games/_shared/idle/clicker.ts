import { bulkCost, maxAffordable } from './format';
import { isRecord } from '../puzzle/useSavedGame';

/**
 * Generic clicker economy: clicking earns currency, producers earn it every
 * second, upgrades multiply producers or clicks, and an optional prestige
 * reset trades progress for a permanent bonus.
 */
export interface Producer {
  id: string;
  name: string;
  icon: string;
  base: number;
  rate: number;
  desc: string;
}

export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  cost: number;
  desc: string;
  /** A producer id, 'click' (click value ×mult) or 'share' (clicks also earn `mult` of the per-second rate). */
  target: string;
  mult: number;
  /** Shown once you own this many of the target producer (or have earned `total`). */
  needs?: number;
  needsTotal?: number;
}

export interface ClickerCfg {
  producers: Producer[];
  upgrades: Upgrade[];
  click: number;
  growth: number;
  goal: number;
  /** Prestige: points from lifetime earnings and the bonus each one gives. */
  prestige?: { per: number; bonus: number };
}

export interface ClickerState {
  v: 1;
  amount: number;
  /** Earned since the last prestige reset. */
  run: number;
  /** Earned in total, across resets. */
  total: number;
  owned: Record<string, number>;
  bought: string[];
  clicks: number;
  played: number;
  savedAt: number;
  boost: number;
  boostMult: number;
  prestige: number;
  resets: number;
  won: boolean;
}

export function newClicker(cfg: ClickerCfg): ClickerState {
  return {
    v: 1,
    amount: 0,
    run: 0,
    total: 0,
    owned: Object.fromEntries(cfg.producers.map((p) => [p.id, 0])),
    bought: [],
    clicks: 0,
    played: 0,
    savedAt: Date.now(),
    boost: 0,
    boostMult: 1,
    prestige: 0,
    resets: 0,
    won: false,
  };
}

const prestigeMult = (cfg: ClickerCfg, s: ClickerState) =>
  1 + (cfg.prestige ? s.prestige * cfg.prestige.bonus : 0);

export function producerMult(cfg: ClickerCfg, s: ClickerState, id: string): number {
  let m = 1;
  for (const u of cfg.upgrades) if (u.target === id && s.bought.includes(u.id)) m *= u.mult;
  return m;
}

export function producerRate(cfg: ClickerCfg, s: ClickerState, p: Producer): number {
  return (s.owned[p.id] ?? 0) * p.rate * producerMult(cfg, s, p.id) * prestigeMult(cfg, s);
}

export function rate(cfg: ClickerCfg, s: ClickerState): number {
  const base = cfg.producers.reduce((a, p) => a + producerRate(cfg, s, p), 0);
  return base * (s.boost > 0 ? s.boostMult : 1);
}

export function clickValue(cfg: ClickerCfg, s: ClickerState): number {
  let v = cfg.click * prestigeMult(cfg, s);
  let share = 0;
  for (const u of cfg.upgrades) {
    if (!s.bought.includes(u.id)) continue;
    if (u.target === 'click') v *= u.mult;
    if (u.target === 'share') share += u.mult;
  }
  return v + rate(cfg, s) * share;
}

export function earn(s: ClickerState, amount: number) {
  s.amount += amount;
  s.run += amount;
  s.total += amount;
}

export function click(cfg: ClickerCfg, s: ClickerState): number {
  const v = clickValue(cfg, s);
  earn(s, v);
  s.clicks += 1;
  return v;
}

export function price(cfg: ClickerCfg, s: ClickerState, id: string, n: number): number {
  const p = cfg.producers.find((x) => x.id === id);
  return p ? bulkCost(p.base, cfg.growth, s.owned[id] ?? 0, n) : Infinity;
}

export function affordable(cfg: ClickerCfg, s: ClickerState, id: string): number {
  const p = cfg.producers.find((x) => x.id === id);
  return p ? maxAffordable(p.base, cfg.growth, s.owned[id] ?? 0, s.amount) : 0;
}

export function buy(cfg: ClickerCfg, s: ClickerState, id: string, n: number): boolean {
  if (n <= 0) return false;
  const cost = price(cfg, s, id, n);
  if (cost > s.amount) return false;
  s.amount -= cost;
  s.owned[id] = (s.owned[id] ?? 0) + n;
  return true;
}

/** A producer is shown once you have owned the previous one (or could nearly afford it). */
export function producerVisible(cfg: ClickerCfg, s: ClickerState, index: number): boolean {
  if (index === 0) return true;
  const prev = cfg.producers[index - 1];
  return (s.owned[prev.id] ?? 0) > 0 || s.run >= cfg.producers[index].base * 0.5;
}

export function upgradeVisible(s: ClickerState, u: Upgrade): boolean {
  if (s.bought.includes(u.id)) return false;
  if (u.needs !== undefined && (s.owned[u.target] ?? 0) < u.needs) return false;
  if (u.needsTotal !== undefined && s.run < u.needsTotal) return false;
  return true;
}

export function buyUpgrade(cfg: ClickerCfg, s: ClickerState, id: string): boolean {
  const u = cfg.upgrades.find((x) => x.id === id);
  if (!u || !upgradeVisible(s, u) || s.amount < u.cost) return false;
  s.amount -= u.cost;
  s.bought.push(u.id);
  return true;
}

export function tick(cfg: ClickerCfg, s: ClickerState, dt: number) {
  earn(s, rate(cfg, s) * dt);
  s.played += dt;
  if (s.boost > 0) s.boost = Math.max(0, s.boost - dt);
}

/** Prestige points a reset would give now (in total, including those already held). */
export function prestigeAvailable(cfg: ClickerCfg, s: ClickerState): number {
  if (!cfg.prestige) return 0;
  return Math.floor(Math.sqrt(s.total / cfg.prestige.per));
}

export function prestigeReset(cfg: ClickerCfg, s: ClickerState): boolean {
  const pts = prestigeAvailable(cfg, s);
  if (pts <= s.prestige) return false;
  s.prestige = pts;
  s.amount = 0;
  s.run = 0;
  s.owned = Object.fromEntries(cfg.producers.map((p) => [p.id, 0]));
  s.bought = [];
  s.boost = 0;
  s.resets += 1;
  return true;
}

export function validClicker(value: unknown): value is ClickerState {
  if (!isRecord(value) || value.v !== 1) return false;
  const nums = [
    'amount',
    'run',
    'total',
    'clicks',
    'played',
    'savedAt',
    'boost',
    'boostMult',
    'prestige',
    'resets',
  ];
  if (
    !nums.every(
      (k) =>
        typeof value[k] === 'number' &&
        Number.isFinite(value[k] as number) &&
        (value[k] as number) >= 0,
    )
  )
    return false;
  if (
    !isRecord(value.owned) ||
    !Object.values(value.owned).every((n) => Number.isInteger(n) && (n as number) >= 0)
  )
    return false;
  return (
    Array.isArray(value.bought) &&
    value.bought.every((b) => typeof b === 'string') &&
    typeof value.won === 'boolean'
  );
}

/** Producer upgrades at 1, 10, 25 and 50 owned, doubling each time. */
export function tieredUpgrades(producers: Producer[], names: Record<string, string[]>): Upgrade[] {
  const tiers = [1, 10, 25, 50];
  return producers.flatMap((p) =>
    tiers.map((needs, i) => ({
      id: `${p.id}-${i}`,
      name: names[p.id]?.[i] ?? `${p.name} ${['I', 'II', 'III', 'IV'][i]}`,
      icon: p.icon,
      cost: p.base * [10, 50, 500, 5000][i],
      desc: `${p.name}s are twice as productive.`,
      target: p.id,
      mult: 2,
      needs,
    })),
  );
}
