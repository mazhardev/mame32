import { describe, expect, it } from 'vitest';
import { ReactionEngine, summarize, TRIAL_COUNT } from './engine';

describe('Reaction Timer rules', () => {
  it('randomizes the wait and ignores taps before starting', () => {
    const engine = new ReactionEngine();
    expect(engine.tap(100)).toBe('ignored');
    expect(engine.begin(() => 0.5)).toBe(2900);
    expect(engine.begin()).toBeNull();
  });
  it('penalizes a false start without counting it as a trial', () => {
    const engine = new ReactionEngine();
    engine.begin();
    expect(engine.tap(50)).toBe('early');
    expect(engine.state.falseStarts).toBe(1);
    expect(engine.state.times).toEqual([]);
    engine.signal(100);
    expect(engine.state.phase).toBe('between');
  });
  it('measures from the actual signal, including when a browser timer runs late', () => {
    const engine = new ReactionEngine();
    engine.begin(() => 0);
    engine.signal(5000);
    expect(engine.tap(5267)).toBe('hit');
    expect(engine.state.times).toEqual([267]);
    expect(engine.tap(5300)).toBe('ignored');
  });
  it.each(['waiting', 'ready'])('cancels a %s trial on pause without a penalty', (phase) => {
    const engine = new ReactionEngine();
    engine.begin();
    if (phase === 'ready') engine.signal(100);
    engine.cancelTrial();
    expect(engine.state.phase).toBe('between');
    expect(engine.state.falseStarts).toBe(0);
    expect(engine.state.times).toEqual([]);
  });
  it('ends after five valid trials and calculates score with penalties', () => {
    const engine = new ReactionEngine();
    engine.begin();
    engine.tap(0);
    for (let i = 0; i < TRIAL_COUNT; i++) {
      engine.begin();
      engine.signal(1000 * i);
      engine.tap(1000 * i + 200 + i * 50);
    }
    expect(engine.state.phase).toBe('finished');
    expect(engine.begin()).toBeNull();
    expect(summarize(engine.state.times, engine.state.falseStarts)).toEqual({
      average: 300,
      fastest: 200,
      score: 600,
    });
  });
  it('does not create negative scores or averages without trials', () => {
    expect(summarize([], 0)).toBeNull();
    expect(summarize([2000, 3000], 2)?.score).toBe(0);
  });
});
