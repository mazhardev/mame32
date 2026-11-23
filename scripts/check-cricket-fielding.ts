/** Tuning report: how often a bot fielder defends the target on each difficulty. */
import { createRng } from '../src/utils/random';
import { create, update, type State } from '../src/games/cricket-fielding/engine';
import { botInput } from '../src/games/cricket-fielding/bot';

const DIFFS = ['easy', 'normal', 'hard'] as const;
const skills = (process.argv[2] ?? '1,0.6,0').split(',').map(Number);
for (const skill of skills) {
  for (const d of DIFFS) {
    let wins = 0;
    let runs = 0;
    let wk = 0;
    let secs = 0;
    const tally: Record<string, number> = {};
    const N = 150;
    for (let g = 0; g < N; g++) {
      const rng = createRng(`cf-${d}-${g}`);
      const r = rng.next;
      const s: State = create(d);
      let t = 0;
      while (!s.over && t < 600) {
        update(s, 1 / 60, botInput(s, r, skill), r);
        s.events.length = 0;
        t += 1 / 60;
      }
      secs += t;
      if (s.result === 'won') wins++;
      runs += s.total;
      wk += s.wickets;
      for (const l of s.log) {
        const k = l.text.replace(/ by .*/, '').replace(/!.*/, '!');
        tally[k] = (tally[k] ?? 0) + 1;
      }
    }
    console.log(`skill ${skill} ${d}: win ${((100 * wins) / N).toFixed(0)}%  avg runs ${(runs / N).toFixed(1)}  avg wkts ${(wk / N).toFixed(2)}  avg ${(secs / N).toFixed(0)} s`);
    console.log('   ', Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
  }
}
