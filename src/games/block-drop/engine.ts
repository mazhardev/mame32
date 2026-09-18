import type { ArcadeEngine } from '../_shared/arcade/CanvasRunner';
import { backdrop } from '../_shared/arcade/CanvasRunner';
export type Shape = number[][];
export const SHAPES: Shape[] = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
];
export function rotate(shape: Shape): Shape {
  return shape[0].map((_, x) => shape.map((row) => row[x]).reverse());
}
export function clearLines(board: number[][]) {
  const remaining = board.filter((row) => row.some((v) => v === 0));
  const count = board.length - remaining.length;
  return {
    count,
    board: [...Array.from({ length: count }, () => Array<number>(10).fill(0)), ...remaining],
  };
}
export class BlockEngine implements ArcadeEngine {
  score = 0;
  over = false;
  won = false;
  label = '0 / 20 lines';
  lines = 0;
  board = Array.from({ length: 20 }, () => Array<number>(10).fill(0));
  shape = SHAPES[2];
  x = 3;
  y = 0;
  color = 3;
  private elapsed = 0;
  private repeat = 0;
  constructor() {
    this.spawn();
  }
  private spawn() {
    this.color = 1 + Math.floor(Math.random() * 7);
    this.shape = SHAPES[this.color - 1].map((r) => r.slice());
    this.x = 3;
    this.y = 0;
    if (!this.fits(this.shape, this.x, this.y)) this.over = true;
  }
  fits(shape: Shape, x: number, y: number) {
    return shape.every((row, dy) =>
      row.every(
        (v, dx) =>
          !v ||
          (x + dx >= 0 &&
            x + dx < 10 &&
            y + dy >= 0 &&
            y + dy < 20 &&
            this.board[y + dy][x + dx] === 0),
      ),
    );
  }
  move(dx: number, dy: number) {
    if (this.over || !this.fits(this.shape, this.x + dx, this.y + dy)) return false;
    this.x += dx;
    this.y += dy;
    return true;
  }
  private lock() {
    this.shape.forEach((row, dy) =>
      row.forEach((v, dx) => {
        if (v) this.board[this.y + dy][this.x + dx] = this.color;
      }),
    );
    const cleared = clearLines(this.board);
    this.board = cleared.board;
    this.lines += cleared.count;
    this.score += [0, 100, 300, 500, 800][cleared.count];
    this.label = `${this.lines} / 20 lines`;
    this.won = this.lines >= 20;
    if (this.won) this.over = true;
    else this.spawn();
  }
  action(key: string) {
    if (this.over) return;
    if (key === 'ArrowLeft') {
      this.move(-1, 0);
      this.repeat = 0.16;
    }
    if (key === 'ArrowRight') {
      this.move(1, 0);
      this.repeat = 0.16;
    }
    if (key === 'ArrowUp') {
      const next = rotate(this.shape);
      for (const offset of [0, -1, 1, -2, 2])
        if (this.fits(next, this.x + offset, this.y)) {
          this.shape = next;
          this.x += offset;
          break;
        }
    }
    if (key === 'Space') {
      let dropped = 0;
      while (this.move(0, 1)) dropped++;
      this.score += dropped * 2;
      this.lock();
    }
  }
  update(dt: number, keys: Set<string>) {
    if (this.over) return;
    this.elapsed += dt;
    this.repeat -= dt;
    if (this.repeat <= 0) {
      if (keys.has('ArrowLeft')) this.move(-1, 0);
      if (keys.has('ArrowRight')) this.move(1, 0);
      this.repeat = 0.12;
    }
    const speed = keys.has('ArrowDown') ? 0.045 : Math.max(0.12, 0.65 - this.lines * 0.018);
    if (this.elapsed >= speed) {
      this.elapsed = 0;
      if (!this.move(0, 1)) this.lock();
    }
  }
  draw(c: CanvasRenderingContext2D) {
    backdrop(c);
    const colors = [
      '#192336',
      '#38bdf8',
      '#fbbf24',
      '#c084fc',
      '#4ade80',
      '#f87171',
      '#60a5fa',
      '#fb923c',
    ];
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 10; x++) {
        c.fillStyle = colors[this.board[y][x]];
        c.fillRect(230 + x * 18, 20 + y * 18, 17, 17);
      }
    this.shape.forEach((row, dy) =>
      row.forEach((v, dx) => {
        if (v) {
          c.fillStyle = colors[this.color];
          c.fillRect(230 + (this.x + dx) * 18, 20 + (this.y + dy) * 18, 17, 17);
        }
      }),
    );
    c.fillStyle = '#cbd5e1';
    c.font = '18px sans-serif';
    c.fillText('BLOCK', 50, 160);
    c.fillText('DROP', 50, 188);
    c.font = '14px sans-serif';
    c.fillText('Clear 20 lines', 440, 175);
    c.fillText('to win', 440, 195);
  }
}
