import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Hotel Manager: a booking-calendar game over 30 nights.
 *
 * Each morning booking requests arrive for the next few nights. Accept a
 * request by placing it in a free room of the right type (or better) on the
 * calendar; a long cheap stay might block a better offer tomorrow. Rooms
 * must be cleaned after every check-out — housekeepers clean three rooms a
 * day each — and guests who walk into a dirty room leave bad reviews. Your
 * rating decides how many requests you get and how much guests offer.
 */
export type RoomType = 'standard' | 'deluxe' | 'suite';
export const ROOM_RANK: Record<RoomType, number> = { standard: 0, deluxe: 1, suite: 2 };
export const ROOM_INFO: Record<
  RoomType,
  { name: string; icon: string; rate: number; upkeep: number }
> = {
  standard: { name: 'Standard', icon: '🛏️', rate: 60, upkeep: 8 },
  deluxe: { name: 'Deluxe', icon: '🛋️', rate: 100, upkeep: 14 },
  suite: { name: 'Suite', icon: '👑', rate: 170, upkeep: 24 },
};

export const NIGHTS = 30;
export const CLEAN_PER_KEEPER = 3;
export const WINDOW = 7;

export interface Booking {
  guest: string;
  from: number;
  /** Exclusive: the guest checks out on the morning of `to`. */
  to: number;
  rate: number;
  wanted: RoomType;
}

export interface Room {
  type: RoomType;
  clean: boolean;
  bookings: Booking[];
}

export interface Request extends Booking {
  id: number;
  note: string;
}

export interface Hotel {
  day: number;
  cash: number;
  rooms: Room[];
  keepers: number;
  requests: Request[];
  reviews: number[];
  nextId: number;
  seed: number;
  amenities: AmenityId[];
  earned: number;
  guests: number;
  log: string[];
  savedAt?: number;
}

export type AmenityId = 'cafe' | 'pool' | 'spa';
export const AMENITIES: {
  id: AmenityId;
  name: string;
  icon: string;
  desc: string;
  cost: number;
}[] = [
  { id: 'cafe', name: 'Café', icon: '☕', desc: '+12 coins from every guest night.', cost: 600 },
  { id: 'pool', name: 'Pool', icon: '🏊', desc: 'Every review half a star better.', cost: 900 },
  { id: 'spa', name: 'Spa', icon: '💆', desc: 'Guests offer 15% more.', cost: 1200 },
];

export const BUILD: Record<RoomType, number> = { standard: 500, deluxe: 900, suite: 1600 };
export const RENOVATE: Partial<Record<RoomType, number>> = { standard: 450, deluxe: 800 };
export const MAX_ROOMS = 10;

export interface Tuning {
  cash: number;
  goal: number;
  /** Average requests per day at a 3-star rating. */
  demand: number;
  /** How much the offered rate swings either side of the list price. */
  swing: number;
  wage: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { cash: 600, goal: 4400, demand: 5.5, swing: 0.15, wage: 25 },
  normal: { cash: 400, goal: 4700, demand: 5, swing: 0.25, wage: 30 },
  hard: { cash: 300, goal: 4800, demand: 4.8, swing: 0.35, wage: 35 },
};

const NAMES = [
  'Ada',
  'Bo',
  'Cy',
  'Dee',
  'Eli',
  'Fay',
  'Gus',
  'Hal',
  'Ivy',
  'Jo',
  'Kai',
  'Lu',
  'Mo',
  'Nia',
  'Oz',
  'Pip',
  'Quin',
  'Ray',
  'Sol',
  'Tess',
  'Uma',
  'Vic',
  'Wren',
  'Xan',
  'Yui',
  'Zed',
];
const NOTES = [
  'Business trip',
  'Weekend away',
  'Family visit',
  'Conference',
  'Honeymoon',
  'Road trip',
  'Concert in town',
  'Holiday',
];

export function newHotel(seed: number, difficulty: DifficultySetting): Hotel {
  const h: Hotel = {
    day: 1,
    cash: TUNING[difficulty].cash,
    rooms: [
      { type: 'standard', clean: true, bookings: [] },
      { type: 'standard', clean: true, bookings: [] },
      { type: 'standard', clean: true, bookings: [] },
      { type: 'deluxe', clean: true, bookings: [] },
    ],
    keepers: 1,
    requests: [],
    reviews: [4, 4, 3],
    nextId: 1,
    seed,
    amenities: [],
    earned: 0,
    guests: 0,
    log: [],
  };
  h.requests = makeRequests(h, difficulty);
  return h;
}

export const rating = (h: Hotel) => {
  const r = h.reviews.slice(-20);
  return r.reduce((a, b) => a + b, 0) / r.length;
};

