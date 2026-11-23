import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { PITCH } from '../_shared/cricket/cricket';
import { createRng } from '@/utils/random';
import { botInput } from './bot';
import {
  BOUNDARY,
  CENTER,
  create,
  freshBall,
  landing,
  moveVector,
  throwTo,
  toField,
  toScreen,
  update,
  type Ball,
  type State,
} from './engine';

const always = (v: number) => () => v;

/** A state mid-ball with a custom ball in play and no batters running yet. */
function live(ball: Partial<Ball>, s: State = create('normal')): State {
  s.phase = 'live';
  s.phaseT = 0;
  s.shot = 'hit';
  s.ball = { ...freshBall(), x: 0.3, y: 0.9, z: 0.6, state: 'air', ...ball };
  s.pause = 99; // keep the batters at home unless a test sets them running
  return s;
}

function run(s: State, secs: number, random: () => number = always(0.5), input = emptyInput()) {
  for (let t = 0; t < secs && s.phase === 'live'; t += 1 / 60) update(s, 1 / 60, input, random);
}

/** Park every fielder far away so nobody interferes. */
function clearField(s: State) {
  s.fielders.forEach((f, i) => {
    f.x = -40 + i;
    f.y = -30;
  });
}

describe('cricket fielding', () => {
  it('sets every fielder inside the boundary', () => {
    const s = create('normal');
    expect(s.fielders.length).toBe(11);
    for (const f of s.fielders) expect(Math.hypot(f.x - CENTER.x, f.y - CENTER.y)).toBeLessThan(BOUNDARY - 4);
  });

  it('maps screen and field coordinates both ways', () => {
    const p = toScreen(12, 30);
    const back = toField(p.x, p.y);
    expect(back.x).toBeCloseTo(12);
    expect(back.y).toBeCloseTo(30);
    expect(toScreen(0, PITCH).y).toBeLessThan(toScreen(0, 0).y);
  });

  it('predicts where a ball in the air comes down', () => {
    const s = live({ vx: 6, vy: 14, vz: 9 });
    clearField(s);
    const l = landing(s.ball);
    while (!s.ball.bounced) update(s, 1 / 120, emptyInput(), always(0.5));
    expect(s.ball.x).toBeCloseTo(l.x, 0);
    expect(s.ball.y).toBeCloseTo(l.y, 0);
  });

  it('scores six over the rope on the full and four along the ground', () => {
    const six = live({ vx: 0, vy: 30, vz: 18 });
    clearField(six);
    run(six, 8);
    expect(six.log[0]).toMatchObject({ runs: 6, out: false });
    expect(six.total).toBe(6);

    const four = live({ vx: 0, vy: 40, vz: 0, z: 0, state: 'ground', bounced: true });
    clearField(four);
    run(four, 8);
    expect(four.log[0]).toMatchObject({ runs: 4, out: false });
  });

  it('gives a wicket for a catch taken before the ball bounces', () => {
    const s = live({ vx: 0, vy: 12, vz: 10 });
    clearField(s);
    const l = landing(s.ball);
    s.fielders[3].x = l.x;
    s.fielders[3].y = l.y;
    s.active = 3;
    run(s, 4, always(0.99));
    expect(s.wickets).toBe(1);
    expect(s.stats.catches).toBe(1);
    expect(s.log[0].text).toMatch(/CAUGHT/);
  });

  it('can drop a catch at full stretch, and the ball stays live', () => {
    const s = live({ vx: 0, vy: 12, vz: 10 });
    clearField(s);
    const l = landing(s.ball);
    s.fielders[3].x = l.x + s.cfg.reach * 0.9;
    s.fielders[3].y = l.y;
    s.active = 3;
    // random() = 0 means every chance-based thing happens, including the drop.
    run(s, 3, always(0));
    expect(s.stats.drops).toBeGreaterThanOrEqual(1);
    expect(s.stats.catches).toBe(0);
  });

  it('only counts a catch off the bat, not a ball the batter missed', () => {
    const s = live({ vx: 0, vy: -10, vz: 1.5 });
    s.shot = 'miss';
    run(s, 4);
    expect(s.wickets).toBe(0);
    expect(s.log[0].text).toMatch(/Beaten/);
  });

  it('runs a batter out when the throw beats them to the crease', () => {
    const s = live({ state: 'held', holder: 3 });
    s.fielders[3].x = 3;
    s.fielders[3].y = 4;
    s.running = true;
    s.runP = 0.1;
    throwTo(s, 0, always(0));
    expect(s.ball.direct).toBe(true);
    run(s, 2);
    expect(s.wickets).toBe(1);
    expect(s.stats.runOuts).toBe(1);
    expect(s.stats.directHits).toBe(1);
    expect(s.log[0].text).toMatch(/RUN OUT/);
  });

  it('lets the batters complete the run when the throw is too late', () => {
    const s = live({ state: 'held', holder: 3 });
    s.fielders[3].x = 0;
    s.fielders[3].y = 58;
    s.running = true;
    s.runP = 0.8;
    throwTo(s, 0, always(0.99));
    run(s, 4);
    expect(s.wickets).toBe(0);
    expect(s.log[0]).toMatchObject({ runs: 1, out: false });
  });

  it('counts the ball returned when you hold on to it with nobody running', () => {
    const s = live({ state: 'held', holder: 3 });
    s.runs = 1;
    run(s, 4);
    expect(s.log[0]).toMatchObject({ runs: 1, out: false });
    expect(s.balled).toBe(1);
  });

  it('only throws while holding the ball', () => {
    const s = live({ vx: 0, vy: 10, vz: 5 });
    throwTo(s, 1, always(0.5));
    expect(s.ball.state).toBe('air');
  });

  it('turns keys into a run direction (up is toward the bowler)', () => {
    const s = create('normal');
    expect(moveVector(s, inputWith(['up']))).toEqual({ x: 0, y: 1 });
    const v = moveVector(s, inputWith(['left', 'down']));
    expect(v.x).toBeCloseTo(-Math.SQRT1_2);
    expect(v.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it('plays a full innings by the rules: at most 12 balls and 3 wickets, totals match the log', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      for (let g = 0; g < 6; g++) {
        const rng = createRng(`test-${d}-${g}`);
        const s = create(d);
        for (let t = 0; t < 300 && !s.over; t += 1 / 60) update(s, 1 / 60, botInput(s, rng.next, 0.5), rng.next);
        expect(s.over).toBe(true);
        expect(s.balled).toBeLessThanOrEqual(s.cfg.balls);
        expect(s.wickets).toBeLessThanOrEqual(s.cfg.wickets);
        expect(s.log.reduce((n, l) => n + l.runs, 0)).toBe(s.total);
        expect(s.log.filter((l) => l.out).length).toBe(s.wickets);
        if (s.result === 'lost') expect(s.total).toBeGreaterThanOrEqual(s.cfg.target);
        else expect(s.total).toBeLessThan(s.cfg.target);
      }
    }
  });

  it('is winnable: a good fielder defends the target on Easy and Normal most of the time', () => {
    for (const [d, min] of [
      ['easy', 0.8],
      ['normal', 0.6],
    ] as const) {
      let wins = 0;
      const N = 30;
      for (let g = 0; g < N; g++) {
        const rng = createRng(`win-${d}-${g}`);
        const s = create(d);
        for (let t = 0; t < 300 && !s.over; t += 1 / 60) update(s, 1 / 60, botInput(s, rng.next, 1), rng.next);
        if (s.result === 'won') wins++;
      }
      expect(wins / N).toBeGreaterThanOrEqual(min);
    }
  });
});
