import type { DifficultySetting } from '@/types';

/**
 * Airport Manager: keep planes moving through a small airport.
 *
 * Arriving planes circle with limited fuel until you clear them to land on a
 * free runway. After landing they wait for a gate (big jets need a big gate),
 * turn around at the gate, and then wait for a runway to take off. Every
 * flight pays on departure, minus a penalty for time spent waiting; a plane
 * that runs low on fuel diverts to another airport.
 */
export type Size = 'small' | 'medium' | 'large';
export type Stage = 'holding' | 'landing' | 'taxi' | 'gate' | 'ready' | 'takeoff';

export const SIZE: Record<Size, { icon: string; pay: number; service: number; label: string }> = {
  small: { icon: '🛩️', pay: 40, service: 8, label: 'Prop' },
  medium: { icon: '✈️', pay: 70, service: 12, label: 'Jet' },
  large: { icon: '🛫', pay: 120, service: 16, label: 'Jumbo' },
};

export const RUNWAY_TIME = 3;
export const GRACE = 8;
export const DAYS = 5;
export const DAY_LENGTH = 120;

export interface Plane {
  id: number;
  code: string;
  size: Size;
  stage: Stage;
  /** Seconds left in the current timed stage (landing, gate, takeoff). */
  t: number;
  fuel: number;
  /** Seconds spent waiting (holding, taxi or ready) — costs money. */
  waited: number;
  runway: number | null;
  gate: number | null;
}

export interface Gate {
  large: boolean;
  plane: number | null;
}

export type UpgradeId = 'runway' | 'gate' | 'biggate' | 'crew';
export const UPGRADES: { id: UpgradeId; name: string; icon: string; desc: string; cost: number }[] =
  [
    {
      id: 'gate',
      name: 'Extra gate',
      icon: '🚪',
      desc: 'One more gate for small and medium planes.',
      cost: 250,
    },
    {
      id: 'biggate',
      name: 'Jumbo gate',
      icon: '🏢',
      desc: 'A second gate that fits jumbos.',
      cost: 400,
    },
    {
      id: 'crew',
      name: 'Ground crew',
      icon: '👷',
      desc: 'Turnarounds at the gate are 30% faster.',
      cost: 350,
    },
    {
      id: 'runway',
      name: 'Second runway',
      icon: '🛬',
      desc: 'Land and take off two planes at once.',
      cost: 500,
    },
  ];

export interface Tuning {
  /** Seconds between arrivals on day 1. */
  arrive: number;
  fuel: number;
  goals: number[];
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { arrive: 6.5, fuel: 50, goals: [700, 1000, 1150, 1250, 1350] },
  normal: { arrive: 5.5, fuel: 40, goals: [750, 1200, 1350, 1450, 1500] },
  hard: { arrive: 4.6, fuel: 32, goals: [650, 1450, 1450, 1500, 1500] },
};

export interface Airport {
  day: number;
  time: number;
  planes: Plane[];
  runways: (number | null)[];
  gates: Gate[];
  nextArrival: number;
  nextId: number;
  earnedToday: number;
  divertedToday: number;
  flightsToday: number;
  cash: number;
  total: number;
  flights: number;
  upgrades: UpgradeId[];
  closing: boolean;
  log: string;
  /** Deterministic stream for arrivals. */
  seed: number;
}

const AIRLINES = ['SK', 'BL', 'ZE', 'NV', 'QT', 'AU', 'FX', 'MO'];

