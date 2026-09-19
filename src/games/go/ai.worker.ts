/// <reference lib="webworker" />
import { chooseMove } from './engine';
import type { Color } from './engine';

interface Request {
  id: number;
  n: number;
  board: number[];
  turn: Color;
  ko: number;
  komi: number;
  playouts: number;
  timeMs: number;
}

// Monte Carlo playouts are CPU-heavy, so they run off the main thread.
self.onmessage = (e: MessageEvent<Request>) => {
  const { id, n, board, turn, ko, komi, playouts, timeMs } = e.data;
  const move = chooseMove({ n, board: Int8Array.from(board), turn, ko, passes: 0, captures: { 1: 0, 2: 0 } }, komi, playouts, timeMs);
  (self as unknown as Worker).postMessage({ id, move });
};
