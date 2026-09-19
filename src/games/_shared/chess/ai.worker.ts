/// <reference lib="webworker" />
import { Chess, toUci } from './engine';
import { bestMove } from './ai';
import type { SearchOptions } from './ai';

// Runs the chess search off the main thread so the page stays responsive.
self.onmessage = (e: MessageEvent<{ id: number; fen: string; opts: SearchOptions }>) => {
  const { id, fen, opts } = e.data;
  const m = bestMove(new Chess(fen), opts);
  (self as unknown as Worker).postMessage({ id, move: m === null ? null : toUci(m) });
};
