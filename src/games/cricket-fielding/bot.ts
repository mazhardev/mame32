import type { Input } from '../_shared/arcade/kit';
import { emptyInput } from '../_shared/arcade/kit';
import { PITCH } from '../_shared/cricket/cricket';
import { intercept, throwTo, type State } from './engine';

/**
 * A computer fielder for tests and tuning. At skill 1 it reacts at once, runs
 * to the ideal intercept and throws straight away to the nearer end. At skill
 * 0 it plays like a beginner: it reacts late, chases the ball itself rather
 * than where the ball is going, and is slow (and sometimes wrong) with the throw.
 */
export function botInput(s: State, random: () => number, skill = 1): Input {
  const input = emptyInput();
  // A negative skill means "no hands": the player never touches the controls.
  if (s.phase !== 'live' || skill < 0) return input;
  const b = s.ball;
  if (b.state === 'held') {
    if (s.heldT >= 0.6 * (1 - skill)) {
      const f = s.fielders[b.holder];
      const near: 0 | 1 = Math.hypot(f.x, f.y) < Math.hypot(f.x, f.y - PITCH) ? 0 : 1;
      const wrong = random() < 0.25 * (1 - skill);
      throwTo(s, wrong ? ((1 - near) as 0 | 1) : near, random);
    }
    return input;
  }
  if (b.state === 'air' || b.state === 'ground') {
    if (s.phaseT < 0.15 + 0.4 * (1 - skill)) return input;
    const i = intercept(s.fielders[s.active], b, s.cfg);
    // Beginners aim between where the ball is and where it is going.
    const k = 0.35 + 0.65 * skill;
    s.goal = { x: b.x + (i.x - b.x) * k, y: b.y + (i.y - b.y) * k };
  }
  return input;
}
