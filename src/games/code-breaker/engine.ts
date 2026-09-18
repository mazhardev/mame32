export type Mark = 'up' | 'down' | 'ok';

/** Per-digit feedback: correct, or whether the real digit is higher or lower. */
export function feedback(guess: string, secret: string): Mark[] {
  return [...guess].map((d, i) => (d === secret[i] ? 'ok' : d < secret[i] ? 'up' : 'down'));
}
