/**
 * Typing speed maths shared by the typing games. A "word" is five
 * characters, the standard used by typing tests.
 */
export function wpm(correctChars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round(correctChars / 5 / (seconds / 60));
}

export function accuracy(correct: number, total: number): number {
  return total === 0 ? 100 : Math.round((correct / total) * 100);
}

/** Per-character comparison of what was typed against the target. */
export function compareTyped(target: string, typed: string): ('ok' | 'bad' | 'todo')[] {
  return [...target].map((ch, i) => (i >= typed.length ? 'todo' : typed[i] === ch ? 'ok' : 'bad'));
}

/**
 * Characters appended to an input since the previous value. Mobile
 * keyboards often don't report individual key presses, so games diff the
 * input value instead.
 */
export function appended(previous: string, next: string): string {
  return next.startsWith(previous) ? next.slice(previous.length) : '';
}
