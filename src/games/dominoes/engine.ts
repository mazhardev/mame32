/** Draw dominoes with a double-six set, two players. */
export type Tile = [number, number];
export type End = 'L' | 'R';

export interface DominoState {
  hands: [Tile[], Tile[]];
  boneyard: Tile[];
  /** Played tiles, left to right, each oriented so neighbours touch. */
  chain: Tile[];
  turn: 0 | 1;
  passes: number;
}

export function fullSet(): Tile[] {
  const out: Tile[] = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) out.push([a, b]);
  return out;
}

export const pips = (hand: Tile[]) => hand.reduce((s, [a, b]) => s + a + b, 0);
export const isDouble = (t: Tile) => t[0] === t[1];
export const ends = (chain: Tile[]): [number, number] | null => (chain.length ? [chain[0][0], chain[chain.length - 1][1]] : null);

/** Deals seven tiles each. The holder of the highest double (or highest tile) leads. */
export function deal(rand: () => number = Math.random): DominoState {
  const set = fullSet();
  for (let i = set.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [set[i], set[j]] = [set[j], set[i]];
  }
  const hands: [Tile[], Tile[]] = [set.slice(0, 7), set.slice(7, 14)];
  const rank = (t: Tile) => (isDouble(t) ? 100 + t[0] : t[0] + t[1]);
  const best = (h: Tile[]) => Math.max(...h.map(rank));
  return { hands, boneyard: set.slice(14), chain: [], turn: best(hands[0]) >= best(hands[1]) ? 0 : 1, passes: 0 };
}

/** The ends a tile can be played on (both when the chain is empty or they match). */
export function playableEnds(chain: Tile[], t: Tile): End[] {
  const e = ends(chain);
  if (!e) return ['L'];
  const out: End[] = [];
  if (t[0] === e[0] || t[1] === e[0]) out.push('L');
  if (t[0] === e[1] || t[1] === e[1]) out.push('R');
  return out;
}

export const canMove = (s: DominoState, p: 0 | 1) => s.hands[p].some((t) => playableEnds(s.chain, t).length > 0);

export function place(s: DominoState, index: number, end: End): DominoState {
  const p = s.turn;
  const t = s.hands[p][index];
  const e = ends(s.chain);
  let chain: Tile[];
  if (!e) chain = [t];
  else if (end === 'L') chain = [t[1] === e[0] ? t : ([t[1], t[0]] as Tile), ...s.chain];
  else chain = [...s.chain, t[0] === e[1] ? t : ([t[1], t[0]] as Tile)];
  const hands = [...s.hands] as [Tile[], Tile[]];
  hands[p] = hands[p].filter((_, i) => i !== index);
  return { ...s, hands, chain, turn: p === 0 ? 1 : 0, passes: 0 };
}

/** Draws one tile for the side to move. */
export function draw(s: DominoState): DominoState {
  if (!s.boneyard.length) return s;
  const hands = [...s.hands] as [Tile[], Tile[]];
  hands[s.turn] = [...hands[s.turn], s.boneyard[0]];
  return { ...s, hands, boneyard: s.boneyard.slice(1) };
}

export function pass(s: DominoState): DominoState {
  return { ...s, turn: s.turn === 0 ? 1 : 0, passes: s.passes + 1 };
}

export interface RoundResult {
  winner: 0 | 1 | null;
  points: number;
  blocked: boolean;
}

/** Null while the round is still going. */
export function roundResult(s: DominoState): RoundResult | null {
  for (const p of [0, 1] as const) {
    if (!s.hands[p].length) return { winner: p, points: pips(s.hands[p === 0 ? 1 : 0]), blocked: false };
  }
  if (s.passes >= 2) {
    const a = pips(s.hands[0]);
    const b = pips(s.hands[1]);
    if (a === b) return { winner: null, points: 0, blocked: true };
    return { winner: a < b ? 0 : 1, points: Math.abs(a - b), blocked: true };
  }
  return null;
}

export type Level = 'easy' | 'normal' | 'hard';

/**
 * Computer strategy. Easy: any legal tile. Normal: shed the heaviest tile.
 * Hard: also favours keeping many different numbers in hand, and playing
 * ends the opponent has recently been unable to match.
 */
export function chooseTile(s: DominoState, level: Level, avoid: Set<number> = new Set(), rand: () => number = Math.random): { index: number; end: End } | null {
  const hand = s.hands[s.turn];
  const options: { index: number; end: End; value: number }[] = [];
  hand.forEach((t, index) => {
    for (const end of playableEnds(s.chain, t)) {
      let value = level === 'easy' ? rand() : t[0] + t[1] + (isDouble(t) ? 2 : 0);
      if (level === 'hard') {
        const rest = hand.filter((_, i) => i !== index);
        const suits = new Set(rest.flatMap(([a, b]) => [a, b]));
        value += suits.size * 1.5;
        const next = place({ ...s }, index, end);
        const e = ends(next.chain);
        if (e && avoid.has(e[0])) value += 4;
        if (e && avoid.has(e[1])) value += 4;
      }
      options.push({ index, end, value });
    }
  });
  if (!options.length) return null;
  options.sort((a, b) => b.value - a.value);
  return { index: options[0].index, end: options[0].end };
}
