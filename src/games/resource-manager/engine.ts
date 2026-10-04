import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Resource Manager: keep a small colony on a dusty planet alive and growing.
 *
 * Every day you assign colonists to jobs. Solar panels make power; modules
 * need power to run; extractors pull water from the ground; greenhouses turn
 * water into food; mines dig metal; engineers build new modules. Everyone
 * eats and drinks every day, storage is limited, and dust storms, meteor
 * strikes and supply drops keep the plan honest. A shuttle brings new
 * colonists whenever there is room in the habitats.
 */
export type Res = 'food' | 'water' | 'power' | 'metal';
export type Job = 'farmer' | 'pumper' | 'miner' | 'engineer';
export type ModuleId = 'solar' | 'extractor' | 'greenhouse' | 'mine' | 'habitat' | 'storage';

export interface ModuleDef {
  id: ModuleId;
  name: string;
  icon: string;
  metal: number;
  work: number;
  power: number;
  desc: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'solar',
    name: 'Solar array',
    icon: '☀️',
    metal: 12,
    work: 4,
    power: 0,
    desc: 'Makes 10 power a day (less in a dust storm).',
  },
  {
    id: 'extractor',
    name: 'Water extractor',
    icon: '💧',
    metal: 15,
    work: 5,
    power: 2,
    desc: 'Two pumpers each pull 6 water a day. Uses power while staffed.',
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    icon: '🌱',
    metal: 15,
    work: 5,
    power: 2,
    desc: 'Three farmers each grow 5 food, using 1 water each. Uses power while staffed.',
  },
  {
    id: 'mine',
    name: 'Mine',
    icon: '⛏️',
    metal: 10,
    work: 5,
    power: 2,
    desc: 'Three miners each dig 3 metal a day. Uses power while staffed.',
  },
  {
    id: 'habitat',
    name: 'Habitat',
    icon: '🏠',
    metal: 20,
    work: 6,
    power: 1,
    desc: 'Homes for 4 more colonists.',
  },
  {
    id: 'storage',
    name: 'Storage',
    icon: '📦',
    metal: 10,
    work: 3,
    power: 0,
    desc: '+40 food, water and metal storage.',
  },
];
export const MODULE = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<
  ModuleId,
  ModuleDef
>;

export const JOBS: { id: Job; name: string; icon: string; slots: ModuleId | null; per: number }[] =
  [
    { id: 'farmer', name: 'Farmers', icon: '🧑‍🌾', slots: 'greenhouse', per: 3 },
    { id: 'pumper', name: 'Pumpers', icon: '🚰', slots: 'extractor', per: 2 },
    { id: 'miner', name: 'Miners', icon: '👷', slots: 'mine', per: 3 },
    { id: 'engineer', name: 'Engineers', icon: '🔧', slots: null, per: 0 },
  ];

export const SOLAR = 10;
export const BASE_CAP = 60;
export const SHUTTLE_EVERY = 4;

export interface Tuning {
  days: number;
  goal: number;
  storms: number;
  meteors: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { days: 40, goal: 18, storms: 0.08, meteors: 0.04 },
  normal: { days: 40, goal: 22, storms: 0.12, meteors: 0.07 },
  hard: { days: 40, goal: 26, storms: 0.16, meteors: 0.1 },
};

export interface Colony {
  day: number;
  res: Record<Res, number>;
  colonists: number;
  jobs: Record<Job, number>;
  modules: Record<ModuleId, number>;
  /** Modules knocked offline by meteors; engineers repair them before building. */
  broken: Partial<Record<ModuleId, number>>;
  /** Module under construction and the work done on it. */
  project: ModuleId | null;
  progress: number;
  health: number;
  storm: number;
  stormWarning: boolean;
  seed: number;
  lost: number;
  log: string[];
  over: 'won' | 'lost' | 'time' | null;
  savedAt?: number;
}

export function newColony(seed: number): Colony {
  return {
    day: 1,
    res: { food: 30, water: 30, power: 0, metal: 25 },
    colonists: 6,
    jobs: { farmer: 2, pumper: 2, miner: 1, engineer: 1 },
    modules: { solar: 2, extractor: 1, greenhouse: 1, mine: 1, habitat: 2, storage: 0 },
    broken: {},
    project: null,
    progress: 0,
    health: 100,
    storm: 0,
    stormWarning: false,
    seed,
    lost: 0,
    log: ['Landing successful. Six colonists are ready to work.'],
    over: null,
  };
}

export const working = (c: Colony, m: ModuleId) => c.modules[m] - (c.broken[m] ?? 0);
export const capacity = (c: Colony) => BASE_CAP + 40 * c.modules.storage;
export const housing = (c: Colony) => 4 * c.modules.habitat;
export const assigned = (c: Colony) => JOBS.reduce((a, j) => a + c.jobs[j.id], 0);
export const idle = (c: Colony) => c.colonists - assigned(c);
export const slotsFor = (c: Colony, job: Job) => {
  const j = JOBS.find((x) => x.id === job)!;
  return j.slots ? working(c, j.slots) * j.per : Infinity;
};

