import type { Rng } from '@/utils/random';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** A substitution key where no letter maps to itself (a derangement). */
export function makeKey(rng: Rng): Record<string, string> {
  for (;;) {
    const shuffled = rng.shuffle([...ALPHABET]);
    if (shuffled.every((c, i) => c !== ALPHABET[i])) {
      return Object.fromEntries(ALPHABET.map((p, i) => [p, shuffled[i]]));
    }
  }
}

export function encode(text: string, key: Record<string, string>): string {
  return [...text.toUpperCase()].map((c) => key[c] ?? c).join('');
}

/** Cipher letters that actually appear in the message. */
export function cipherLetters(cipher: string): string[] {
  return [...new Set([...cipher].filter((c) => c >= 'A' && c <= 'Z'))];
}

/** Player guesses map cipher letter → plain letter. Solved when every one is right. */
export function isSolved(cipher: string, plain: string, guesses: Record<string, string>): boolean {
  const p = plain.toUpperCase();
  return [...cipher].every((c, i) => !(c >= 'A' && c <= 'Z') || guesses[c] === p[i]);
}

/** The plain letter for a cipher letter (for hints and checking). */
export function answerFor(cipherLetter: string, key: Record<string, string>): string {
  return Object.keys(key).find((p) => key[p] === cipherLetter) ?? '';
}
