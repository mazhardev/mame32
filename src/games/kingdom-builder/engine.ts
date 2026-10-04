import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Kingdom Builder: grow a medieval kingdom season by season and raise a
 * castle before your reign ends.
 *
 * Buildings put your people to work producing food, wood, stone and gold.
 * Every season brings a decision — a travelling merchant, a poor harvest,
 * raiders at the border — and taxes trade gold against your people's mood.
 * Starve them or make them miserable and they revolt.
 */
export type Res = 'gold' | 'food' | 'wood' | 'stone';
export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';
export const SEASONS: Season[] = ['Spring', 'Summer', 'Autumn', 'Winter'];
export type Tax = 'low' | 'normal' | 'high';
export type BuildingId =
  'farm' | 'lumber' | 'quarry' | 'house' | 'market' | 'barracks' | 'temple' | 'walls' | 'castle';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  icon: string;
  cost: Partial<Record<Res, number>>;
  workers: number;
  desc: string;
  max?: number;
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'farm',
    name: 'Farm',
    icon: '🌾',
    cost: { wood: 8 },
    workers: 3,
    desc: 'Grows food — plenty in autumn, little in winter.',
  },
  {
    id: 'lumber',
    name: 'Lumber camp',
    icon: '🪓',
    cost: { gold: 10 },
    workers: 2,
    desc: '+5 wood a season (+3 in winter).',
  },
  {
    id: 'quarry',
    name: 'Quarry',
    icon: '⛏️',
    cost: { wood: 15, gold: 10 },
    workers: 2,
    desc: '+4 stone a season.',
  },
  {
    id: 'house',
    name: 'Cottages',
    icon: '🏡',
    cost: { wood: 8 },
    workers: 0,
    desc: 'Room for 6 more people.',
  },
  {
    id: 'market',
    name: 'Market',
    icon: '🏪',
    cost: { wood: 20, stone: 10 },
    workers: 2,
    desc: '+6 gold a season, and lets you trade gold for wood and stone.',
    max: 3,
  },
  {
    id: 'barracks',
    name: 'Barracks',
    icon: '⚔️',
    cost: { wood: 20, stone: 15 },
    workers: 2,
    desc: 'Trains 2 soldiers a season (they eat).',
    max: 3,
  },
  {
    id: 'temple',
    name: 'Temple',
    icon: '⛪',
    cost: { stone: 30, gold: 30 },
    workers: 1,
    desc: 'Happiness +3 every season.',
    max: 2,
  },
  {
    id: 'walls',
    name: 'Walls',
    icon: '🧱',
    cost: { stone: 40 },
    workers: 0,
    desc: '+8 defence against raids.',
    max: 3,
  },
  {
    id: 'castle',
    name: 'Castle',
    icon: '🏰',
    cost: { stone: 160, wood: 120, gold: 200 },
    workers: 0,
    desc: 'Complete it to win.',
    max: 1,
  },
];
export const BUILDING = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<
  BuildingId,
  BuildingDef
>;

const FARM_YIELD: Record<Season, number> = { Spring: 5, Summer: 7, Autumn: 10, Winter: 1 };
export const EAT = 1;
export const HOUSING_BASE = 12;
export const HOUSING_PER = 6;

export interface Kingdom {
  turn: number;
  res: Record<Res, number>;
  people: number;
  soldiers: number;
  happiness: number;
  built: Record<BuildingId, number>;
  tax: Tax;
  seed: number;
  event: EventCard | null;
  over: 'won' | 'revolt' | 'starved' | 'time' | null;
  log: string[];
  raidsWon: number;
  savedAt?: number;
}

export interface Tuning {
  years: number;
  start: Record<Res, number>;
  raid: number;
  severity: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { years: 8, start: { gold: 60, food: 60, wood: 50, stone: 10 }, raid: 0.7, severity: 0.7 },
  normal: { years: 8, start: { gold: 40, food: 45, wood: 35, stone: 5 }, raid: 1, severity: 1 },
  hard: { years: 7, start: { gold: 30, food: 35, wood: 25, stone: 0 }, raid: 1.3, severity: 1.3 },
};

export const seasonOf = (turn: number): Season => SEASONS[(turn - 1) % 4];
export const yearOf = (turn: number) => Math.floor((turn - 1) / 4) + 1;

