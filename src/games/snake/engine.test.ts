import { describe, expect, it } from 'vitest';
import { DIFFICULTY_CONFIG, SnakeEngine } from './engine';

const cfg = { ...DIFFICULTY_CONFIG.normal, cols: 10, rows: 10 };

function makeEngine(foodAt = { x: 9, y: 9 }) {
  const engine = new SnakeEngine(cfg, () => 0);
  engine.food = foodAt;
  return engine;
}

describe('SnakeEngine', () => {
  it('starts with three segments moving right', () => {
    const engine = makeEngine();
    expect(engine.snake).toHaveLength(3);
    expect(engine.dir).toBe('right');
    expect(engine.alive).toBe(true);
  });

  it('moves the head one cell per step without growing', () => {
    const engine = makeEngine();
    const head = { ...engine.snake[0] };
    engine.step();
    expect(engine.snake[0]).toEqual({ x: head.x + 1, y: head.y });
    expect(engine.snake).toHaveLength(3);
  });

  it('ignores a reversal into itself', () => {
    const engine = makeEngine();
    engine.turn('left');
    engine.step();
    expect(engine.dir).toBe('right');
  });

  it('buffers two turns so a quick corner is not dropped', () => {
    const engine = makeEngine();
    engine.turn('up');
    engine.turn('left');
    engine.step();
    expect(engine.dir).toBe('up');
    engine.step();
    expect(engine.dir).toBe('left');
  });

  it('grows and scores when it eats', () => {
    const engine = makeEngine();
    const head = engine.snake[0];
    engine.food = { x: head.x + 1, y: head.y };
    const result = engine.step();
    expect(result.ate).toBe(true);
    expect(engine.score).toBe(1);
    expect(engine.snake).toHaveLength(4);
  });

  it('never places food on the snake', () => {
    const engine = makeEngine();
    for (let i = 0; i < 200; i++) {
      engine.placeFood();
      expect(engine.snake.some((c) => c.x === engine.food.x && c.y === engine.food.y)).toBe(false);
    }
  });

  it('dies on a wall when wrapping is off', () => {
    const engine = new SnakeEngine({ ...cfg, wrap: false }, () => 0);
    engine.food = { x: 0, y: 0 };
    let dead = false;
    for (let i = 0; i < 20 && !dead; i++) dead = engine.step().dead;
    expect(dead).toBe(true);
    expect(engine.alive).toBe(false);
  });

  it('wraps around the edge when wrapping is on', () => {
    const engine = new SnakeEngine({ ...cfg, wrap: true }, () => 0);
    engine.food = { x: 5, y: 9 };
    for (let i = 0; i < 12; i++) engine.step();
    expect(engine.alive).toBe(true);
    expect(engine.snake[0].x).toBeGreaterThanOrEqual(0);
    expect(engine.snake[0].x).toBeLessThan(cfg.cols);
  });

  it('dies when it runs into its own body', () => {
    const engine = new SnakeEngine({ ...cfg, wrap: true }, () => 0);
    // Grow to a length that can self-collide, then turn in a tight square.
    engine.snake = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ];
    engine.dir = 'right';
    engine.food = { x: 0, y: 0 };
    engine.turn('down');
    engine.step();
    engine.turn('left');
    const result = engine.step();
    expect(result.dead).toBe(true);
  });

  it('does not die moving into the cell its tail is leaving', () => {
    const engine = new SnakeEngine({ ...cfg, wrap: true }, () => 0);
    engine.snake = [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 5 },
    ];
    engine.dir = 'right';
    engine.food = { x: 0, y: 0 };
    const result = engine.step();
    expect(result.dead).toBe(false);
  });

  it('speeds up as the score climbs', () => {
    const engine = new SnakeEngine({ ...cfg, speedUpEvery: 1 }, () => 0);
    const before = engine.interval;
    const head = engine.snake[0];
    engine.food = { x: head.x + 1, y: head.y };
    engine.step();
    expect(engine.interval).toBeLessThan(before);
  });

  it('never drops below the minimum interval', () => {
    const engine = new SnakeEngine({ ...cfg, speedUpEvery: 1, minInterval: 0.05 }, () => 0);
    for (let i = 0; i < 100; i++) {
      engine.food = { ...engine.snake[0], x: (engine.snake[0].x + 1) % cfg.cols };
      engine.step();
    }
    expect(engine.interval).toBeGreaterThanOrEqual(0.05);
  });
});
