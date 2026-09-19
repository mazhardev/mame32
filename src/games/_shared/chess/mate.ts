import type { Chess } from './engine';

/** Exact check: can the side to move force checkmate within `n` of its own moves? */
export function forcesMate(c: Chess, n: number): boolean {
  return mateMoves(c, n, true).length > 0;
}

/** Every first move that forces mate within `n` moves (stops at the first when `any`). */
export function mateMoves(c: Chess, n: number, any = false): number[] {
  const out: number[] = [];
  // Checks first: they are by far the most likely mating moves.
  const moves = c.moves();
  const checks: number[] = [];
  const quiet: number[] = [];
  for (const m of moves) {
    c.make(m);
    (c.inCheck() ? checks : quiet).push(m);
    c.unmake();
  }
  for (const m of [...checks, ...quiet]) {
    c.make(m);
    const ok = defenderLoses(c, n);
    c.unmake();
    if (ok) {
      out.push(m);
      if (any) break;
    }
  }
  return out;
}

function defenderLoses(c: Chess, n: number): boolean {
  const replies = c.moves();
  if (!replies.length) return c.inCheck();
  if (n <= 1) return false;
  for (const r of replies) {
    c.make(r);
    const ok = forcesMate(c, n - 1);
    c.unmake();
    if (!ok) return false;
  }
  return true;
}