export function workersUsed(k: Kingdom) {
  return BUILDINGS.reduce((a, b) => a + b.workers * k.built[b.id], 0);
}
export const housing = (k: Kingdom) => HOUSING_BASE + HOUSING_PER * k.built.house;
export const defence = (k: Kingdom) => k.soldiers + 8 * k.built.walls;

/** Buildings only produce when they are fully staffed; later buildings go unstaffed first. */
export function staffed(k: Kingdom): Record<BuildingId, number> {
  let free = k.people;
  const out = {} as Record<BuildingId, number>;
  for (const b of BUILDINGS) {
    const n = b.workers ? Math.min(k.built[b.id], Math.floor(free / b.workers)) : k.built[b.id];
    out[b.id] = n;
    free -= n * b.workers;
  }
  return out;
}

export function canBuild(k: Kingdom, id: BuildingId) {
  const b = BUILDING[id];
  if (b.max !== undefined && k.built[id] >= b.max) return false;
  return (Object.entries(b.cost) as [Res, number][]).every(([r, n]) => k.res[r] >= n);
}

export function build(k: Kingdom, id: BuildingId) {
  if (k.over || !canBuild(k, id)) return false;
  for (const [r, n] of Object.entries(BUILDING[id].cost) as [Res, number][]) k.res[r] -= n;
  k.built[id] += 1;
  if (id === 'castle') {
    k.over = 'won';
    k.log = ['🏰 The castle is complete! Long live the monarch!', ...k.log];
  }
  return true;
}

/** Market trades: 10 units of wood or stone for gold. Needs at least one market. */
export const TRADE: Record<'wood' | 'stone', number> = { wood: 14, stone: 18 };

export function trade(k: Kingdom, r: 'wood' | 'stone') {
  if (k.over || k.built.market < 1 || k.res.gold < TRADE[r]) return false;
  k.res.gold -= TRADE[r];
  k.res[r] += 10;
  return true;
}

// ---- Events --------------------------------------------------------------

export interface Choice {
  label: string;
  /** Effects applied when chosen; `raid` triggers a battle against that strength. */
  effect: Partial<Record<Res | 'people' | 'happiness' | 'soldiers', number>>;
  raid?: number;
  /** A requirement to pick this option. */
  needs?: Partial<Record<Res | 'soldiers', number>>;
}

export interface EventCard {
  id: string;
  title: string;
  text: string;
  icon: string;
  choices: Choice[];
}

type EventMaker = (k: Kingdom, sev: number, raid: number) => EventCard;

