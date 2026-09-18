import type { Rng } from '@/utils/random';

export const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
export const VOWEL_COST = 100;
export const PRIZES = [100, 150, 200, 250, 300, 400, 500];

export const isLetter = (ch: string) => ch >= 'A' && ch <= 'Z';

export class PhraseRound {
  guessed = new Set<string>();
  points = 0;
  lives: number;
  solved = false;
  prize: number;

  constructor(
    public readonly phrase: string,
    public readonly category: string,
    lives: number,
    private rng: Rng,
  ) {
    this.lives = lives;
    this.prize = rng.pick(PRIZES);
  }

  get over(): boolean {
    return this.solved || this.lives <= 0;
  }

  get hiddenCount(): number {
    return [...this.phrase].filter((c) => isLetter(c) && !this.guessed.has(c)).length;
  }

  /** The phrase with unknown letters as underscores. */
  get board(): string {
    return [...this.phrase]
      .map((c) => (isLetter(c) && !this.guessed.has(c) && !this.solved ? '_' : c))
      .join('');
  }

  occurrences(letter: string): number {
    return [...this.phrase].filter((c) => c === letter).length;
  }

  /**
   * Consonants earn the current prize for every copy revealed. Vowels are
   * bought for a fixed cost. Any miss costs a life.
   */
  guess(letter: string): { ok: boolean; count: number; message: string } {
    const l = letter.toUpperCase();
    if (this.over) return { ok: false, count: 0, message: 'Round over' };
    if (!isLetter(l)) return { ok: false, count: 0, message: 'Pick a letter' };
    if (this.guessed.has(l)) return { ok: false, count: 0, message: `${l} was already guessed` };
    const vowel = VOWELS.has(l);
    if (vowel && this.points < VOWEL_COST) {
      return { ok: false, count: 0, message: `Vowels cost ${VOWEL_COST} points` };
    }
    this.guessed.add(l);
    if (vowel) this.points -= VOWEL_COST;
    const count = this.occurrences(l);
    if (count === 0) {
      this.lives--;
      this.prize = this.rng.pick(PRIZES);
      return { ok: false, count: 0, message: `No ${l}` };
    }
    if (!vowel) this.points += this.prize * count;
    const earned = vowel ? '' : ` +${this.prize * count}`;
    this.prize = this.rng.pick(PRIZES);
    if (this.hiddenCount === 0) this.solved = true;
    return { ok: true, count, message: `${count} × ${l}${earned}` };
  }

  /** Solving pays a bonus for every letter still hidden. */
  solve(attempt: string): boolean {
    if (this.over) return false;
    const clean = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '');
    if (clean(attempt) === clean(this.phrase)) {
      this.points += 300 + this.hiddenCount * 50;
      this.solved = true;
      return true;
    }
    this.lives--;
    return false;
  }
}
