/**
 * Chess rules engine. Squares run 0 (a8) … 63 (h1). Pieces are signed:
 * positive for White, negative for Black, magnitude 1–6 = P N B R Q K.
 *
 * Moves are packed integers: from | to << 6 | promo << 12 | flags << 15,
 * which keeps the search fast and allocation-free.
 */
export const P = 1;
export const N = 2;
export const B = 3;
export const R = 4;
export const Q = 5;
export const K = 6;
export type Side = 1 | -1;

export const FLAG_EP = 1;
export const FLAG_CASTLE = 2;
export const FLAG_DOUBLE = 4;

export const moveFrom = (m: number) => m & 63;
export const moveTo = (m: number) => (m >> 6) & 63;
export const movePromo = (m: number) => (m >> 12) & 7;
export const moveFlags = (m: number) => (m >> 15) & 7;
const pack = (from: number, to: number, promo = 0, flags = 0) => from | (to << 6) | (promo << 12) | (flags << 15);

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const squareName = (sq: number) => `${'abcdefgh'[sq & 7]}${8 - (sq >> 3)}`;
export const parseSquare = (s: string) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);

// Precomputed attack tables.
const inside = (r: number, f: number) => r >= 0 && r < 8 && f >= 0 && f < 8;
function targets(deltas: [number, number][]): number[][] {
  return Array.from({ length: 64 }, (_, sq) =>
    deltas.map(([dr, df]) => [(sq >> 3) + dr, (sq & 7) + df]).filter(([r, f]) => inside(r, f)).map(([r, f]) => r * 8 + f),
  );
}
const KNIGHT = targets([
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
]);
const KING = targets([
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]);
const ORTHO: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIAG: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
function rays(dirs: [number, number][]): number[][][] {
  return Array.from({ length: 64 }, (_, sq) =>
    dirs.map(([dr, df]) => {
      const out: number[] = [];
      let r = (sq >> 3) + dr;
      let f = (sq & 7) + df;
      while (inside(r, f)) {
        out.push(r * 8 + f);
        r += dr;
        f += df;
      }
      return out;
    }),
  );
}
const ORTHO_RAYS = rays(ORTHO);
const DIAG_RAYS = rays(DIAG);

const CASTLE_MASK = new Array<number>(64).fill(15);
CASTLE_MASK[63] = 15 & ~1;
CASTLE_MASK[56] = 15 & ~2;
CASTLE_MASK[7] = 15 & ~4;
CASTLE_MASK[0] = 15 & ~8;
CASTLE_MASK[60] = 15 & ~3;
CASTLE_MASK[4] = 15 & ~12;

interface Undo {
  move: number;
  captured: number;
  castling: number;
  ep: number;
  half: number;
}

export type Status = 'play' | 'checkmate' | 'stalemate' | 'fifty' | 'repetition' | 'material';

export class Chess {
  board = new Int8Array(64);
  turn: Side = 1;
  /** Bits: 1 = White king-side, 2 = White queen-side, 4 = Black king-side, 8 = Black queen-side. */
  castling = 0;
  ep = -1;
  half = 0;
  full = 1;
  kings: Record<Side, number> = { 1: 60, [-1]: 4 } as Record<Side, number>;
  private stack: Undo[] = [];
  /** Position keys since the last irreversible move, for repetition checks. */
  private keys: string[] = [];

  constructor(fen = START_FEN) {
    this.load(fen);
  }

  load(fen: string): void {
    const [placement, side, castle, ep, half, full] = fen.trim().split(/\s+/);
    this.board.fill(0);
    let sq = 0;
    for (const ch of placement) {
      if (ch === '/') continue;
      if (/\d/.test(ch)) {
        sq += Number(ch);
        continue;
      }
      const type = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1;
      if (!type) throw new Error(`Bad FEN piece ${ch}`);
      const side: Side = ch === ch.toUpperCase() ? 1 : -1;
      this.board[sq] = type * side;
      if (type === K) this.kings[side] = sq;
      sq++;
    }
    this.turn = side === 'b' ? -1 : 1;
    this.castling = 0;
    if (castle && castle !== '-') {
      if (castle.includes('K')) this.castling |= 1;
      if (castle.includes('Q')) this.castling |= 2;
      if (castle.includes('k')) this.castling |= 4;
      if (castle.includes('q')) this.castling |= 8;
    }
    this.ep = ep && ep !== '-' ? parseSquare(ep) : -1;
    this.half = Number(half ?? 0) || 0;
    this.full = Number(full ?? 1) || 1;
    this.stack = [];
    this.keys = [this.key()];
  }

