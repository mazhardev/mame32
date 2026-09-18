export const TRIAL_COUNT = 5;
export const FALSE_START_PENALTY = 100;
export type Phase = 'idle' | 'waiting' | 'ready' | 'between' | 'finished';

export interface ReactionState {
  phase: Phase;
  times: number[];
  falseStarts: number;
  message: string;
}

export function summarize(times: number[], falseStarts: number) {
  if (!times.length) return null;
  const average = Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
  return {
    average,
    fastest: Math.min(...times),
    score: Math.max(0, 1000 - average - falseStarts * FALSE_START_PENALTY),
  };
}

/** Clock values are supplied by the UI, so scoring is independent of timers. */
export class ReactionEngine {
  state: ReactionState = {
    phase: 'idle',
    times: [],
    falseStarts: 0,
    message: 'Ready to test your reflexes?',
  };
  private signalAt: number | null = null;

  begin(random: () => number = Math.random): number | null {
    if (this.state.phase !== 'idle' && this.state.phase !== 'between') return null;
    this.signalAt = null;
    this.state = { ...this.state, phase: 'waiting', message: 'Wait for GO…' };
    return 1600 + Math.floor(random() * 2600);
  }

  signal(now: number) {
    if (this.state.phase !== 'waiting') return;
    this.signalAt = now;
    this.state = { ...this.state, phase: 'ready', message: 'GO! Tap now' };
  }

  tap(now: number): 'early' | 'hit' | 'ignored' {
    if (this.state.phase === 'waiting') {
      this.state = {
        ...this.state,
        phase: 'between',
        falseStarts: this.state.falseStarts + 1,
        message: 'Too soon! 100-point penalty. Try this trial again.',
      };
      return 'early';
    }
    if (this.state.phase !== 'ready' || this.signalAt === null) return 'ignored';
    const time = Math.max(0, Math.round(now - this.signalAt));
    const times = [...this.state.times, time];
    this.signalAt = null;
    this.state = {
      ...this.state,
      times,
      phase: times.length === TRIAL_COUNT ? 'finished' : 'between',
      message: `${time} ms`,
    };
    return 'hit';
  }

  cancelTrial() {
    if (this.state.phase !== 'waiting' && this.state.phase !== 'ready') return;
    this.signalAt = null;
    this.state = {
      ...this.state,
      phase: 'between',
      message: 'Trial paused. Start this trial again when ready.',
    };
  }
}