function rand(a: Airport) {
  // Mulberry32 step kept in state so a saved day replays identically.
  a.seed = (a.seed + 0x6d2b79f5) >>> 0;
  let t = a.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newAirport(seed: number): Airport {
  const a: Airport = {
    day: 1,
    time: 0,
    planes: [],
    runways: [null],
    gates: [],
    nextArrival: 1,
    nextId: 1,
    earnedToday: 0,
    divertedToday: 0,
    flightsToday: 0,
    cash: 0,
    total: 0,
    flights: 0,
    upgrades: [],
    closing: false,
    log: 'Tower online. First flights inbound!',
    seed: seed >>> 0,
  };
  setupDay(a);
  return a;
}

export function setupDay(a: Airport) {
  const has = (u: UpgradeId) => a.upgrades.includes(u);
  a.runways = has('runway') ? [null, null] : [null];
  a.gates = [
    { large: true, plane: null },
    { large: false, plane: null },
    { large: false, plane: null },
  ];
  if (has('gate')) a.gates.push({ large: false, plane: null });
  if (has('biggate')) a.gates.push({ large: true, plane: null });
  a.planes = [];
  a.time = 0;
  a.nextArrival = 1;
  a.earnedToday = 0;
  a.divertedToday = 0;
  a.flightsToday = 0;
  a.closing = false;
}

export const serviceTime = (a: Airport, p: Plane) =>
  SIZE[p.size].service * (a.upgrades.includes('crew') ? 0.7 : 1);
export const fits = (g: Gate, p: Plane) => g.plane === null && (g.large || p.size !== 'large');
export const byId = (a: Airport, id: number) => a.planes.find((p) => p.id === id);

function spawn(a: Airport, d: DifficultySetting) {
  const r = rand(a);
  const size: Size = r < 0.35 ? 'small' : r < 0.8 ? 'medium' : 'large';
  const fuel = TUNING[d].fuel * (0.8 + rand(a) * 0.4);
  a.planes.push({
    id: a.nextId++,
    code: `${AIRLINES[Math.floor(rand(a) * AIRLINES.length)]}${100 + Math.floor(rand(a) * 900)}`,
    size,
    stage: 'holding',
    t: 0,
    fuel,
    waited: 0,
    runway: null,
    gate: null,
  });
}

/** What a finished flight pays: full price within the grace period, then 2 coins a second less. */
export function payout(p: Plane) {
  const base = SIZE[p.size].pay;
  return Math.max(Math.round(base * 0.25), Math.round(base - Math.max(0, p.waited - GRACE) * 2));
}

export type Event = 'arrive' | 'landed' | 'serviced' | 'departed' | 'diverted';

export function tick(a: Airport, dt: number, d: DifficultySetting): Event[] {
  const ev: Event[] = [];
  a.time += dt;
  if (a.time < DAY_LENGTH) {
    a.nextArrival -= dt;
    if (a.nextArrival <= 0) {
      spawn(a, d);
      ev.push('arrive');
      a.nextArrival = TUNING[d].arrive * Math.pow(0.9, a.day - 1) * (0.6 + rand(a) * 0.8);
    }
  } else a.closing = true;

  for (const p of [...a.planes]) {
    switch (p.stage) {
      case 'holding':
        p.fuel -= dt;
        p.waited += dt;
        if (p.fuel <= 0) {
          a.planes = a.planes.filter((x) => x !== p);
          a.divertedToday += 1;
          a.earnedToday -= 30;
          a.cash -= 30;
          a.total -= 30;
          a.log = `${p.code} ran low on fuel and diverted (−30)`;
          ev.push('diverted');
        }
        break;
      case 'taxi':
      case 'ready':
        p.waited += dt;
        break;
      case 'landing':
      case 'takeoff':
      case 'gate':
        p.t -= dt;
        if (p.t > 0) break;
        if (p.stage === 'landing') {
          a.runways[p.runway!] = null;
          p.runway = null;
          p.stage = 'taxi';
          ev.push('landed');
        } else if (p.stage === 'gate') {
          p.stage = 'ready';
          ev.push('serviced');
        } else {
          a.runways[p.runway!] = null;
          a.planes = a.planes.filter((x) => x !== p);
          const pay = payout(p);
          a.earnedToday += pay;
          a.cash += pay;
          a.total += pay;
          a.flightsToday += 1;
          a.flights += 1;
          a.log = `${p.code} departed (+${pay})`;
          ev.push('departed');
        }
        break;
    }
  }
  return ev;
}

export const dayOver = (a: Airport) => a.closing && a.planes.length === 0;

/** Sends a holding plane to land, or a ready plane to take off, on runway `r`. */
export function assignRunway(a: Airport, planeId: number, r: number) {
  const p = byId(a, planeId);
  if (!p || a.runways[r] !== null || (p.stage !== 'holding' && p.stage !== 'ready')) return false;
  if (p.stage === 'ready') {
    a.gates[p.gate!].plane = null;
    p.gate = null;
  }
  p.stage = p.stage === 'holding' ? 'landing' : 'takeoff';
  p.t = RUNWAY_TIME;
  p.runway = r;
  a.runways[r] = p.id;
  return true;
}

export function assignGate(a: Airport, planeId: number, g: number) {
  const p = byId(a, planeId);
  const gate = a.gates[g];
  if (!p || !gate || p.stage !== 'taxi' || !fits(gate, p)) return false;
  gate.plane = p.id;
  p.gate = g;
  p.stage = 'gate';
  p.t = serviceTime(a, p);
  return true;
}

/** Planes that could use runway / gate right now, most urgent first. */
export function runwayCandidates(a: Airport) {
  const holding = a.planes.filter((p) => p.stage === 'holding').sort((x, y) => x.fuel - y.fuel);
  const ready = a.planes.filter((p) => p.stage === 'ready').sort((x, y) => y.waited - x.waited);
  // Low fuel beats everything; otherwise clear the gates first so landings have somewhere to go.
  if (holding[0] && holding[0].fuel < 12) return [holding[0], ...ready, ...holding.slice(1)];
  return [...ready, ...holding];
}

export function gateCandidates(a: Airport, g: number) {
  return a.planes
    .filter((p) => p.stage === 'taxi' && fits(a.gates[g], p))
    .sort((x, y) => y.waited - x.waited);
}

/** Tapping a runway or gate with nothing selected handles the most urgent plane. */
export function autoRunway(a: Airport, r: number) {
  const p = runwayCandidates(a)[0];
  return p ? assignRunway(a, p.id, r) : false;
}

export function autoGate(a: Airport, g: number) {
  const p = gateCandidates(a, g)[0];
  return p ? assignGate(a, p.id, g) : false;
}

export function buy(a: Airport, id: UpgradeId) {
  const u = UPGRADES.find((x) => x.id === id)!;
  if (a.upgrades.includes(id) || a.cash < u.cost) return false;
  a.cash -= u.cost;
  a.upgrades.push(id);
  return true;
}

/** A tidy controller for the balance tests: fill free gates, then free runways. */
export function botStep(a: Airport) {
  for (let g = 0; g < a.gates.length; g++) if (a.gates[g].plane === null && autoGate(a, g)) return;
  for (let r = 0; r < a.runways.length; r++) if (a.runways[r] === null && autoRunway(a, r)) return;
}

export function validAirport(v: unknown): v is Airport {
  if (!v || typeof v !== 'object') return false;
  const a = v as Airport;
  return (
    Number.isInteger(a.day) &&
    a.day >= 1 &&
    a.day <= DAYS &&
    Number.isFinite(a.cash) &&
    Number.isFinite(a.total) &&
    Number.isFinite(a.flights) &&
    Number.isFinite(a.seed) &&
    Array.isArray(a.upgrades) &&
    a.upgrades.every((u) => UPGRADES.some((x) => x.id === u))
  );
}
