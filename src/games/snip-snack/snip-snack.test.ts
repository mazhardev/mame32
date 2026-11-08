import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import type { Input } from '../_shared/arcade/kit';
import { H, STEP, W, blow, candyPos, create, cutRope, popBubble, replay, starsGot, step, update } from './engine';
import type { Action, State } from './engine';
import { LEVELS } from './levels';
import { SOLUTIONS } from './solutions';
import { starText, starsFor } from './spec';

function run(s: State, frames: number) {
  for (let f = 0; f < frames && s.phase === 'play'; f++) step(s);
  return s;
}

function pointer(x: number, y: number, down: boolean, pressed = false): Input {
  const input = emptyInput();
  Object.assign(input.pointer, { x, y, down, pressed, active: true });
  return input;
}

describe('levels', () => {
  it('has 15 levels, each with a sweet, at least one rope, three stars and the Nibbler on screen', () => {
    expect(LEVELS).toHaveLength(15);
    for (const l of LEVELS) {
      expect(l.ropes.length, l.name).toBeGreaterThan(0);
      expect(l.stars, l.name).toHaveLength(3);
      for (const [x, y] of [l.candy, l.monster, ...l.stars]) {
        expect(x, l.name).toBeGreaterThan(0);
        expect(x, l.name).toBeLessThan(W);
        expect(y, l.name).toBeGreaterThan(0);
        expect(y, l.name).toBeLessThan(H);
      }
    }
  });

  it('every stored solution feeds the Nibbler with all three stars', () => {
    expect(SOLUTIONS).toHaveLength(LEVELS.length);
    LEVELS.forEach((l, i) => {
      const s = replay(i, SOLUTIONS[i]);
      expect(s.phase, l.name).toBe('won');
      expect(starsGot(s), l.name).toBe(3);
      expect(s.score, l.name).toBe(4000);
    });
  });

  it('solutions leave some slack: each step a frame early or late still gets three stars', () => {
    LEVELS.forEach((l, i) => {
      SOLUTIONS[i].forEach((_, k) => {
        for (const d of [-1, 1]) {
          const plan = SOLUTIONS[i].map((a, j) => (j === k ? { ...a, f: Math.max(0, a.f + d) } : a));
          const s = replay(i, plan);
          expect(s.phase === 'won' && starsGot(s) === 3, `${l.name} step ${k} ${d}`).toBe(true);
        }
      });
    });
  });

  it('doing nothing never wins, and past the two first-of-a-kind levels cutting everything at once never gets three stars', () => {
    LEVELS.forEach((l, i) => {
      expect(replay(i, [], 8).phase, l.name).not.toBe('won');
      if (i === 0 || i === 5) return;
      const all: Action[] = l.ropes.map((_, rope) => ({ f: 0, kind: 'cut', rope }));
      const s = replay(i, all);
      expect(s.phase === 'won' && starsGot(s) === 3, l.name).toBe(false);
    });
  });

  it('later levels need more than one well-timed action', () => {
    for (let i = 10; i < LEVELS.length; i++) expect(SOLUTIONS[i].length, LEVELS[i].name).toBeGreaterThan(1);
  });
});

describe('ropes', () => {
  it('a sweet hangs on its rope without stretching it much', () => {
    const s = run(create('normal', 0), 240);
    const [ax, ay, len] = LEVELS[0].ropes[0];
    const c = candyPos(s);
    expect(s.phase).toBe('play');
    expect(Math.abs(c.x - ax)).toBeLessThan(1);
    expect(Math.hypot(c.x - ax, c.y - ay)).toBeLessThan(len * 1.05);
  });

  it('a cut rope stops holding the sweet, and its loose end does not drag it', () => {
    const s = run(create('normal', 0), 60);
    const y0 = candyPos(s).y;
    expect(cutRope(s, 0)).toBe(true);
    expect(cutRope(s, 0)).toBe(false);
    run(s, 20);
    // Free fall from rest: ½·g·t² with g = 900 px/s².
    const fall = candyPos(s).y - y0;
    expect(fall).toBeGreaterThan(0.5 * 900 * (20 / 60) ** 2 * 0.9);
    expect(s.stats.cuts).toBe(1);
    expect(s.log).toEqual([{ f: 60, kind: 'cut', rope: 0 }]);
  });

  it('swiping across a rope cuts it', () => {
    const s = create('normal', 0);
    const [, ay] = LEVELS[0].ropes[0];
    const y = (ay + LEVELS[0].candy[1]) / 2;
    update(s, STEP, pointer(120, y, true, true));
    update(s, STEP, pointer(200, y, true));
    expect(s.stats.cuts).toBe(1);
    expect(s.swipe.length).toBeGreaterThan(0);
    update(s, STEP, pointer(200, y, false));
    run(s, 60);
    expect(s.phase).toBe('won');
  });

  it('a swipe that misses the rope cuts nothing', () => {
    const s = create('normal', 0);
    update(s, STEP, pointer(20, 300, true, true));
    update(s, STEP, pointer(60, 300, true));
    expect(s.stats.cuts).toBe(0);
  });

  it('number keys cut ropes for keyboard players', () => {
    const s = create('normal', 3);
    const input = emptyInput();
    input.keys.add('3');
    update(s, STEP, input);
    expect(s.links.filter((l) => l.rope === 2 && l.cut)).toHaveLength(1);
    expect(s.links.filter((l) => l.rope !== 2 && l.cut)).toHaveLength(0);
  });
});

