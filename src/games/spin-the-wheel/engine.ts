/**
 * Spin the Wheel: a points simulation with virtual points only. You start
 * with 100 points and get ten spins. Before each spin you choose a stake; the
 * wheel's multiplier decides what comes back.
 */
export type Level = 'easy' | 'normal' | 'hard';

export const WHEELS: Record<Level, number[]> = {
  easy: [0, 1.5, 0.5, 2, 1, 3, 0, 1.5],
  normal: [0, 1.5, 0.5, 2, 1, 3, 0, 0.5],
  hard: [0, 1.5, 0.5, 2, 0, 2.5, 0, 1],
};

export const START_POINTS = 100;
export const SPINS = 10;
export const STAKES = [10, 25, 50];

export interface WheelState {
  points: number;
  spinsLeft: number;
  best: number;
  log: { stake: number; multiplier: number; payout: number }[];
}

export function newWheel(): WheelState {
  return { points: START_POINTS, spinsLeft: SPINS, best: START_POINTS, log: [] };
}

/** Which segment a spin lands on, uniformly at random. */
export function pickSegment(level: Level, random: () => number): number {
  return Math.floor(random() * WHEELS[level].length) % WHEELS[level].length;
}

export function spin(s: WheelState, level: Level, stake: number, segment: number): WheelState {
  const bet = Math.min(stake, s.points);
  const multiplier = WHEELS[level][segment];
  const payout = Math.round(bet * multiplier);
  const points = s.points - bet + payout;
  return {
    points,
    spinsLeft: s.spinsLeft - 1,
    best: Math.max(s.best, points),
    log: [...s.log, { stake: bet, multiplier, payout }],
  };
}

export const finished = (s: WheelState) => s.spinsLeft <= 0 || s.points <= 0;

/** Expected multiplier of a wheel, shown to players so the odds are clear. */
export const expectedMultiplier = (level: Level) =>
  WHEELS[level].reduce((a, b) => a + b, 0) / WHEELS[level].length;
