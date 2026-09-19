/**
 * Color Match: an original four-colour shedding game. 108 cards — per colour
 * one 0, two each of 1–9, Skip, Reverse and +2; plus four Wild and four
 * Wild +4 cards.
 */
export type Color = 'red' | 'yellow' | 'green' | 'blue';
export type Value = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
export interface CMCard {
  id: string;
  color: Color | 'wild';
  value: Value;
}
export const COLORS: Color[] = ['red', 'yellow', 'green', 'blue'];

export function buildDeck(): CMCard[] {
  const cards: CMCard[] = [];
  let n = 0;
  const add = (color: CMCard['color'], value: Value) => cards.push({ id: `cm${n++}`, color, value });
  for (const color of COLORS) {
    add(color, '0');
    for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'] as Value[]) {
      add(color, v);
      add(color, v);
    }
  }
  for (let k = 0; k < 4; k++) {
    add('wild', 'wild');
    add('wild', 'wild4');
  }
  return cards;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface CMState {
  hands: CMCard[][];
  stock: CMCard[];
  discard: CMCard[];
  color: Color;
  turn: number;
  dir: 1 | -1;
  drew: boolean;
}

export function deal(players: number, rand: () => number = Math.random): CMState {
  let d = shuffle(buildDeck(), rand);
  const hands = Array.from({ length: players }, (_, p) => d.slice(p * 7, p * 7 + 7));
  d = d.slice(players * 7);
  const firstIdx = d.findIndex((c) => /^\d$/.test(c.value));
  const first = d[firstIdx];
  d.splice(firstIdx, 1);
  return { hands, stock: d, discard: [first], color: first.color as Color, turn: 0, dir: 1, drew: false };
}

export const top = (s: CMState) => s.discard[s.discard.length - 1];
export const canPlay = (s: CMState, c: CMCard) => c.color === 'wild' || c.color === s.color || c.value === top(s).value;
export const seatAfter = (s: CMState, steps = 1) => (((s.turn + s.dir * steps) % s.hands.length) + s.hands.length) % s.hands.length;

function drawInto(s: CMState, seat: number, count: number, rand: () => number): CMState {
  let stock = [...s.stock];
  let discard = s.discard;
  const hands = s.hands.map((h) => [...h]);
  for (let k = 0; k < count; k++) {
    if (!stock.length) {
      if (discard.length <= 1) break;
      stock = shuffle(discard.slice(0, -1), rand);
      discard = discard.slice(-1);
    }
    hands[seat].push(stock.shift() as CMCard);
  }
  return { ...s, hands, stock, discard };
}

/** Plays a card and applies its effect. `chosen` is the colour named for a wild. */
export function playCard(s: CMState, card: CMCard, chosen?: Color, rand: () => number = Math.random): CMState {
  const hands = s.hands.map((h, i) => (i === s.turn ? h.filter((c) => c.id !== card.id) : h));
  let next: CMState = { ...s, hands, discard: [...s.discard, card], color: card.color === 'wild' ? (chosen ?? 'red') : card.color, drew: false };
  const two = s.hands.length === 2;
  if (card.value === 'reverse') {
    next.dir = (s.dir * -1) as 1 | -1;
    next.turn = two ? s.turn : seatAfter(next);
    return next;
  }
  if (card.value === 'skip') return { ...next, turn: seatAfter(s, 2) };
  if (card.value === 'draw2' || card.value === 'wild4') {
    const victim = seatAfter(s);
    next = drawInto(next, victim, card.value === 'draw2' ? 2 : 4, rand);
    return { ...next, turn: seatAfter(s, 2) };
  }
  return { ...next, turn: seatAfter(s) };
}

export function drawCard(s: CMState, rand: () => number = Math.random): CMState {
  return { ...drawInto(s, s.turn, 1, rand), drew: true };
}

export function pass(s: CMState): CMState {
  return { ...s, turn: seatAfter(s), drew: false };
}

/** Penalty for forgetting to call "One!": draw two. */
export function penalty(s: CMState, seat: number, rand: () => number = Math.random): CMState {
  return drawInto(s, seat, 2, rand);
}

export const cardPoints = (c: CMCard) => (c.color === 'wild' ? 50 : /^\d$/.test(c.value) ? Number(c.value) : 20);

export function bestColor(hand: CMCard[]): Color {
  const counts = COLORS.map((col) => hand.filter((c) => c.color === col).length);
  return COLORS[counts.indexOf(Math.max(...counts))];
}

export type Level = 'easy' | 'normal' | 'hard';

export function choose(s: CMState, level: Level, rand: () => number = Math.random): { card: CMCard; color?: Color } | null {
  const hand = s.hands[s.turn];
  const options = hand.filter((c) => canPlay(s, c));
  if (!options.length) return null;
  const withColor = (card: CMCard) => ({ card, color: card.color === 'wild' ? (level === 'easy' ? COLORS[Math.floor(rand() * 4)] : bestColor(hand.filter((c) => c.id !== card.id))) : undefined });
  if (level === 'easy') return withColor(options[Math.floor(rand() * options.length)]);
  const nextCount = s.hands[seatAfter(s)].length;
  const score = (c: CMCard) => {
    let v = cardPoints(c);
    if (c.color === 'wild') v = hand.length <= 2 ? 100 : -40; // save wilds unless finishing
    if ((c.value === 'draw2' || c.value === 'wild4' || c.value === 'skip') && nextCount <= 2) v += 60;
    if (level === 'hard' && c.color !== 'wild') v += hand.filter((x) => x.color === c.color).length * 3;
    return v;
  };
  return withColor([...options].sort((a, b) => score(b) - score(a))[0]);
}
