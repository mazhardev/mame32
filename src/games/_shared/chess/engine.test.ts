import { describe, expect, it } from 'vitest';
import { Chess, START_FEN, perft, toUci } from './engine';
import { bestMove } from './ai';

const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

describe('chess move generation (perft)', () => {
  it('matches the known counts from the start position', () => {
    const c = new Chess();
    expect(perft(c, 1)).toBe(20);
    expect(perft(c, 2)).toBe(400);
    expect(perft(c, 3)).toBe(8902);
  });

  it('handles castling, en passant and promotion (Kiwipete)', () => {
    const c = new Chess(KIWIPETE);
    expect(perft(c, 1)).toBe(48);
    expect(perft(c, 2)).toBe(2039);
  });

  it('handles en passant pins and promotions (position 3 and 4)', () => {
    expect(perft(new Chess('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), 3)).toBe(2812);
    expect(perft(new Chess('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1'), 2)).toBe(264);
  });

  it('restores the exact position after make/unmake', () => {
    const c = new Chess(KIWIPETE);
    for (const m of c.moves()) {
      c.make(m);
      c.unmake();
      expect(c.fen()).toBe(KIWIPETE);
    }
  });
});

describe('chess rules', () => {
  it('round-trips FEN', () => {
    expect(new Chess().fen()).toBe(START_FEN);
    expect(new Chess(KIWIPETE).fen()).toBe(KIWIPETE);
  });

  it('detects checkmate and stalemate', () => {
    const c = new Chess();
    for (const u of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) c.play(c.fromUci(u) as number);
    expect(c.status()).toBe('checkmate');
    expect(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').status()).toBe('stalemate');
  });

  it('detects insufficient material and threefold repetition', () => {
    expect(new Chess('8/8/8/4k3/8/8/2B5/4K3 w - - 0 1').status()).toBe('material');
    const c = new Chess();
    for (let k = 0; k < 2; k++) for (const u of ['g1f3', 'g8f6', 'f3g1', 'f6g8']) c.play(c.fromUci(u) as number);
    expect(c.status()).toBe('repetition');
  });

  it('writes standard algebraic notation', () => {
    const c = new Chess(KIWIPETE);
    const san = c.moves().map((m) => c.san(m));
    expect(san).toContain('O-O');
    expect(san).toContain('O-O-O');
    expect(san).toContain('Nxf7');
    expect(san).toContain('dxe6');
    const mate = new Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    expect(mate.san(mate.fromUci('a1a8') as number)).toBe('Ra8#');
  });
});

describe('chess computer', () => {
  it('finds mate in one', () => {
    const c = new Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    expect(toUci(bestMove(c, { maxDepth: 3, timeMs: 2000 }) as number)).toBe('a1a8');
  });

  it('wins a hanging queen', () => {
    const c = new Chess('4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1');
    expect(toUci(bestMove(c, { maxDepth: 2, timeMs: 2000 }) as number)).toBe('d2d5');
  });

  it('only ever returns legal moves', () => {
    const c = new Chess();
    for (let ply = 0; ply < 12; ply++) {
      const m = bestMove(c, { maxDepth: 2, timeMs: 200, noise: 30 });
      expect(c.moves()).toContain(m);
      c.play(m as number);
    }
  });
});
