import type { DifficultySetting } from '@/types';
import { bulkCost } from '../_shared/idle/format';
import { isRecord } from '../_shared/puzzle/useSavedGame';

/**
 * Idle Factory: a production chain. Drills dig ore; smelters, presses,
 * assemblers and robot labs turn it into ingots, gears, engines and robots.
 * Each machine only works if its inputs are in stock, so the ratio of
 * machines matters. Anything a later stage does not use is sold.
 */
export type Res = 'ore' | 'ingot' | 'gear' | 'engine' | 'robot';
export const RESOURCES: Res[] = ['ore', 'ingot', 'gear', 'engine', 'robot'];

export interface Machine {
  id: string;
  name: string;
  icon: string;
  cost: number;
  /** Crafts per second per machine. */
  rate: number;
  inputs: Partial<Record<Res, number>>;
  output: Res;
}

export const MACHINES: Machine[] = [
  { id: 'drill', name: 'Drill', icon: '⛏️', cost: 10, rate: 1, inputs: {}, output: 'ore' },
  {
    id: 'smelter',
    name: 'Smelter',
    icon: '🔥',
    cost: 60,
    rate: 0.5,
    inputs: { ore: 2 },
    output: 'ingot',
  },
  {
    id: 'press',
    name: 'Gear Press',
    icon: '⚙️',
    cost: 450,
    rate: 0.25,
    inputs: { ingot: 3 },
    output: 'gear',
  },
  {
    id: 'assembler',
    name: 'Assembler',
    icon: '🔧',
    cost: 3500,
    rate: 0.12,
    inputs: { gear: 2, ingot: 1 },
    output: 'engine',
  },
  {
    id: 'lab',
    name: 'Robot Lab',
    icon: '🤖',
    cost: 30000,
    rate: 0.06,
    inputs: { engine: 2, gear: 3 },
    output: 'robot',
  },
];

export const PRICES: Record<Res, number> = { ore: 1, ingot: 3, gear: 12, engine: 45, robot: 220 };
export const ICONS: Record<Res, string> = {
  ore: '🪨',
  ingot: '🧱',
  gear: '⚙️',
  engine: '🛠️',
  robot: '🤖',
};

export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  cost: number;
  desc: string;
  machine?: string;
  speed?: number;
  price?: number;
}

export const UPGRADES: Upgrade[] = [
  {
    id: 'bits',
    name: 'Diamond Bits',
    icon: '💎',
    cost: 400,
    desc: 'Drills work twice as fast.',
    machine: 'drill',
    speed: 2,
  },
  {
    id: 'furnace',
    name: 'Blast Furnace',
    icon: '🌋',
    cost: 2500,
    desc: 'Smelters work twice as fast.',
    machine: 'smelter',
    speed: 2,
  },
  {
    id: 'hydraulic',
    name: 'Hydraulic Press',
    icon: '🗜️',
    cost: 15000,
    desc: 'Gear presses work twice as fast.',
    machine: 'press',
    speed: 2,
  },
  {
    id: 'line',
    name: 'Assembly Line',
    icon: '📏',
    cost: 90000,
    desc: 'Assemblers work twice as fast.',
    machine: 'assembler',
    speed: 2,
  },
  {
    id: 'ai',
    name: 'Smart Robots',
    icon: '🧠',
    cost: 500000,
    desc: 'Robot labs work twice as fast.',
    machine: 'lab',
    speed: 2,
  },
  {
    id: 'contracts',
    name: 'Export Contracts',
    icon: '📑',
    cost: 40000,
    desc: 'Everything sells for 50% more.',
    price: 1.5,
  },
  {
    id: 'brand',
    name: 'Famous Brand',
    icon: '⭐',
    cost: 800000,
    desc: 'Everything sells for 50% more.',
    price: 1.5,
  },
];

export interface Factory {
  v: 1;
  money: number;
  machines: Record<string, number>;
  upgrades: string[];
  made: Record<Res, number>;
  played: number;
  savedAt: number;
  won: boolean;
}

export const GOALS: Record<DifficultySetting, number> = { easy: 40, normal: 120, hard: 300 };
export const GROWTH: Record<DifficultySetting, number> = { easy: 1.1, normal: 1.12, hard: 1.14 };

