import { SUITS, buildDeck, cardColor, shuffleDeck } from '../_shared/cards/deck';
import type { Card, Suit } from '../_shared/cards/deck';

export interface FCState {
  cascades: Card[][];
  cells: (Card | null)[];
  /** Foundations keyed by suit. */
  foundations: Record<Suit, Card[]>;
  moves: number;
}
export type Source = { kind: 'cascade'; pile: number; index: number } | { kind: 'cell'; pile: number };
export type Dest = { kind: 'cascade' | 'cell' | 'foundation'; pile: number | Suit };

export function deal(cells = 4, rand: () => number = Math.random): FCState {
  const deck = shuffleDeck(buildDeck(1, true), rand);
  const cascades: Card[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((c, i) => cascades[i % 8].push(c));
  return { cascades, cells: Array(cells).fill(null), foundations: { spades: [], hearts: [], diamonds: [], clubs: [] }, moves: 0 };
}

export const stacks = (lower: Card, upper: Card) => upper.rank === lower.rank - 1 && cardColor(upper.suit) !== cardColor(lower.suit);

/** True if cards[i..] form an alternating-colour descending run. */
export function isRun(cards: Card[], from: number): boolean {
  for (let k = from; k < cards.length - 1; k++) if (!stacks(cards[k], cards[k + 1])) return false;
  return true;
}

/** Largest run that can move at once with the free cells and empty columns available. */
export function maxRun(s: FCState, toEmptyColumn: boolean): number {
  const free = s.cells.filter((c) => !c).length;
  const empty = s.cascades.filter((c) => !c.length).length - (toEmptyColumn ? 1 : 0);
  return (free + 1) * 2 ** Math.max(0, empty);
}

const foundationTop = (s: FCState, suit: Suit) => s.foundations[suit].length;

function picked(s: FCState, src: Source): Card[] {
  if (src.kind === 'cell') {
    const c = s.cells[src.pile];
    return c ? [c] : [];
  }
  return s.cascades[src.pile].slice(src.index);
}

/** Applies a move, or returns null if it is illegal. */
export function move(s: FCState, src: Source, dest: Dest): FCState | null {
  const cards = picked(s, src);
  if (!cards.length) return null;
  if (src.kind === 'cascade' && !isRun(s.cascades[src.pile], src.index)) return null;
  const first = cards[0];
  const next: FCState = {
    cascades: s.cascades.map((c) => [...c]),
    cells: [...s.cells],
    foundations: { ...s.foundations },
    moves: s.moves + 1,
  };
  if (dest.kind === 'foundation') {
    if (cards.length !== 1) return null;
    const suit = first.suit;
    if (foundationTop(s, suit) !== first.rank - 1) return null;
    next.foundations[suit] = [...s.foundations[suit], first];
  } else if (dest.kind === 'cell') {
    const i = dest.pile as number;
    if (cards.length !== 1 || s.cells[i]) return null;
    next.cells[i] = first;
  } else {
    const i = dest.pile as number;
    if (src.kind === 'cascade' && src.pile === i) return null;
    const target = s.cascades[i];
    if (target.length && !stacks(target[target.length - 1], first)) return null;
    if (cards.length > maxRun(s, !target.length)) return null;
    next.cascades[i] = [...target, ...cards];
  }
  if (src.kind === 'cell') next.cells[src.pile] = null;
  else next.cascades[src.pile] = s.cascades[src.pile].slice(0, src.index);
  return next;
}

/**
 * A card is safe to send home automatically once both foundations of the
 * other colour are high enough that nothing could still need it.
 */
export function autoPlay(s: FCState): { state: FCState; moved: number } {
  let state = s;
  let moved = 0;
  for (;;) {
    let progress = false;
    const safe = (c: Card) => {
      if (foundationTop(state, c.suit) !== c.rank - 1) return false;
      if (c.rank <= 2) return true;
      const others = SUITS.filter((x) => cardColor(x) !== cardColor(c.suit));
      return others.every((x) => foundationTop(state, x) >= c.rank - 1);
    };
    for (let i = 0; i < state.cells.length && !progress; i++) {
      const c = state.cells[i];
      if (c && safe(c)) {
        state = move(state, { kind: 'cell', pile: i }, { kind: 'foundation', pile: c.suit }) as FCState;
        progress = true;
      }
    }
    for (let i = 0; i < 8 && !progress; i++) {
      const col = state.cascades[i];
      const c = col[col.length - 1];
      if (c && safe(c)) {
        state = move(state, { kind: 'cascade', pile: i, index: col.length - 1 }, { kind: 'foundation', pile: c.suit }) as FCState;
        progress = true;
      }
    }
    if (!progress) break;
    moved++;
  }
  // Automatic moves don't count against the player.
  return { state: { ...state, moves: s.moves }, moved };
}

export const won = (s: FCState) => SUITS.every((x) => s.foundations[x].length === 13);

/** A useful legal move, preferring foundations, then building on cascades. */
export function hint(s: FCState): { src: Source; dest: Dest } | null {
  const sources: Source[] = [];
  s.cells.forEach((c, i) => c && sources.push({ kind: 'cell', pile: i }));
  s.cascades.forEach((col, i) => {
    for (let k = col.length - 1; k >= 0 && isRun(col, k); k--) sources.push({ kind: 'cascade', pile: i, index: k });
  });
  for (const src of sources) {
    const c = picked(s, src)[0];
    if (move(s, src, { kind: 'foundation', pile: c.suit })) return { src, dest: { kind: 'foundation', pile: c.suit } };
  }
  for (const src of sources) {
    for (let i = 0; i < 8; i++) {
      if (!s.cascades[i].length) continue;
      // Skip moves that just shuffle a run between two identical positions.
      if (src.kind === 'cascade' && src.index === 0) continue;
      if (move(s, src, { kind: 'cascade', pile: i })) return { src, dest: { kind: 'cascade', pile: i } };
    }
  }
  return null;
}
