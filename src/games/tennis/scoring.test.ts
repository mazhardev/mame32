import { describe, expect, it } from 'vitest';
import { callScore, newMatch, pointTo, server } from './scoring';

describe('tennis scoring', () => {
  it('counts 15, 30, 40 and a no-ad deciding point', () => {
    const m = newMatch();
    pointTo(m, 0);
    expect(callScore(m)).toBe('15–0');
    pointTo(m, 1);
    pointTo(m, 1);
    expect(callScore(m)).toBe('15–30');
    pointTo(m, 0);
    pointTo(m, 0);
    pointTo(m, 1);
    expect(callScore(m)).toBe('Deciding point');
    expect(pointTo(m, 1)).toBe('game');
    expect(m.games).toEqual([0, 1]);
  });

  it('alternates service each game and records love games', () => {
    const m = newMatch(0);
    for (let i = 0; i < 4; i++) pointTo(m, 0);
    expect(m.loveGames).toBe(1);
    expect(server(m)).toBe(1);
  });

  it('plays a tie-break at 3–3 and the first to 4 games wins otherwise', () => {
    const m = newMatch(0);
    const game = (who: 0 | 1) => {
      for (let i = 0; i < 4; i++) pointTo(m, who);
    };
    game(0);
    game(1);
    game(0);
    game(1);
    game(0);
    game(1);
    expect(m.tiebreak).toBe(true);
    for (let i = 0; i < 6; i++) pointTo(m, i % 2 === 0 ? 0 : 1);
    expect(m.winner).toBeNull();
    for (let i = 0; i < 3; i++) pointTo(m, 1);
    for (let i = 0; i < 2; i++) pointTo(m, 0);
    expect(callScore(m)).toBe('Tie-break 5–6');
    pointTo(m, 0);
    pointTo(m, 1);
    expect(m.winner).toBeNull();
    pointTo(m, 1);
    expect(m.winner).toBe(1);
    expect(m.games).toEqual([3, 4]);

    const quick = newMatch(0);
    for (let g = 0; g < 4; g++) for (let i = 0; i < 4; i++) pointTo(quick, 0);
    expect(quick.winner).toBe(0);
  });

  it('tie-break service alternates every two points after the first', () => {
    const m = newMatch(0);
    m.tiebreak = true;
    m.gameServer = 1;
    const servers = [];
    for (let i = 0; i < 5; i++) {
      servers.push(server(m));
      pointTo(m, i % 2 === 0 ? 0 : 1);
    }
    expect(servers).toEqual([1, 0, 0, 1, 1]);
  });
});