const EVENTS: EventMaker[] = [
  (k) => ({
    id: 'merchant',
    title: 'A travelling merchant',
    icon: '🐫',
    text: 'A merchant offers building materials for gold.',
    choices: [
      {
        label: `Buy 30 stone for ${k.built.market ? 30 : 45} gold`,
        effect: { stone: 30, gold: -(k.built.market ? 30 : 45) },
        needs: { gold: k.built.market ? 30 : 45 },
      },
      {
        label: `Buy 30 wood for ${k.built.market ? 20 : 30} gold`,
        effect: { wood: 30, gold: -(k.built.market ? 20 : 30) },
        needs: { gold: k.built.market ? 20 : 30 },
      },
      { label: 'Send them away', effect: {} },
    ],
  }),
  () => ({
    id: 'grain-buyer',
    title: 'Grain buyers',
    icon: '💰',
    text: 'Neighbours will pay well for food.',
    choices: [
      { label: 'Sell 30 food for 40 gold', effect: { food: -30, gold: 40 }, needs: { food: 30 } },
      { label: 'Keep our food', effect: {} },
    ],
  }),
  (_k, sev) => ({
    id: 'blight',
    title: 'Crop blight',
    icon: '🥀',
    text: 'A blight is spreading through the fields.',
    choices: [
      {
        label: `Burn the fields (−${Math.round(20 * sev)} food)`,
        effect: { food: -Math.round(20 * sev) },
      },
      {
        label: `Hire healers (−${Math.round(25 * sev)} gold)`,
        effect: { gold: -Math.round(25 * sev) },
        needs: { gold: Math.round(25 * sev) },
      },
    ],
  }),
  (_k, _sev, raid) => ({
    id: 'raiders',
    title: 'Raiders at the border!',
    icon: '🏴‍☠️',
    text: `A band of raiders (strength ${Math.round(raid)}) demands tribute.`,
    choices: [
      { label: 'Fight them', effect: {}, raid: Math.round(raid) },
      {
        label: `Pay ${Math.round(raid * 3)} gold`,
        effect: { gold: -Math.round(raid * 3) },
        needs: { gold: Math.round(raid * 3) },
      },
    ],
  }),
  () => ({
    id: 'festival',
    title: 'Harvest festival',
    icon: '🎉',
    text: 'The people ask for a feast.',
    choices: [
      {
        label: 'Hold a grand feast (−25 food, +15 joy)',
        effect: { food: -25, happiness: 15 },
        needs: { food: 25 },
      },
      {
        label: 'A modest one (−10 food, +5 joy)',
        effect: { food: -10, happiness: 5 },
        needs: { food: 10 },
      },
      { label: 'No time for parties (−5 joy)', effect: { happiness: -5 } },
    ],
  }),
  () => ({
    id: 'settlers',
    title: 'Settlers arrive',
    icon: '🧳',
    text: 'A group of families asks to join your kingdom.',
    choices: [
      { label: 'Welcome them (+6 people)', effect: { people: 6 } },
      { label: 'Turn them away', effect: {} },
    ],
  }),
  (_k, sev) => ({
    id: 'storm',
    title: 'A terrible storm',
    icon: '⛈️',
    text: 'Roofs are torn off and stores are flooded.',
    choices: [
      {
        label: `Repair with wood (−${Math.round(20 * sev)} wood)`,
        effect: { wood: -Math.round(20 * sev) },
        needs: { wood: Math.round(20 * sev) },
      },
      {
        label: `Let people fend for themselves (−${Math.round(12 * sev)} joy)`,
        effect: { happiness: -Math.round(12 * sev) },
      },
    ],
  }),
  () => ({
    id: 'gold-vein',
    title: 'A glint in the quarry',
    icon: '✨',
    text: 'Quarry workers have found a seam of gold.',
    choices: [
      { label: 'Mine the gold (+35 gold)', effect: { gold: 35 } },
      { label: 'Share it with the workers (+15 gold, +8 joy)', effect: { gold: 15, happiness: 8 } },
    ],
  }),
  () => ({
    id: 'mercenaries',
    title: 'Mercenaries for hire',
    icon: '🗡️',
    text: 'A company of sell-swords offers its services.',
    choices: [
      {
        label: 'Hire 6 soldiers for 35 gold',
        effect: { soldiers: 6, gold: -35 },
        needs: { gold: 35 },
      },
      { label: 'No, thank you', effect: {} },
    ],
  }),
  (_k, sev) => ({
    id: 'sickness',
    title: 'Fever in the village',
    icon: '🤒',
    text: 'A fever is spreading among your people.',
    choices: [
      {
        label: `Quarantine (−${Math.round(3 * sev)} people)`,
        effect: { people: -Math.round(3 * sev) },
      },
      {
        label: `Buy medicine (−${Math.round(30 * sev)} gold)`,
        effect: { gold: -Math.round(30 * sev) },
        needs: { gold: Math.round(30 * sev) },
      },
    ],
  }),
  () => ({
    id: 'forest',
    title: 'The royal forest',
    icon: '🌲',
    text: 'Woodcutters ask to fell the old royal forest.',
    choices: [
      { label: 'Allow it (+40 wood, −5 joy)', effect: { wood: 40, happiness: -5 } },
      { label: 'Protect the forest (+5 joy)', effect: { happiness: 5 } },
    ],
  }),
  () => ({
    id: 'quiet',
    title: 'A quiet season',
    icon: '🌤️',
    text: 'Nothing unusual happens. The people go about their work.',
    choices: [{ label: 'Carry on', effect: {} }],
  }),
];

export function drawEvent(k: Kingdom, difficulty: DifficultySetting): EventCard {
  const t = TUNING[difficulty];
  const rng = createRng(k.seed * 131 + k.turn);
  // Raiders grow bolder as the kingdom grows.
  const raid = (6 + k.turn * 0.9 + k.people * 0.15) * t.raid * (0.8 + rng.next() * 0.4);
  // Raids are more common in summer; the first two seasons are always calm.
  let pick = Math.floor(rng.next() * EVENTS.length);
  if (k.turn <= 2) pick = EVENTS.length - 1;
  else if (seasonOf(k.turn) === 'Summer' && rng.next() < 0.4) pick = 3;
  return EVENTS[pick](k, t.severity, raid);
}

export function choiceAllowed(k: Kingdom, c: Choice) {
  return Object.entries(c.needs ?? {}).every(
    ([r, n]) => (r === 'soldiers' ? k.soldiers : k.res[r as Res]) >= (n as number),
  );
}

