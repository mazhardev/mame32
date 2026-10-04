/** Click Speed Test: clicks per second over a fixed window. */
export type Level = 'easy' | 'normal' | 'hard';

/** Test length in seconds for each difficulty setting. */
export const DURATION: Record<Level, number> = { easy: 5, normal: 10, hard: 30 };

export function cps(clicks: number, seconds: number): number {
  return seconds > 0 ? Math.round((clicks / seconds) * 10) / 10 : 0;
}

/** A friendly label for a clicks-per-second result. */
export function rank(rate: number): string {
  if (rate >= 12) return 'Lightning fingers';
  if (rate >= 9) return 'Speed demon';
  if (rate >= 7) return 'Very fast';
  if (rate >= 5) return 'Quick';
  if (rate >= 3) return 'Steady';
  return 'Warming up';
}
