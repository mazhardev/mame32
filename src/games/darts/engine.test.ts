import { describe, expect, it } from 'vitest';
import { aiTarget, applyDart, scoreAt, targetPoint } from './engine';

describe('darts', () => {
  it('scores bull, segments, trebles and doubles', () => {
    expect(scoreAt(0, 0).label).toBe('Bull');
    expect(scoreAt(0, -10).label).toBe('25');
    expect(scoreAt(0, -103).label).toBe('T20');
    expect(scoreAt(0, -166).label).toBe('D20');
    expect(scoreAt(0, -60).label).toBe('20');
    expect(scoreAt(60, 0).label).toBe('6');
    expect(scoreAt(0, 60).label).toBe('3');
    expect(scoreAt(-60, 0).label).toBe('11');
    expect(scoreAt(0, -200).label).toBe('Miss');
  });

  it('every target point scores its own label', () => {
    for (const t of ['T20', 'T19', 'D16', 'D1', 'Bull', '25', '7']) expect(scoreAt(...targetPoint(t)).label).toBe(t);
  });

  it('applies double-out and bust rules', () => {
    expect(applyDart(40, { value: 40, multiplier: 2, label: 'D20' })).toBe(0);
    expect(applyDart(40, { value: 40, multiplier: 1, label: '?' })).toBeNull();
    expect(applyDart(20, { value: 19, multiplier: 1, label: '19' })).toBeNull();
    expect(applyDart(20, { value: 60, multiplier: 3, label: 'T20' })).toBeNull();
    expect(applyDart(301, { value: 60, multiplier: 3, label: 'T20' })).toBe(241);
  });

  it('the computer picks sensible finishes', () => {
    expect(aiTarget(32)).toBe('D16');
    expect(aiTarget(50)).toBe('Bull');
    expect(aiTarget(301)).toBe('T20');
    expect(aiTarget(45)).toBe('13');
  });
});

import { create, throwDart } from './game';

describe('darts game flow', () => {
  it('turns pass after three darts and busts restore the score', () => {
    const s = create('normal');
    throwDart(s, 0, -103);
    throwDart(s, 0, -103);
    throwDart(s, 0, -103);
    expect(s.scores[0]).toBe(301 - 180);
    expect(s.turn).toBe(1);
    s.turn = 0;
    s.turnStart = s.scores[0] = 30;
    throwDart(s, 0, -103);
    expect(s.scores[0]).toBe(30);
    expect(s.turn).toBe(1);
  });

  it('checking out on a double wins', () => {
    const s = create('normal');
    s.scores[0] = s.turnStart = 40;
    throwDart(s, 0, -166);
    expect(s.over).toBe(true);
    expect(s.score).toBeGreaterThan(0);
  });
});
