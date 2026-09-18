import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import type { QuizQuestion } from '../_shared/quiz/engine';
import { FLAGS, FlagImage } from './flags';
import type { Flag } from './flags';

/** Flags that look alike make fair but tricky distractors. */
function similar(flag: Flag, rng: Rng, pool: Flag[]): Flag[] {
  const sameKind = pool.filter(
    (f) => f.country !== flag.country && f.design.kind === flag.design.kind,
  );
  const rest = pool.filter((f) => f.country !== flag.country && f.design.kind !== flag.design.kind);
  return [...rng.shuffle(sameKind), ...rng.shuffle(rest)].slice(0, 3);
}

function nameTheFlag(flag: Flag, rng: Rng, pool: Flag[]): QuizQuestion {
  const choices = rng.shuffle([flag.country, ...similar(flag, rng, pool).map((f) => f.country)]);
  return {
    prompt: 'Which country does this flag belong to?',
    choices,
    answer: choices.indexOf(flag.country),
    visual: <FlagImage flag={flag} />,
  };
}

function pickTheFlag(flag: Flag, rng: Rng, pool: Flag[]): QuizQuestion {
  const options = rng.shuffle([flag, ...similar(flag, rng, pool)]);
  const labels = ['A', 'B', 'C', 'D'];
  return {
    prompt: `Which is the flag of ${flag.country}?`,
    choices: labels,
    answer: options.indexOf(flag),
    visual: (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, auto)',
          gap: 10,
          justifyContent: 'center',
        }}
      >
        {options.map((f, i) => (
          <div key={f.country} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
            <FlagImage flag={f} width={110} />
            <strong className="small">{labels[i]}</strong>
          </div>
        ))}
      </div>
    ),
  };
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const maxLevel = d === 'easy' ? 1 : d === 'normal' ? 2 : 3;
  // Easy distractors stay among well-known flags too.
  const pool = FLAGS.filter((f) => f.level <= Math.max(2, maxLevel));
  const asked = rng
    .shuffle(FLAGS.filter((f) => (d === 'hard' ? f.level >= 2 : f.level <= maxLevel)))
    .slice(0, 10);
  return asked.map((f) =>
    d !== 'easy' && rng.bool(0.35) ? pickTheFlag(f, rng, pool) : nameTheFlag(f, rng, pool),
  );
}
