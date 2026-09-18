import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { numericQuestion, repeat } from '../_shared/quiz/math';
import type { QuizQuestion } from '../_shared/quiz/engine';

const THINGS: [emoji: string, plural: string][] = [
  ['🍎', 'apples'],
  ['⭐', 'stars'],
  ['🐟', 'fish'],
  ['🎈', 'balloons'],
  ['🐞', 'ladybirds'],
  ['🌸', 'flowers'],
  ['🚗', 'cars'],
  ['🍪', 'cookies'],
  ['🐤', 'chicks'],
  ['⚽', 'balls'],
];

function row(emoji: string, n: number) {
  return (
    <div
      aria-label={`${n} ${emoji}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        fontSize: '2.2rem',
        maxWidth: 420,
      }}
    >
      {Array.from({ length: n }, (_, i) => (
        <span key={i} aria-hidden="true">
          {emoji}
        </span>
      ))}
    </div>
  );
}

function countQuestion(rng: Rng, max: number): QuizQuestion {
  const [emoji, plural] = rng.pick(THINGS);
  const n = rng.int(1, max + 1);
  return numericQuestion(`How many ${plural} can you count?`, n, rng, 2, undefined, row(emoji, n));
}

/** "Which group has more?" — two groups side by side. */
function compareQuestion(rng: Rng, max: number): QuizQuestion {
  const [a, b] = rng.shuffle([...THINGS]).slice(0, 2);
  let na = rng.int(1, max + 1);
  let nb = rng.int(1, max + 1);
  while (na === nb) nb = rng.int(1, max + 1);
  if (rng.bool()) [na, nb] = [nb, na];
  const more = na > nb ? a[1] : b[1];
  const choices = rng.shuffle([a[1], b[1]]);
  return {
    prompt: 'Which group has more?',
    choices,
    answer: choices.indexOf(more),
    explain: `There are ${na} ${a[1]} and ${nb} ${b[1]}.`,
    visual: (
      <div style={{ display: 'grid', gap: 10 }}>
        {row(a[0], na)}
        <hr style={{ border: 0, borderTop: '1px dashed var(--border)' }} />
        {row(b[0], nb)}
      </div>
    ),
  };
}

function addQuestion(rng: Rng, max: number): QuizQuestion {
  const [emoji, plural] = rng.pick(THINGS);
  const a = rng.int(1, Math.ceil(max / 2) + 1);
  const b = rng.int(1, Math.ceil(max / 2) + 1);
  return numericQuestion(
    `${a} ${plural} and ${b} more. How many altogether?`,
    a + b,
    rng,
    2,
    `${a} + ${b} = ${a + b}`,
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {row(emoji, a)}
      <strong style={{ fontSize: '2rem' }}>+</strong>
      {row(emoji, b)}
    </div>,
  );
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const max = d === 'easy' ? 6 : d === 'normal' ? 10 : 15;
  return repeat(10, () => {
    const kind = rng.int(0, d === 'easy' ? 2 : 3);
    return kind === 0
      ? countQuestion(rng, max)
      : kind === 1
        ? compareQuestion(rng, max)
        : addQuestion(rng, max);
  });
}