  clone(): Chess {
    const c = new Chess(this.fen());
    c.keys = [...this.keys];
    return c;
  }

  fen(): string {
    let s = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.board[r * 8 + f];
        if (!p) {
          empty++;
          continue;
        }
        if (empty) s += empty;
        empty = 0;
        const ch = ' pnbrqk'[Math.abs(p)];
        s += p > 0 ? ch.toUpperCase() : ch;
      }
      if (empty) s += empty;
      if (r < 7) s += '/';
    }
    const c = `${this.castling & 1 ? 'K' : ''}${this.castling & 2 ? 'Q' : ''}${this.castling & 4 ? 'k' : ''}${this.castling & 8 ? 'q' : ''}` || '-';
    return `${s} ${this.turn === 1 ? 'w' : 'b'} ${c} ${this.ep >= 0 ? squareName(this.ep) : '-'} ${this.half} ${this.full}`;
  }

  /** Key used for threefold repetition: placement, side, castling rights and en passant. */
  key(): string {
    return this.fen().split(' ').slice(0, 4).join(' ');
  }

  attacked(sq: number, by: Side): boolean {
    const b = this.board;
    // Pawns: a White pawn attacks diagonally upwards (towards lower indices).
    const pr = (sq >> 3) + (by === 1 ? 1 : -1);
    if (pr >= 0 && pr < 8) {
      const f = sq & 7;
      if (f > 0 && b[pr * 8 + f - 1] === P * by) return true;
      if (f < 7 && b[pr * 8 + f + 1] === P * by) return true;
    }
    for (const t of KNIGHT[sq]) if (b[t] === N * by) return true;
    for (const t of KING[sq]) if (b[t] === K * by) return true;
    for (const ray of ORTHO_RAYS[sq]) {
      for (const t of ray) {
        const p = b[t];
        if (!p) continue;
        if (p === R * by || p === Q * by) return true;
        break;
      }
    }
    for (const ray of DIAG_RAYS[sq]) {
      for (const t of ray) {
        const p = b[t];
        if (!p) continue;
        if (p === B * by || p === Q * by) return true;
        break;
      }
    }
    return false;
  }

  inCheck(side: Side = this.turn): boolean {
    return this.attacked(this.kings[side], -side as Side);
  }

  /** Pseudo-legal moves (may leave the king in check). */
  pseudo(capturesOnly = false): number[] {
    const out: number[] = [];
    const b = this.board;
    const me = this.turn;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq] * me;
      if (p <= 0) continue;
      if (p === P) {
        const dir = me === 1 ? -8 : 8;
        const r = sq >> 3;
        const lastRank = me === 1 ? 1 : 6;
        const addPawn = (to: number, flags = 0) => {
          if (r === lastRank) for (const promo of [Q, N, R, B]) out.push(pack(sq, to, promo, flags));
          else out.push(pack(sq, to, 0, flags));
        };
        const one = sq + dir;
        if (!capturesOnly || r === lastRank) {
          if (!b[one]) {
            addPawn(one);
            const startRank = me === 1 ? 6 : 1;
            if (!capturesOnly && r === startRank && !b[one + dir]) out.push(pack(sq, one + dir, 0, FLAG_DOUBLE));
          }
        }
        for (const df of [-1, 1]) {
          const f = (sq & 7) + df;
          if (f < 0 || f > 7) continue;
          const to = one + df;
          if (b[to] * me < 0) addPawn(to);
          else if (to === this.ep) out.push(pack(sq, to, 0, FLAG_EP));
        }
      } else if (p === N || p === K) {
        for (const to of (p === N ? KNIGHT : KING)[sq]) {
          const t = b[to] * me;
          if (t > 0 || (capturesOnly && t === 0)) continue;
          out.push(pack(sq, to));
        }
        if (p === K && !capturesOnly) this.castles(sq, out);
      } else {
        const lists = p === B ? [DIAG_RAYS[sq]] : p === R ? [ORTHO_RAYS[sq]] : [ORTHO_RAYS[sq], DIAG_RAYS[sq]];
        for (const list of lists) {
          for (const ray of list) {
            for (const to of ray) {
              const t = b[to] * me;
              if (t > 0) break;
              if (t < 0) {
                out.push(pack(sq, to));
                break;
              }
              if (!capturesOnly) out.push(pack(sq, to));
            }
          }
        }
      }
    }
    return out;
  }

  private castles(sq: number, out: number[]): void {
    const b = this.board;
    const me = this.turn;
    const them = -me as Side;
    const home = me === 1 ? 60 : 4;
    if (sq !== home || this.attacked(home, them)) return;
    const kingSide = me === 1 ? 1 : 4;
    const queenSide = me === 1 ? 2 : 8;
    if (this.castling & kingSide && !b[home + 1] && !b[home + 2] && b[home + 3] === R * me && !this.attacked(home + 1, them) && !this.attacked(home + 2, them))
      out.push(pack(home, home + 2, 0, FLAG_CASTLE));
    if (
      this.castling & queenSide &&
      !b[home - 1] &&
      !b[home - 2] &&
      !b[home - 3] &&
      b[home - 4] === R * me &&
      !this.attacked(home - 1, them) &&
      !this.attacked(home - 2, them)
    )
      out.push(pack(home, home - 2, 0, FLAG_CASTLE));
  }

  make(m: number): void {
    const b = this.board;
    const from = moveFrom(m);
    const to = moveTo(m);
    const flags = moveFlags(m);
    const promo = movePromo(m);
    const piece = b[from];
    const me = this.turn;
    let captured = b[to];
    this.stack.push({ move: m, captured, castling: this.castling, ep: this.ep, half: this.half });
    if (flags & FLAG_EP) {
      const capSq = to + (me === 1 ? 8 : -8);
      captured = b[capSq];
      b[capSq] = 0;
      this.stack[this.stack.length - 1].captured = captured;
    }
    b[to] = promo ? promo * me : piece;
    b[from] = 0;
    if (flags & FLAG_CASTLE) {
      if (to > from) {
        b[from + 1] = b[from + 3];
        b[from + 3] = 0;
      } else {
        b[from - 1] = b[from - 4];
        b[from - 4] = 0;
      }
    }
    if (Math.abs(piece) === K) this.kings[me] = to;
    this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.ep = flags & FLAG_DOUBLE ? (from + to) >> 1 : -1;
    this.half = Math.abs(piece) === P || captured ? 0 : this.half + 1;
    if (me === -1) this.full++;
    this.turn = -me as Side;
  }

  unmake(): void {
    const u = this.stack.pop();
    if (!u) return;
    const b = this.board;
    const m = u.move;
    const from = moveFrom(m);
    const to = moveTo(m);
    const flags = moveFlags(m);
    this.turn = -this.turn as Side;
    const me = this.turn;
    if (me === -1) this.full--;
    const moved = movePromo(m) ? P * me : b[to];
    b[from] = moved;
    if (flags & FLAG_EP) {
      b[to] = 0;
      b[to + (me === 1 ? 8 : -8)] = u.captured;
    } else {
      b[to] = u.captured;
    }
    if (flags & FLAG_CASTLE) {
      if (to > from) {
        b[from + 3] = b[from + 1];
        b[from + 1] = 0;
      } else {
        b[from - 4] = b[from - 1];
        b[from - 1] = 0;
      }
    }
    if (Math.abs(moved) === K) this.kings[me] = from;
    this.castling = u.castling;
    this.ep = u.ep;
    this.half = u.half;
  }

  /** Makes a move, returning false (and undoing it) if it leaves the mover in check. */
  tryMake(m: number): boolean {
    const me = this.turn;
    this.make(m);
    if (this.attacked(this.kings[me], -me as Side)) {
      this.unmake();
      return false;
    }
    return true;
  }

  moves(): number[] {
    return this.pseudo().filter((m) => {
      if (!this.tryMake(m)) return false;
      this.unmake();
      return true;
    });
  }

  /** Plays a legal move for real, recording it for repetition detection. */
  play(m: number): void {
    this.make(m);
    if (this.half === 0) this.keys = [];
    this.keys.push(this.key());
  }

  takeBack(): void {
    this.unmake();
    this.keys.pop();
    if (!this.keys.length) this.keys = [this.key()];
  }

  insufficientMaterial(): boolean {
    const minors: number[] = [];
    for (let sq = 0; sq < 64; sq++) {
      const t = Math.abs(this.board[sq]);
      if (!t || t === K) continue;
      if (t === P || t === R || t === Q) return false;
      minors.push(sq);
    }
    if (minors.length <= 1) return true;
    // Bishops only, all on the same colour.
    const colours = new Set(minors.map((sq) => (Math.abs(this.board[sq]) === B ? ((sq >> 3) + (sq & 7)) % 2 : -1)));
    return !colours.has(-1) && colours.size === 1;
  }

  status(): Status {
    if (!this.moves().length) return this.inCheck() ? 'checkmate' : 'stalemate';
    if (this.half >= 100) return 'fifty';
    const now = this.key();
    if (this.keys.filter((k) => k === now).length >= 3) return 'repetition';
    if (this.insufficientMaterial()) return 'material';
    return 'play';
  }

  /** Standard algebraic notation for a legal move in the current position. */
  san(m: number): string {
    const from = moveFrom(m);
    const to = moveTo(m);
    const type = Math.abs(this.board[from]);
    let s: string;
    if (moveFlags(m) & FLAG_CASTLE) s = to > from ? 'O-O' : 'O-O-O';
    else {
      const capture = this.board[to] !== 0 || (moveFlags(m) & FLAG_EP) !== 0;
      if (type === P) {
        s = capture ? `${squareName(from)[0]}x${squareName(to)}` : squareName(to);
        if (movePromo(m)) s += `=${' PNBRQK'[movePromo(m)]}`;
      } else {
        const rivals = this.moves().filter((o) => o !== m && moveTo(o) === to && Math.abs(this.board[moveFrom(o)]) === type);
        let dis = '';
        if (rivals.length) {
          const sameFile = rivals.some((o) => (moveFrom(o) & 7) === (from & 7));
          const sameRank = rivals.some((o) => moveFrom(o) >> 3 === from >> 3);
          dis = !sameFile ? squareName(from)[0] : !sameRank ? squareName(from)[1] : squareName(from);
        }
        s = `${' PNBRQK'[type]}${dis}${capture ? 'x' : ''}${squareName(to)}`;
      }
    }
    this.make(m);
    const check = this.inCheck();
    const mate = check && !this.moves().length;
    this.unmake();
    return s + (mate ? '#' : check ? '+' : '');
  }

  /** Finds the legal move matching UCI text such as "e2e4" or "e7e8q". */
  fromUci(uci: string): number | null {
    const from = parseSquare(uci.slice(0, 2));
    const to = parseSquare(uci.slice(2, 4));
    const promo = uci[4] ? 'pnbrqk'.indexOf(uci[4]) + 1 : 0;
    return this.moves().find((m) => moveFrom(m) === from && moveTo(m) === to && movePromo(m) === promo) ?? null;
  }
}

export const toUci = (m: number) => `${squareName(moveFrom(m))}${squareName(moveTo(m))}${movePromo(m) ? ' pnbrqk'[movePromo(m)] : ''}`;

/** Counts leaf nodes to a given depth — the standard move-generator test. */
export function perft(c: Chess, depth: number): number {
  if (depth === 0) return 1;
  let n = 0;
  for (const m of c.pseudo()) {
    if (!c.tryMake(m)) continue;
    n += perft(c, depth - 1);
    c.unmake();
  }
  return n;
}
