import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { BALL_R, CPU, CPU_Y, H, PLAYER_Y, TARGET, W, create, update } from './engine';
import type { State } from './engine';

const live = (s: State) => {
  s.serveT = 0;
  return s;
};

describe('pong', () => {
  it('bounces off your paddle, faster and angled by where it hits', () => {
    const s = live(create('normal'));
    s.player = W / 2;
    s.ball = { x: W / 2 + 30, y: PLAYER_Y - 20, vx: 0, vy: 300 };
    update(s, 0.05, emptyInput());
    expect(s.ball.vy).toBeLessThan(0);
    expect(s.ball.vx).toBeGreaterThan(0);
    expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeGreaterThan(300);
    expect(s.events).toContain('blip');
  });

  it('bounces off the side walls', () => {
    const s = live(create('normal'));
    s.ball = { x: BALL_R + 2, y: H / 2, vx: -300, vy: 50 };
    update(s, 0.02, emptyInput());
    expect(s.ball.vx).toBeGreaterThan(0);
  });

  it('scores when the ball passes the computer and ends at seven', () => {
    const s = live(create('easy'));
    s.you = TARGET - 1;
    s.score = 600;
    s.opponent = 20;
    s.ball = { x: W - 20, y: CPU_Y - 30, vx: 0, vy: -400 };
    update(s, 0.1, emptyInput());
    expect(s.you).toBe(TARGET);
    expect(s.won && s.over).toBe(true);
    expect(s.score).toBe(700);
  });

  it('gives the computer a point when you miss, then serves again', () => {
    const s = live(create('normal'));
    s.player = 30;
    s.ball = { x: W - 30, y: PLAYER_Y + 10, vx: 0, vy: 400 };
    update(s, 0.2, emptyInput());
    expect(s.them).toBe(1);
    expect(s.serveT).toBeGreaterThan(0);
    expect(s.events).toContain('failure');
  });

  it('moves your paddle with keys and with a finger, inside the court', () => {
    const s = create('normal');
    const x0 = s.player;
    update(s, 0.1, inputWith(['right']));
    expect(s.player).toBeGreaterThan(x0);
    const touch = emptyInput();
    touch.pointer = { x: 5, y: 400, down: true, pressed: true, released: false, active: true, type: 'touch' };
    update(s, 0.01, touch);
    expect(s.player).toBeGreaterThan(5);
    expect(s.player).toBeLessThan(60);
  });

  it('has a faster computer on Hard', () => {
    expect(CPU.hard.speed).toBeGreaterThan(CPU.easy.speed);
  });

  it('can be won: a player who tracks the ball beats the Easy computer', () => {
    const rng = createRng('pong').next;
    const s = create('easy', rng);
    for (let t = 0; t < 600 && !s.over; t += 1 / 60) {
      const input = emptyInput();
      // Aim slightly off-centre to send angled returns.
      input.pointer = { x: s.ball.x - 18, y: PLAYER_Y, down: true, pressed: false, released: false, active: true, type: 'touch' };
      update(s, 1 / 60, input, rng);
    }
    expect(s.over).toBe(true);
    expect(s.won).toBe(true);
  });
});
