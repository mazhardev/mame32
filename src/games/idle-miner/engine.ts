import type { DifficultySetting } from '@/types';
import { isRecord } from '../_shared/puzzle/useSavedGame';

/**
 * Idle Miner: shafts dig ore (deeper shafts dig richer ore), the elevator
 * carries it to the surface and the warehouse trucks it to market. Each of
 * the three has a throughput, and the slowest one limits your income, so the
 * game is about spotting and upgrading the bottleneck.
 */
export const MAX_SHAFTS = 8;

export interface Mine {
  v: 1;
  money: number;
  total: number;
  /** Level of each dug shaft (index 0 is the shallowest). */
  shafts: number[];
  /** Ore value waiting at each shaft, at the surface, and sold. */
  stash: number[];
  surface: number;
  elevator: number;
  warehouse: number;
  played: number;
  savedAt: number;
  won: boolean;
}

export const GOALS: Record<DifficultySetting, number> = { easy: 2e6, normal: 2e7, hard: 2e8 };
export const COST: Record<DifficultySetting, number> = { easy: 0.8, normal: 1, hard: 1.25 };

export function newMine(): Mine {
  return {
    v: 1,
    money: 0,
    total: 0,
    shafts: [1],
    stash: [0],
    surface: 0,
    elevator: 1,
    warehouse: 1,
    played: 0,
    savedAt: Date.now(),
    won: false,
  };
}

/** Ore value per second dug by shaft `i` at `level`. */
export function shaftRate(i: number, level: number): number {
  return 2 * 9 ** i * level * 2 ** Math.floor(level / 25);
}

/** Elevator: value carried per second; trips take longer the deeper the mine. */
export function elevatorRate(level: number, shafts: number): number {
  const capacity = 12 * 1.32 ** (level - 1);
  const trip = (2 + shafts * 0.8) / (1 + level * 0.04);
  return capacity / trip;
}

export function warehouseRate(level: number): number {
  const capacity = 10 * 1.3 ** (level - 1);
  const trip = 3 / (1 + level * 0.04);
  return capacity / trip;
}

export const shaftCost = (i: number, level: number, k: number) =>
  k * 5 * 9 ** i * 1.15 ** (level - 1);
export const newShaftCost = (i: number, k: number) => k * 60 * 11 ** i;
export const elevatorCost = (level: number, k: number) => k * 25 * 1.38 ** (level - 1);
export const warehouseCost = (level: number, k: number) => k * 25 * 1.38 ** (level - 1);

export function production(m: Mine): number {
  return m.shafts.reduce((a, l, i) => a + shaftRate(i, l), 0);
}

export type Stage = 'shafts' | 'elevator' | 'warehouse';

/** Which stage limits income right now. */
export function bottleneck(m: Mine): Stage {
  const p = production(m);
  const e = elevatorRate(m.elevator, m.shafts.length);
  const w = warehouseRate(m.warehouse);
  const min = Math.min(p, e, w);
  return min === p ? 'shafts' : min === e ? 'elevator' : 'warehouse';
}

export function income(m: Mine): number {
  return Math.min(
    production(m),
    elevatorRate(m.elevator, m.shafts.length),
    warehouseRate(m.warehouse),
  );
}

export function tick(m: Mine, dt: number) {
  m.played += dt;
  m.shafts.forEach((l, i) => (m.stash[i] += shaftRate(i, l) * dt));
  // The elevator empties the shallow shafts first.
  let lift = elevatorRate(m.elevator, m.shafts.length) * dt;
  for (let i = 0; i < m.stash.length && lift > 0; i++) {
    const take = Math.min(lift, m.stash[i]);
    m.stash[i] -= take;
    lift -= take;
    m.surface += take;
  }
  const sell = Math.min(m.surface, warehouseRate(m.warehouse) * dt);
  m.surface -= sell;
  m.money += sell;
  m.total += sell;
}

export function upgradeShaft(m: Mine, i: number, k: number): boolean {
  const c = shaftCost(i, m.shafts[i], k);
  if (i >= m.shafts.length || c > m.money) return false;
  m.money -= c;
  m.shafts[i] += 1;
  return true;
}

export function digShaft(m: Mine, k: number): boolean {
  const i = m.shafts.length;
  if (i >= MAX_SHAFTS || newShaftCost(i, k) > m.money) return false;
  m.money -= newShaftCost(i, k);
  m.shafts.push(1);
  m.stash.push(0);
  return true;
}

export function upgradeElevator(m: Mine, k: number): boolean {
  const c = elevatorCost(m.elevator, k);
  if (c > m.money) return false;
  m.money -= c;
  m.elevator += 1;
  return true;
}

export function upgradeWarehouse(m: Mine, k: number): boolean {
  const c = warehouseCost(m.warehouse, k);
  if (c > m.money) return false;
  m.money -= c;
  m.warehouse += 1;
  return true;
}

export function validMine(v: unknown): v is Mine {
  if (!isRecord(v) || v.v !== 1) return false;
  for (const k of ['money', 'total', 'surface', 'played', 'savedAt'])
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k] as number) || (v[k] as number) < 0)
      return false;
  if (
    !Number.isInteger(v.elevator) ||
    !Number.isInteger(v.warehouse) ||
    (v.elevator as number) < 1 ||
    (v.warehouse as number) < 1
  )
    return false;
  if (
    !Array.isArray(v.shafts) ||
    !Array.isArray(v.stash) ||
    v.shafts.length !== v.stash.length ||
    v.shafts.length < 1 ||
    v.shafts.length > MAX_SHAFTS
  )
    return false;
  return (
    v.shafts.every((l) => Number.isInteger(l) && l >= 1) &&
    v.stash.every((x) => typeof x === 'number' && x >= 0) &&
    typeof v.won === 'boolean'
  );
}