export function makeRequests(h: Hotel, difficulty: DifficultySetting): Request[] {
  const t = TUNING[difficulty];
  const rng = createRng(h.seed * 977 + h.day);
  const stars = rating(h);
  const weekend = h.day % 7 === 5 || h.day % 7 === 6;
  const count = Math.max(
    1,
    Math.round(t.demand * (0.5 + stars / 6) * (weekend ? 1.3 : 1) + (rng.next() - 0.5)),
  );
  const out: Request[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng.next();
    const wanted: RoomType = roll < 0.6 ? 'standard' : roll < 0.9 ? 'deluxe' : 'suite';
    const from = h.day + Math.floor(rng.next() * 4);
    const nights = 1 + Math.floor(rng.next() * rng.next() * 6);
    const factor =
      (1 + (rng.next() * 2 - 1) * t.swing) *
      (0.75 + stars / 12) *
      (h.amenities.includes('spa') ? 1.15 : 1);
    out.push({
      id: h.nextId++,
      guest: NAMES[Math.floor(rng.next() * NAMES.length)],
      note: NOTES[Math.floor(rng.next() * NOTES.length)],
      from,
      to: Math.min(NIGHTS + 1, from + nights),
      rate: Math.round(ROOM_INFO[wanted].rate * factor),
      wanted,
    });
  }
  return out.filter((r) => r.to > r.from);
}

export const occupant = (room: Room, night: number) =>
  room.bookings.find((b) => b.from <= night && night < b.to) ?? null;

export function fits(h: Hotel, roomIndex: number, req: Booking) {
  const room = h.rooms[roomIndex];
  if (ROOM_RANK[room.type] < ROOM_RANK[req.wanted]) return false;
  for (let n = req.from; n < req.to; n++) if (occupant(room, n)) return false;
  return true;
}

export function accept(h: Hotel, requestId: number, roomIndex: number) {
  const req = h.requests.find((r) => r.id === requestId);
  if (!req || !fits(h, roomIndex, req)) return false;
  h.rooms[roomIndex].bookings.push({
    guest: req.guest,
    from: req.from,
    to: req.to,
    rate: req.rate,
    wanted: req.wanted,
  });
  h.requests = h.requests.filter((r) => r.id !== requestId);
  return true;
}

export function decline(h: Hotel, requestId: number) {
  h.requests = h.requests.filter((r) => r.id !== requestId);
}

export const wages = (h: Hotel, difficulty: DifficultySetting) =>
  h.keepers * TUNING[difficulty].wage;
export const upkeep = (h: Hotel) => h.rooms.reduce((a, r) => a + ROOM_INFO[r.type].upkeep, 0);

/** Rooms that need cleaning before tonight's arrivals. */
export function dirtyArrivals(h: Hotel) {
  return h.rooms.filter((r) => !r.clean && r.bookings.some((b) => b.from === h.day)).length;
}

export interface NightReport {
  income: number;
  costs: number;
  reviews: number[];
  dirty: number;
}

/**
 * Ends the day: housekeepers clean (arrivals first), guests arrive and stay,
 * reviews come in from guests who check out tomorrow morning, and money moves.
 */
export function endDay(h: Hotel, difficulty: DifficultySetting): NightReport {
  const night = h.day;
  // Clean: rooms with an arrival tonight first, then any other dirty room.
  let capacity = h.keepers * CLEAN_PER_KEEPER;
  const order = h.rooms
    .map((r, i) => ({ r, i, arriving: r.bookings.some((b) => b.from === night) }))
    .filter((x) => !x.r.clean)
    .sort((a, b) => Number(b.arriving) - Number(a.arriving));
  for (const x of order) {
    if (capacity <= 0) break;
    x.r.clean = true;
    capacity--;
  }
  let income = 0;
  let dirty = 0;
  const reviews: number[] = [];
  for (const room of h.rooms) {
    const b = occupant(room, night);
    if (!b) continue;
    if (b.from === night) {
      h.guests++;
      if (!room.clean) {
        dirty++;
        (b as Booking & { grumpy?: boolean }).grumpy = true;
      }
      room.clean = false;
    }
    income += b.rate + (h.amenities.includes('cafe') ? 12 : 0);
    if (b.to === night + 1) {
      const grumpy = (b as Booking & { grumpy?: boolean }).grumpy;
      let stars = grumpy ? 1.5 : 3.5 + (ROOM_RANK[room.type] - ROOM_RANK[b.wanted]) * 0.75;
      if (h.amenities.includes('pool')) stars += 0.5;
      reviews.push(Math.max(1, Math.min(5, stars)));
    }
  }
  const costs = wages(h, difficulty) + upkeep(h);
  h.cash += income - costs;
  h.earned += income;
  h.reviews.push(...reviews);
  // Drop finished bookings and requests for nights that have passed.
  for (const room of h.rooms) room.bookings = room.bookings.filter((b) => b.to > night + 1);
  h.day += 1;
  h.requests = h.requests.filter((r) => r.from >= h.day);
  if (h.day <= NIGHTS) h.requests.push(...makeRequests(h, difficulty));
  h.log = [
    `Night ${night}: +${income} from guests, −${costs} wages & upkeep${dirty ? `, ${dirty} guest${dirty > 1 ? 's' : ''} found a dirty room!` : ''}`,
  ];
  return { income, costs, reviews, dirty };
}