export function choose(k: Kingdom, index: number): string | null {
  const ev = k.event;
  const c = ev?.choices[index];
  if (!ev || !c || !choiceAllowed(k, c)) return null;
  for (const [key, n] of Object.entries(c.effect) as [string, number][]) {
    if (key === 'people') k.people = Math.max(1, k.people + n);
    else if (key === 'happiness') k.happiness = clampJoy(k.happiness + n);
    else if (key === 'soldiers') k.soldiers += n;
    else k.res[key as Res] = Math.max(0, k.res[key as Res] + n);
  }
  let msg = `${ev.icon} ${c.label}`;
  if (c.raid !== undefined) {
    const d = defence(k);
    if (d >= c.raid) {
      const loot = 10 + Math.round(c.raid);
      k.res.gold += loot;
      k.soldiers = Math.max(0, k.soldiers - Math.ceil(c.raid / 5));
      k.happiness = clampJoy(k.happiness + 5);
      k.raidsWon += 1;
      msg = `⚔️ Victory! Defence ${d} beat the raiders (${c.raid}). +${loot} gold.`;
    } else {
      const lost = Math.min(k.people - 1, Math.ceil((c.raid - d) / 4));
      k.people -= lost;
      k.soldiers = 0;
      for (const r of ['gold', 'food', 'wood', 'stone'] as Res[])
        k.res[r] = Math.floor(k.res[r] * 0.6);
      k.happiness = clampJoy(k.happiness - 12);
      msg = `🔥 The raiders (${c.raid}) broke through your defence (${d}). Stores plundered, ${lost} people lost.`;
    }
  }
  k.event = null;
  k.log = [msg, ...k.log].slice(0, 6);
  return msg;
}

const clampJoy = (v: number) => Math.max(0, Math.min(100, v));

export function newKingdom(seed: number, difficulty: DifficultySetting): Kingdom {
  const built = Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>;
  built.farm = 2;
  built.lumber = 1;
  built.house = 0;
  const k: Kingdom = {
    turn: 1,
    res: { ...TUNING[difficulty].start },
    people: 10,
    soldiers: 4,
    happiness: 60,
    built,
    tax: 'normal',
    seed,
    event: null,
    over: null,
    log: ['Your reign begins. Build a castle before it ends!'],
    raidsWon: 0,
  };
  k.event = drawEvent(k, difficulty);
  return k;
}

export const TAX: Record<Tax, { gold: number; joy: number; label: string }> = {
  low: { gold: 0.5, joy: 3, label: 'Low' },
  normal: { gold: 1, joy: 0, label: 'Fair' },
  high: { gold: 1.6, joy: -4, label: 'High' },
};

export interface SeasonReport {
  food: number;
  wood: number;
  stone: number;
  gold: number;
  eaten: number;
  born: number;
  joy: number;
}

/** Ends the season: production, eating, growth, mood, then the next event. */
export function endSeason(k: Kingdom, difficulty: DifficultySetting): SeasonReport {
  const season = seasonOf(k.turn);
  const s = staffed(k);
  const food = s.farm * FARM_YIELD[season];
  const wood = s.lumber * (season === 'Winter' ? 3 : 5);
  const stone = s.quarry * 4;
  const gold = Math.round(k.people * TAX[k.tax].gold * 0.5) + s.market * 6;
  k.res.food += food;
  k.res.wood += wood;
  k.res.stone += stone;
  k.res.gold += gold;
  k.soldiers += s.barracks * 2;
  const eaten = Math.ceil((k.people + k.soldiers * 0.5) * EAT);
  k.res.food -= eaten;
  let joy = TAX[k.tax].joy + s.temple * 3;
  let born = 0;
  if (k.res.food < 0) {
    // Starvation: people leave and the mood collapses.
    const leave = Math.min(k.people, Math.ceil(-k.res.food / 3));
    k.people -= leave;
    born = -leave;
    k.res.food = 0;
    joy -= 12;
  } else if (k.people < housing(k) && k.happiness >= 30) {
    born = Math.min(housing(k) - k.people, 2 + Math.floor(k.people / 10));
    k.people += born;
  } else if (k.people >= housing(k)) joy -= 2;
  k.happiness = clampJoy(k.happiness + joy);
  k.turn += 1;
  if (k.people <= 0) k.over = 'starved';
  else if (k.happiness <= 0) k.over = 'revolt';
  else if (k.turn > TUNING[difficulty].years * 4) k.over = 'time';
  if (!k.over) k.event = drawEvent(k, difficulty);
  return { food, wood, stone, gold, eaten, born, joy };
}