describe('props', () => {
  it('a bubble catches the falling sweet and floats it up; popping drops it again', () => {
    const s = create('normal', 5);
    cutRope(s, 0);
    run(s, 60);
    expect(s.bubbles[0].holding).toBe(true);
    const y1 = candyPos(s).y;
    run(s, 30);
    expect(candyPos(s).y).toBeLessThan(y1);
    expect(popBubble(s)).toBe(true);
    expect(popBubble(s)).toBe(false);
    const y2 = candyPos(s).y;
    run(s, 20);
    expect(candyPos(s).y).toBeGreaterThan(y2);
  });

  it('tapping near a floating sweet pops its bubble', () => {
    const s = create('normal', 5);
    cutRope(s, 0);
    run(s, 70);
    const c = candyPos(s);
    update(s, STEP, pointer(c.x + 10, c.y, true, true));
    expect(s.bubbles[0].popped).toBe(true);
  });

  it('a blower only pushes the sweet when it is in front and close', () => {
    // Gust: the blower faces right from the left wall.
    const far = create('normal', 6);
    cutRope(far, 0);
    const c = candyPos(far);
    c.x = c.px = 280;
    c.y = c.py = 200;
    blow(far, 0);
    step(far);
    expect(Math.abs(candyPos(far).x - 280)).toBeLessThan(0.5);
    expect(far.puffs).toHaveLength(1);

    const behind = create('normal', 6);
    cutRope(behind, 0);
    const b = candyPos(behind);
    b.x = b.px = 60;
    b.y = b.py = 330;
    blow(behind, 0);
    step(behind);
    expect(Math.abs(candyPos(behind).x - 60)).toBeLessThan(0.5);

    const near = create('normal', 6);
    cutRope(near, 0);
    run(near, 86);
    const x0 = candyPos(near).x;
    blow(near, 0);
    run(near, 20);
    expect(candyPos(near).x).toBeGreaterThan(x0 + 40);
  });

  it('a dotted ring ties a new rope when the sweet passes inside it', () => {
    const s = create('normal', 7);
    const ropes = s.ropes;
    run(s, 100);
    cutRope(s, 0);
    run(s, 40);
    expect(s.pins[0].used).toBe(true);
    expect(s.ropes).toBe(ropes + 1);
    const [px, py] = LEVELS[7].pins![0];
    run(s, 60);
    expect(Math.hypot(candyPos(s).x - px, candyPos(s).y - py)).toBeLessThan(LEVELS[7].pins![0][2] * 1.1);
  });

  it('spikes and falling off the screen lose the level', () => {
    // Spike Wall: dropping straight away lands on the floor spikes.
    const spikes = replay(8, [{ f: 0, kind: 'cut', rope: 0 }]);
    expect(spikes.phase).toBe('lost');
    expect(spikes.lostWhy).toBe('spikes');
    // Pendulum: cutting at once drops the sweet past the Nibbler and off the bottom.
    const fell = replay(2, [{ f: 0, kind: 'cut', rope: 0 }]);
    expect(fell.phase).toBe('lost');
    expect(fell.lostWhy).toBe('fell');
  });

  it('the round ends a moment after the sweet is eaten', () => {
    const s = replay(0, SOLUTIONS[0]);
    expect(s.over).toBe(false);
    for (let i = 0; i < 80; i++) step(s);
    expect(s.over).toBe(true);
  });
});

describe('timing', () => {
  it('runs the physics at 60 steps a second whatever the screen refresh rate', () => {
    const a = create('normal', 0);
    const b = create('normal', 0);
    for (let i = 0; i < 60; i++) update(a, 1 / 60, emptyInput());
    for (let i = 0; i < 120; i++) update(b, 1 / 120, emptyInput());
    expect(Math.abs(a.frame - b.frame)).toBeLessThanOrEqual(1);
    expect(a.frame).toBeGreaterThanOrEqual(59);
  });

  it('Easy slows the action and Hard speeds it up', () => {
    const frames = (d: 'easy' | 'normal' | 'hard') => {
      const s = create(d, 0);
      for (let i = 0; i < 120; i++) update(s, 1 / 60, emptyInput());
      return s.frame;
    };
    expect(frames('easy')).toBeLessThan(frames('normal'));
    expect(frames('hard')).toBeGreaterThan(frames('normal'));
  });

  it('turns best scores into stars', () => {
    expect(starsFor(1000)).toBe(0);
    expect(starsFor(3000)).toBe(2);
    expect(starsFor(4000)).toBe(3);
    expect(starText(2)).toBe('★★☆');
  });
});

describe('swipes and taps', () => {
  it('tapping a blower puffs it', () => {
    const s = create('normal', 6);
    const [bx, by] = LEVELS[6].blowers![0];
    update(s, STEP, pointer(bx + 4, by, true, true));
    expect(s.puffs).toHaveLength(1);
    expect(s.log[0]).toMatchObject({ kind: 'blow', i: 0 });
  });

  it('a swipe that stops exactly on a rope still cuts it', () => {
    const s = create('normal', 0);
    update(s, STEP, pointer(140, 100, true, true));
    update(s, STEP, pointer(160, 100, true));
    expect(s.stats.cuts).toBe(1);
  });
});