export function setJob(c: Colony, job: Job, n: number) {
  const max = Math.min(slotsFor(c, job), c.jobs[job] + idle(c));
  c.jobs[job] = Math.max(0, Math.min(max, n));
}

export interface Forecast {
  power: { made: number; used: number };
  efficiency: number;
  food: number;
  water: number;
  metal: number;
  work: number;
}

/** What tomorrow looks like with the current plan (before random events). */
export function forecast(c: Colony): Forecast {
  const made = Math.round(working(c, 'solar') * SOLAR * (c.storm > 0 ? 0.3 : 1));
  const farmers = Math.min(c.jobs.farmer, slotsFor(c, 'farmer'));
  const pumpers = Math.min(c.jobs.pumper, slotsFor(c, 'pumper'));
  const miners = Math.min(c.jobs.miner, slotsFor(c, 'miner'));
  // Production modules only draw power while someone is working in them.
  const usedFull =
    Math.ceil(pumpers / 2) * MODULE.extractor.power +
    Math.ceil(farmers / 3) * MODULE.greenhouse.power +
    Math.ceil(miners / 3) * MODULE.mine.power +
    working(c, 'habitat') * MODULE.habitat.power;
  const efficiency = usedFull === 0 ? 1 : Math.min(1, made / usedFull);
  const water = Math.floor(pumpers * 6 * efficiency) - farmers - c.colonists;
  const food = Math.floor(farmers * 5 * efficiency) - c.colonists;
  const metal = Math.floor(miners * 3 * efficiency);
  return { power: { made, used: usedFull }, efficiency, food, water, metal, work: c.jobs.engineer };
}

export function startProject(c: Colony, m: ModuleId) {
  if (c.project || c.res.metal < MODULE[m].metal) return false;
  c.res.metal -= MODULE[m].metal;
  c.project = m;
  c.progress = 0;
  return true;
}

export function cancelProject(c: Colony) {
  if (!c.project) return false;
  c.res.metal = Math.min(capacity(c), c.res.metal + Math.floor(MODULE[c.project].metal / 2));
  c.project = null;
  c.progress = 0;
  return true;
}

export type DayEvent = 'storm' | 'meteor' | 'supply' | 'shuttle' | 'built' | 'death' | 'repaired';

export function nextDay(c: Colony, difficulty: DifficultySetting): DayEvent[] {
  const t = TUNING[difficulty];
  const ev: DayEvent[] = [];
  const f = forecast(c);
  const cap = capacity(c);
  const log: string[] = [];
  c.res.food = Math.min(cap, c.res.food + f.food);
  c.res.water = Math.min(cap, c.res.water + f.water);
  c.res.metal = Math.min(cap, c.res.metal + f.metal);
  c.res.power = f.power.made - f.power.used;

  // Engineers repair broken modules first, then build.
  let work = f.work;
  for (const m of Object.keys(c.broken) as ModuleId[]) {
    while ((c.broken[m] ?? 0) > 0 && work >= 2) {
      c.broken[m] = (c.broken[m] ?? 0) - 1;
      work -= 2;
      log.push(`🔧 ${MODULE[m].name} repaired.`);
      ev.push('repaired');
    }
    if (!c.broken[m]) delete c.broken[m];
  }
  if (c.project) {
    c.progress += work;
    if (c.progress >= MODULE[c.project].work) {
      c.modules[c.project] += 1;
      log.push(`🏗️ New ${MODULE[c.project].name.toLowerCase()} finished.`);
      c.project = null;
      c.progress = 0;
      ev.push('built');
    }
  }

  // Shortages hurt the colony's health; at zero someone is lost.
  const short = c.res.food < 0 || c.res.water < 0;
  if (short) {
    c.health -= 25;
    log.push(`⚠️ ${c.res.food < 0 ? 'Food' : 'Water'} ran out!`);
  } else c.health = Math.min(100, c.health + 10);
  c.res.food = Math.max(0, c.res.food);
  c.res.water = Math.max(0, c.res.water);
  if (c.health <= 0) {
    c.colonists -= 1;
    c.lost += 1;
    c.health = 50;
    log.push('💀 A colonist did not survive the shortage.');
    ev.push('death');
    trimJobs(c);
  }

  c.day += 1;
  const rng = createRng(c.seed * 7 + c.day);
  if (c.storm > 0) c.storm -= 1;
  if (c.stormWarning) {
    c.storm = 2;
    c.stormWarning = false;
    log.push('🌪️ The dust storm has arrived: solar output is down for two days.');
    ev.push('storm');
  } else if (c.storm === 0 && rng.next() < t.storms) {
    c.stormWarning = true;
    log.push('📡 Dust storm forecast for tomorrow!');
  }
  if (rng.next() < t.meteors) {
    const pool = (['solar', 'extractor', 'greenhouse', 'mine'] as ModuleId[]).filter(
      (m) => working(c, m) > 0,
    );
    if (pool.length) {
      const m = pool[Math.floor(rng.next() * pool.length)];
      c.broken[m] = (c.broken[m] ?? 0) + 1;
      log.push(
        `☄️ A meteor knocked out a ${MODULE[m].name.toLowerCase()}! Engineers can repair it.`,
      );
      ev.push('meteor');
      trimJobs(c);
    }
  } else if (rng.next() < 0.06) {
    const metal = 10 + Math.floor(rng.next() * 15);
    c.res.metal = Math.min(cap, c.res.metal + metal);
    c.res.food = Math.min(cap, c.res.food + 10);
    log.push(`🪂 A supply drop: +${metal} metal and 10 food.`);
    ev.push('supply');
  }
  if ((c.day - 1) % SHUTTLE_EVERY === 0 && c.colonists < housing(c) && c.health >= 50) {
    const n = Math.min(3, housing(c) - c.colonists);
    c.colonists += n;
    log.push(`🚀 The shuttle brought ${n} new colonist${n > 1 ? 's' : ''}.`);
    ev.push('shuttle');
  }
  if (c.colonists <= 0) c.over = 'lost';
  else if (c.colonists >= t.goal) c.over = 'won';
  else if (c.day > t.days) c.over = 'time';
  c.log = log.length ? log : ['A quiet day on the colony.'];
  return ev;
}

