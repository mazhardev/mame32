/**
 * Reports how forgiving each Snip Snack solution is.
 *
 *   npx vite-node scripts/check-snip-snack.ts [level]
 *
 * For every step of every stored solution it shifts that step up to 12
 * frames early or late (keeping the others) and prints which shifts still
 * win with three stars: '#' is a three-star win, a digit a win with fewer
 * stars, '.' a loss. Use it after moving anything in levels.ts.
 */
import { replay, starsGot } from '../src/games/snip-snack/engine';
import { LEVELS } from '../src/games/snip-snack/levels';
import { SOLUTIONS } from '../src/games/snip-snack/solutions';

const only = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 0);
for (let i = 0; i < LEVELS.length; i++) {
  if (only && i !== only - 1) continue;
  const plan = SOLUTIONS[i];
  const s = replay(i, plan);
  console.log(`level ${i + 1} ${LEVELS[i].name}: ${s.phase} with ${starsGot(s)} stars`);
  plan.forEach((a, k) => {
    let line = '';
    for (let d = -12; d <= 12; d++) {
      const p = plan.map((b, j) => (j === k ? { ...b, f: Math.max(0, b.f + d) } : b));
      const r = replay(i, p);
      const mark = r.phase === 'won' ? (starsGot(r) === 3 ? '#' : String(starsGot(r))) : '.';
      line += d === 0 ? `|${mark}|` : mark;
    }
    console.log(`  ${a.kind} at frame ${a.f}`.padEnd(26), line);
  });
}