export function score(k: Kingdom, difficulty: DifficultySetting) {
  const left = Math.max(0, TUNING[difficulty].years * 4 + 1 - k.turn);
  return (k.over === 'won' ? 1000 + left * 40 : 0) + k.people * 5 + k.raidsWon * 25;
}

/**
 * A plain steward used by the balance tests: keeps food positive, grows
 * housing and industry, then saves up for the castle.
 */
export function botTurn(k: Kingdom, difficulty: DifficultySetting) {
  if (k.event) {
    // Pick the first allowed choice that does not fight a losing battle, preferring gains.
    const scored = k.event.choices
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => choiceAllowed(k, c))
      .map(({ c, i }) => {
        const e = c.effect;
        let v =
          (e.gold ?? 0) +
          (e.wood ?? 0) +
          (e.stone ?? 0) * 1.2 +
          (e.food ?? 0) * 0.8 +
          (e.people ?? 0) * 6 +
          (e.happiness ?? 0) * 2 +
          (e.soldiers ?? 0) * 3;
        if (c.raid !== undefined) v = defence(k) >= c.raid ? 30 : -200;
        if ((e.food ?? 0) < 0 && k.res.food + (e.food ?? 0) < k.people * 2) v -= 100;
        return { i, v };
      })
      .sort((a, b) => b.v - a.v);
    choose(k, scored[0].i);
  }
  k.tax = k.happiness > 70 ? 'high' : k.happiness < 45 ? 'low' : 'normal';
  const want = (id: BuildingId) => canBuild(k, id) && build(k, id);
  const late = k.turn > TUNING[difficulty].years * 2;
  for (let guard = 0; guard < 8; guard++) {
    if (canBuild(k, 'castle')) return void build(k, 'castle');
    const st = staffed(k);
    const idle = k.people - workersUsed(k);
    const foodPerSeason = st.farm * 5.75 - (k.people + k.soldiers * 0.5);
    const threat = 8 + k.turn * 1.1 + k.people * 0.2;
    if (foodPerSeason < 1 && idle >= 3 && want('farm')) continue;
    if (!late && k.people >= housing(k) - 2 && want('house')) continue;
    if (k.happiness < 45 && k.built.temple < 1 && want('temple')) continue;
    if (idle >= 2 && k.built.lumber < 3 && want('lumber')) continue;
    if (idle >= 2 && k.built.quarry < 2 && want('quarry')) continue;
    if (idle >= 2 && k.built.market < 1 && want('market')) continue;
    if (idle >= 2 && k.built.barracks < 1 && k.turn > 4 && want('barracks')) continue;
    if (defence(k) < threat && k.built.walls < 3 && k.res.stone >= 60 && want('walls')) continue;
    if (idle >= 2 && k.built.quarry < 5 && want('quarry')) continue;
    if (idle >= 2 && k.built.lumber < 6 && want('lumber')) continue;
    if (idle >= 2 && k.built.market < 3 && want('market')) continue;
    if (late && k.res.gold > 200 + TRADE.wood && k.res.wood < 120 && trade(k, 'wood')) continue;
    if (late && k.res.gold > 200 + TRADE.stone && k.res.stone < 160 && trade(k, 'stone')) continue;
    break;
  }
  endSeason(k, difficulty);
}

const BIDS = BUILDINGS.map((b) => b.id);
export function validKingdom(v: unknown): v is Kingdom {
  if (!v || typeof v !== 'object') return false;
  const k = v as Kingdom;
  const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  return (
    Number.isInteger(k.turn) &&
    k.turn >= 1 &&
    !!k.res &&
    (['gold', 'food', 'wood', 'stone'] as Res[]).every((r) => num(k.res[r]) && k.res[r] >= 0) &&
    num(k.people) &&
    num(k.soldiers) &&
    num(k.happiness) &&
    !!k.built &&
    BIDS.every((b) => Number.isInteger(k.built[b]) && k.built[b] >= 0) &&
    (k.tax === 'low' || k.tax === 'normal' || k.tax === 'high') &&
    num(k.seed) &&
    k.over === null &&
    (k.event === null || (typeof k.event === 'object' && Array.isArray(k.event.choices)))
  );
}