function trimJobs(c: Colony) {
  for (const j of JOBS) c.jobs[j.id] = Math.min(c.jobs[j.id], slotsFor(c, j.id));
  let over = assigned(c) - c.colonists;
  for (const j of [...JOBS].reverse()) {
    const cut = Math.min(over, c.jobs[j.id]);
    c.jobs[j.id] -= cut;
    over -= cut;
  }
}

export function score(c: Colony, difficulty: DifficultySetting) {
  const left = Math.max(0, TUNING[difficulty].days + 1 - c.day);
  return c.colonists * 40 + (c.over === 'won' ? 500 + left * 20 : 0) - c.lost * 50;
}

/**
 * A methodical planner for the balance tests: covers water and food first,
 * then power, then grows housing and production, keeping one or two
 * engineers busy.
 */
export function botDay(c: Colony) {
  const set = (j: Job, n: number) => setJob(c, j, n);
  for (const j of JOBS) c.jobs[j.id] = 0;
  const need = c.colonists;
  // Food first (farmers also drink), then water to match.
  const farmers = Math.min(
    slotsFor(c, 'farmer'),
    Math.ceil((need + 1) / 5) + (c.res.food < 20 ? 1 : 0),
  );
  set('farmer', farmers);
  set(
    'pumper',
    Math.min(
      slotsFor(c, 'pumper'),
      Math.ceil((need + farmers + 1) / 6) + (c.res.water < 20 ? 1 : 0),
    ),
  );
  const engineers =
    c.project || c.res.metal >= 15 || Object.keys(c.broken).length
      ? 1 + Math.floor(c.colonists / 8)
      : 0;
  set('miner', Math.max(0, idle(c) - engineers));
  set('engineer', idle(c));
  if (!c.project) {
    const f = forecast(c);
    const order: ModuleId[] = [];
    if (f.power.made < f.power.used + 4) order.push('solar');
    if (slotsFor(c, 'farmer') * 5 < c.colonists + 6) order.push('greenhouse');
    if (slotsFor(c, 'pumper') * 6 < c.colonists + slotsFor(c, 'farmer') + 6)
      order.push('extractor');
    if (housing(c) - c.colonists < 3) order.push('habitat');
    if (working(c, 'mine') < 2) order.push('mine');
    order.push('habitat', 'solar', 'greenhouse', 'extractor', 'mine');
    for (const m of order) if (startProject(c, m)) break;
  }
}

const RES: Res[] = ['food', 'water', 'power', 'metal'];
export function validColony(v: unknown): v is Colony {
  if (!v || typeof v !== 'object') return false;
  const c = v as Colony;
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  return (
    Number.isInteger(c.day) &&
    c.day >= 1 &&
    !!c.res &&
    RES.every((r) => num(c.res[r])) &&
    Number.isInteger(c.colonists) &&
    c.colonists > 0 &&
    !!c.jobs &&
    JOBS.every((j) => Number.isInteger(c.jobs[j.id]) && c.jobs[j.id] >= 0) &&
    !!c.modules &&
    MODULES.every((m) => Number.isInteger(c.modules[m.id]) && c.modules[m.id] >= 0) &&
    !!c.broken &&
    typeof c.broken === 'object' &&
    (c.project === null || MODULES.some((m) => m.id === c.project)) &&
    num(c.progress) &&
    num(c.health) &&
    num(c.storm) &&
    num(c.seed) &&
    c.over === null
  );
}