export function newFactory(): Factory {
  return {
    v: 1,
    money: 25,
    machines: Object.fromEntries(MACHINES.map((m) => [m.id, m.id === 'drill' ? 1 : 0])),
    upgrades: [],
    made: { ore: 0, ingot: 0, gear: 0, engine: 0, robot: 0 },
    played: 0,
    savedAt: Date.now(),
    won: false,
  };
}

/** Machines run briskly so a session reaches the goal in well under an hour. */
const PACE = 2;

export function speedOf(f: Factory, m: Machine): number {
  let s = m.rate * PACE;
  for (const u of UPGRADES) if (u.machine === m.id && f.upgrades.includes(u.id)) s *= u.speed ?? 1;
  return s;
}

export function priceMult(f: Factory): number {
  return UPGRADES.reduce((a, u) => (u.price && f.upgrades.includes(u.id) ? a * u.price : a), 1);
}

export interface Flow {
  /** Units produced per second by each stage. */
  made: Record<Res, number>;
  /** Units sold per second (what no stage used). */
  sold: Record<Res, number>;
  income: number;
  /** For each machine type: the fraction of its capacity it can use (1 = never starved). */
  busy: Record<string, number>;
}

/**
 * Steady-state flow per second: stages run in order and each takes what it
 * can from what earlier stages made. Used for the simulation and the UI.
 */
export function flow(f: Factory, counts: Record<string, number> = f.machines): Flow {
  const stock: Record<Res, number> = { ore: 0, ingot: 0, gear: 0, engine: 0, robot: 0 };
  const made: Record<Res, number> = { ...stock };
  const busy: Record<string, number> = {};
  for (const m of MACHINES) {
    const capacity = (counts[m.id] ?? 0) * speedOf(f, m);
    let crafts = capacity;
    for (const [res, need] of Object.entries(m.inputs) as [Res, number][])
      crafts = Math.min(crafts, stock[res] / need);
    for (const [res, need] of Object.entries(m.inputs) as [Res, number][])
      stock[res] -= crafts * need;
    stock[m.output] += crafts;
    made[m.output] += crafts;
    busy[m.id] = capacity > 0 ? crafts / capacity : 0;
  }
  const pm = priceMult(f);
  const income = RESOURCES.reduce((a, r) => a + stock[r] * PRICES[r] * pm, 0);
  return { made, sold: stock, income, busy };
}

export function tick(f: Factory, dt: number) {
  const fl = flow(f);
  f.money += fl.income * dt;
  for (const r of RESOURCES) f.made[r] += fl.made[r] * dt;
  f.played += dt;
}

export function machineCost(f: Factory, id: string, growth: number, n = 1): number {
  const m = MACHINES.find((x) => x.id === id);
  return m ? bulkCost(m.cost, growth, f.machines[id] ?? 0, n) : Infinity;
}

export function buyMachine(f: Factory, id: string, growth: number, n = 1): boolean {
  const c = machineCost(f, id, growth, n);
  if (c > f.money) return false;
  f.money -= c;
  f.machines[id] = (f.machines[id] ?? 0) + n;
  return true;
}

export function buyUpgrade(f: Factory, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || f.upgrades.includes(id) || f.money < u.cost) return false;
  f.money -= u.cost;
  f.upgrades.push(id);
  return true;
}

/** Machines unlock one stage at a time. */
export function unlocked(f: Factory, index: number): boolean {
  return index === 0 || (f.machines[MACHINES[index - 1].id] ?? 0) > 0;
}

export function validFactory(v: unknown): v is Factory {
  if (!isRecord(v) || v.v !== 1) return false;
  for (const k of ['money', 'played', 'savedAt'])
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k] as number) || (v[k] as number) < 0)
      return false;
  if (
    !isRecord(v.machines) ||
    !MACHINES.every((m) =>
      Number.isInteger(v.machines && (v.machines as Record<string, unknown>)[m.id]),
    )
  )
    return false;
  if (
    !isRecord(v.made) ||
    !RESOURCES.every((r) => typeof (v.made as Record<string, unknown>)[r] === 'number')
  )
    return false;
  return (
    Array.isArray(v.upgrades) &&
    v.upgrades.every((u) => UPGRADES.some((x) => x.id === u)) &&
    typeof v.won === 'boolean'
  );
}