export function hire(h: Hotel, delta: 1 | -1) {
  const n = h.keepers + delta;
  if (n < 0 || n > 5) return false;
  h.keepers = n;
  return true;
}

export function buildRoom(h: Hotel, type: RoomType) {
  if (h.rooms.length >= MAX_ROOMS || h.cash < BUILD[type]) return false;
  h.cash -= BUILD[type];
  h.rooms.push({ type, clean: true, bookings: [] });
  return true;
}

export function renovate(h: Hotel, i: number) {
  const room = h.rooms[i];
  const cost = RENOVATE[room.type];
  if (cost === undefined || h.cash < cost) return false;
  h.cash -= cost;
  room.type = room.type === 'standard' ? 'deluxe' : 'suite';
  return true;
}

export function buyAmenity(h: Hotel, id: AmenityId) {
  const a = AMENITIES.find((x) => x.id === id)!;
  if (h.amenities.includes(id) || h.cash < a.cost) return false;
  h.cash -= a.cost;
  h.amenities.push(id);
  return true;
}

/** Simple greedy manager used by the balance tests. */
export function botDay(h: Hotel) {
  const reqs = [...h.requests].sort((a, b) => b.rate - a.rate);
  for (const r of reqs) {
    const rooms = h.rooms
      .map((room, i) => ({ room, i }))
      .filter(({ i }) => fits(h, i, r))
      .sort((a, b) => ROOM_RANK[a.room.type] - ROOM_RANK[b.room.type]);
    if (rooms.length) accept(h, r.id, rooms[0].i);
  }
  const arrivals = h.rooms.filter(
    (r) => r.bookings.some((b) => b.from === h.day) && !r.clean,
  ).length;
  const dirtyRooms = h.rooms.filter((r) => !r.clean).length;
  const need = Math.max(
    arrivals > 0 ? 1 : 0,
    Math.ceil(Math.max(arrivals, dirtyRooms * 0.7) / CLEAN_PER_KEEPER),
  );
  h.keepers = Math.min(5, Math.max(need, 0));
  if (h.day < 22) {
    if (h.cash > 1500 && h.rooms.length < MAX_ROOMS) buildRoom(h, 'deluxe');
    else if (h.cash > 1100 && h.rooms.length < MAX_ROOMS) buildRoom(h, 'standard');
    if (h.cash > 1400 && !h.amenities.includes('cafe')) buyAmenity(h, 'cafe');
    if (h.cash > 1400 && h.rooms.length >= 7 && !h.amenities.includes('pool'))
      buyAmenity(h, 'pool');
  }
}

const TYPES = Object.keys(ROOM_INFO);
export function validHotel(v: unknown): v is Hotel {
  if (!v || typeof v !== 'object') return false;
  const h = v as Hotel;
  const okBooking = (b: Booking) =>
    !!b &&
    typeof b.guest === 'string' &&
    Number.isInteger(b.from) &&
    Number.isInteger(b.to) &&
    Number.isFinite(b.rate) &&
    TYPES.includes(b.wanted);
  return (
    Number.isInteger(h.day) &&
    h.day >= 1 &&
    h.day <= NIGHTS + 1 &&
    Number.isFinite(h.cash) &&
    Array.isArray(h.rooms) &&
    h.rooms.length >= 1 &&
    h.rooms.length <= MAX_ROOMS &&
    h.rooms.every(
      (r) =>
        TYPES.includes(r.type) &&
        typeof r.clean === 'boolean' &&
        Array.isArray(r.bookings) &&
        r.bookings.every(okBooking),
    ) &&
    Number.isInteger(h.keepers) &&
    Array.isArray(h.requests) &&
    h.requests.every((r) => okBooking(r) && Number.isInteger(r.id)) &&
    Array.isArray(h.reviews) &&
    h.reviews.length > 0 &&
    h.reviews.every(Number.isFinite) &&
    Array.isArray(h.amenities) &&
    h.amenities.every((a) => AMENITIES.some((x) => x.id === a)) &&
    Number.isFinite(h.seed)
  );
}
