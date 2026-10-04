import { describe, expect, it } from 'vitest';
import { batteryScore, judge, makeStimulus, partAverage } from './engine';

describe('reaction test pro', () => {
  it('judges each trial type', () => {
    const go = makeStimulus('simple', () => 0.5);
    expect(judge(go, { kind: 'press', ms: 300 }).correct).toBe(true);
    expect(judge(go, { kind: 'early' }).correct).toBe(false);
    expect(judge(go, { kind: 'timeout' }).correct).toBe(false);
    const left = makeStimulus('choice', () => 0.1);
    expect(left.side).toBe('left');
    expect(judge(left, { kind: 'press', side: 'right', ms: 300 }).correct).toBe(false);
    const nogo = makeStimulus('gonogo', () => 0.1);
    expect(nogo.go).toBe(false);
    expect(judge(nogo, { kind: 'timeout' }).correct).toBe(true);
    expect(judge(nogo, { kind: 'press', ms: 250 }).correct).toBe(false);
  });

  it('averages per part and rewards speed', () => {
    const fast = [
      { part: 'simple' as const, ms: 250, correct: true },
      { part: 'simple' as const, ms: 350, correct: true },
    ];
    expect(partAverage(fast, 'simple')).toBe(300);
    const slow = fast.map((r) => ({ ...r, ms: 700 }));
    expect(batteryScore(fast)).toBeGreaterThan(batteryScore(slow));
  });
});
