import type { Rng } from '@/utils/random';

/**
 * Scores a guess against a secret code: `exact` symbols are right and in the
 * right place; `partial` are in the code but elsewhere. Repeated symbols are
 * counted only as many times as they appear in the secret.
 */
export function scoreCode<T>(guess: T[], secret: T[]): { exact: number; partial: number } {
  let exact = 0;
  const secretLeft = new Map<T, number>();
  const guessLeft = new Map<T, number>();
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) exact++;
    else {
      secretLeft.set(secret[i], (secretLeft.get(secret[i]) ?? 0) + 1);
      guessLeft.set(guess[i], (guessLeft.get(guess[i]) ?? 0) + 1);
    }
  }
  let partial = 0;
  for (const [sym, n] of guessLeft) partial += Math.min(n, secretLeft.get(sym) ?? 0);
  return { exact, partial };
}

/** A random code of `length` symbols from `alphabet`, optionally without repeats. */
export function randomCode<T>(rng: Rng, alphabet: T[], length: number, unique: boolean): T[] {
  if (unique) return rng.shuffle([...alphabet]).slice(0, length);
  return Array.from({ length }, () => rng.pick(alphabet));
}
