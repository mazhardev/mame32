import type { Rng } from '@/utils/random';

export const WIDTH = 640;
export const HEIGHT = 400;
export const GROUND = 370;

export interface Falling {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
}

export interface FallConfig {
  /** Starting fall speed (px/s) and how much it grows per word cleared. */
  speed: number;
  ramp: number;
  /** Seconds between new words at the start, and the minimum. */
  spawn: number;
  minSpawn: number;
  lives: number;
}

export const CONFIGS: Record<'easy' | 'normal' | 'hard', FallConfig> = {
  easy: { speed: 22, ramp: 0.6, spawn: 2.8, minSpawn: 1.4, lives: 5 },
  normal: { speed: 30, ramp: 0.9, spawn: 2.2, minSpawn: 1.0, lives: 3 },
  hard: { speed: 40, ramp: 1.2, spawn: 1.7, minSpawn: 0.7, lives: 3 },
};

export class FallingWords {
  words: Falling[] = [];
  lives: number;
  score = 0;
  cleared = 0;
  combo = 0;
  bestCombo = 0;
  over = false;
  private nextId = 1;
  private timer = 0.3;

  constructor(
    public readonly config: FallConfig,
    private pickWord: (length: number) => string,
    private rng: Rng,
  ) {
    this.lives = config.lives;
  }

  get spawnInterval(): number {
    return Math.max(this.config.minSpawn, this.config.spawn - this.cleared * 0.04);
  }

  /** Longer words appear as the player clears more. */
  private wordLength(): number {
    const base = 3 + Math.floor(this.cleared / 8);
    return Math.min(8, base + this.rng.int(0, 3));
  }

  spawn(): void {
    const text = this.pickWord(this.wordLength());
    // Rough text width at 22px monospace, so words stay on screen.
    const width = text.length * 13;
    this.words.push({
      id: this.nextId++,
      text,
      x: this.rng.range(10, WIDTH - width - 10),
      y: 0,
      speed: this.config.speed + this.cleared * this.config.ramp + this.rng.range(0, 8),
    });
  }

  /** Advances words; returns how many hit the ground this step. */
  update(dt: number): number {
    if (this.over) return 0;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.spawn();
      this.timer = this.spawnInterval;
    }
    let missed = 0;
    for (const w of this.words) w.y += w.speed * dt;
    this.words = this.words.filter((w) => {
      if (w.y >= GROUND) {
        missed++;
        return false;
      }
      return true;
    });
    if (missed) {
      this.lives = Math.max(0, this.lives - missed);
      this.combo = 0;
      if (this.lives === 0) this.over = true;
    }
    return missed;
  }

  /** The lowest word that starts with what has been typed (for highlighting). */
  target(typed: string): Falling | undefined {
    if (!typed) return undefined;
    return this.words.filter((w) => w.text.startsWith(typed)).sort((a, b) => b.y - a.y)[0];
  }

  /** Clears a word typed in full. Returns the points earned, or 0. */
  type(typed: string): number {
    const hit = this.words.filter((w) => w.text === typed).sort((a, b) => b.y - a.y)[0];
    if (!hit || this.over) return 0;
    this.words = this.words.filter((w) => w !== hit);
    this.cleared++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const points = hit.text.length * 10 * Math.min(5, 1 + Math.floor(this.combo / 5));
    this.score += points;
    return points;
  }
}
