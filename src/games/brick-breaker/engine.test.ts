import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { BALL_R, CFG, COLS, LIVES, PADDLE_Y, ROWS, W, bricksLeft, create, launch, update } from './engine';

describe('brick breaker', () => {
  it('lays out forty bricks inside the court', () => {
    const s = create('normal');
    expect(s.bricks).toHaveLength(COLS * ROWS);
    expect(s.bricks.length).toBe(40);
    for (const b of s.bricks) expect(b.x >= 0 && b.x + 40 <= W).toBe(true);
  });

  it('keeps the ball on the paddle until launched', () => {
    const s = create('normal');
    update(s, 0.5, inputWith(['right']));
    expect(s.held).toBe(true);
    expect(s.ball.x).toBe(s.paddle);
    update(s, 0.01, inputWith([], ['action']));
    expect(s.held).toBe(false);
    expect(s.ball.vy).toBeLessThan(0);
  });

  it('breaks a brick, scores and bounces', () => {
    const s = create('normal');
    launch(s);
    const br = s.bricks[COLS * (ROWS - 1) + 3];
    s.ball = { x: br.x + 20, y: br.y + 40, vx: 0, vy: -300 };
    update(s, 0.2, emptyInput());
    expect(br.alive).toBe(false);
    expect(s.score).toBeGreaterThanOrEqual(50);
    expect(s.ball.vy).toBeGreaterThan(0);
    expect(s.events).toContain('pop');
  });

  it('returns the ball off the paddle, angled by where it lands', () => {
    const s = create('normal');
    launch(s);
    s.paddle = W / 2;
    s.ball = { x: W / 2 - 25, y: PADDLE_Y - 30, vx: 0, vy: 300 };
    update(s, 0.15, emptyInput());
    expect(s.ball.vy).toBeLessThan(0);
    expect(s.ball.vx).toBeLessThan(0);
  });

  it('loses a ball off the bottom, and the game after three', () => {
    const s = create('normal');
    for (let i = 0; i < LIVES; i++) {
      launch(s);
      s.paddle = 40;
      s.ball = { x: W - 20, y: PADDLE_Y + 20, vx: 0, vy: 400 };
      update(s, 0.2, emptyInput());
    }
    expect(s.lives).toBe(0);
    expect(s.over && !s.won).toBe(true);
  });

  it('wins when the last brick goes', () => {
    const s = create('easy');
    s.bricks.forEach((b, i) => (b.alive = i === 0));
    launch(s);
    const br = s.bricks[0];
    s.ball = { x: br.x + 20, y: br.y + 18 + BALL_R + 4, vx: 0, vy: -300 };
    update(s, 0.1, emptyInput());
    expect(bricksLeft(s)).toBe(0);
    expect(s.won && s.over).toBe(true);
  });

  it('gives a wider paddle on Easy and a narrower one on Hard', () => {
    expect(CFG.easy.paddleW).toBeGreaterThan(CFG.hard.paddleW);
  });
});
