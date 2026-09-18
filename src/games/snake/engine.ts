import type { DifficultySetting } from '@/types';

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Cell {
  x: number;
  y: number;
}

export interface SnakeConfig {
  cols: number;
  rows: number;
  /** Seconds between steps; lower is faster. */
  stepInterval: number;
  minInterval: number;
  speedUpEvery: number;
  wrap: boolean;
}

export const DIFFICULTY_CONFIG: Record<DifficultySetting, SnakeConfig> = {
  easy: { cols: 20, rows: 20, stepInterval: 0.16, minInterval: 0.09, speedUpEvery: 5, wrap: true },
  normal: { cols: 22, rows: 22, stepInterval: 0.13, minInterval: 0.06, speedUpEvery: 4, wrap: false },
  hard: { cols: 26, rows: 26, stepInterval: 0.1, minInterval: 0.045, speedUpEvery: 3, wrap: false },
};

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export interface StepResult {
  ate: boolean;
  dead: boolean;
}

export class SnakeEngine {
  readonly config: SnakeConfig;
  snake: Cell[] = [];
  food: Cell = { x: 0, y: 0 };
  dir: Dir = 'right';
  /** Buffered turns, so two quick inputs in one step are not dropped. */
  private queue: Dir[] = [];
  score = 0;
  alive = true;
  interval: number;
  private random: () => number;

  constructor(config: SnakeConfig, random: () => number = Math.random) {
    this.config = config;
    this.interval = config.stepInterval;
    this.random = random;
    this.reset();
  }

  reset() {
    const { cols, rows } = this.config;
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    this.dir = 'right';
    this.queue = [];
    this.score = 0;
    this.alive = true;
    this.interval = this.config.stepInterval;
    this.placeFood();
  }

  /** Rejects reversals against the last committed direction. */
  turn(dir: Dir) {
    const reference = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (dir === reference || dir === OPPOSITE[reference]) return;
    if (this.queue.length < 2) this.queue.push(dir);
  }

  placeFood() {
    const { cols, rows } = this.config;
    const free: Cell[] = [];
    const occupied = new Set(this.snake.map((c) => `${c.x},${c.y}`));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (!free.length) return;
    this.food = free[Math.floor(this.random() * free.length)];
  }

  step(): StepResult {
    if (!this.alive) return { ate: false, dead: true };
    const next = this.queue.shift();
    if (next) this.dir = next;

    const delta = DELTA[this.dir];
    const head = this.snake[0];
    let nx = head.x + delta.x;
    let ny = head.y + delta.y;
    const { cols, rows, wrap } = this.config;

    if (wrap) {
      nx = (nx + cols) % cols;
      ny = (ny + rows) % rows;
    } else if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
      this.alive = false;
      return { ate: false, dead: true };
    }

    const ate = nx === this.food.x && ny === this.food.y;
    // The tail cell is free this step unless the snake is growing into it.
    const body = ate ? this.snake : this.snake.slice(0, -1);
    if (body.some((c) => c.x === nx && c.y === ny)) {
      this.alive = false;
      return { ate: false, dead: true };
    }

    this.snake.unshift({ x: nx, y: ny });
    if (ate) {
      this.score += 1;
      if (this.score % this.config.speedUpEvery === 0) {
        this.interval = Math.max(this.config.minInterval, this.interval * 0.9);
      }
      this.placeFood();
    } else {
      this.snake.pop();
    }
    return { ate, dead: false };
  }

  get length() {
    return this.snake.length;
  }
}
