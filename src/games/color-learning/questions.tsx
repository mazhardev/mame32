import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { repeat } from '../_shared/quiz/math';
import type { QuizQuestion } from '../_shared/quiz/engine';

type Swatch = [name: string, hex: string, level: 1 | 2 | 3];

export const COLORS: Swatch[] = [
  ['Red', '#e53935', 1],
  ['Blue', '#1e63d6', 1],
  ['Yellow', '#fdd835', 1],
  ['Green', '#2e9d44', 1],
  ['Orange', '#fb8c00', 1],
  ['Purple', '#7b3fbf', 1],
  ['Black', '#111111', 1],
  ['White', '#ffffff', 1],
  ['Pink', '#f06292', 2],
  ['Brown', '#795548', 2],
  ['Gray', '#8e8e8e', 2],
  ['Light blue', '#81d4fa', 2],
  ['Dark green', '#1b5e20', 2],
  ['Navy', '#0d1b5e', 3],
  ['Maroon', '#7b1020', 3],
  ['Teal', '#00897b', 3],
  ['Olive', '#7a7a1f', 3],
  ['Turquoise', '#30d5c8', 3],
  ['Lavender', '#b9a6e8', 3],
  ['Coral', '#ff7f60', 3],
  ['Gold', '#d4a017', 3],
  ['Beige', '#e8dcc0', 3],
];

/** Paint mixing, using the red-yellow-blue model taught to young children. */
const MIXES: [a: string, b: string, result: string][] = [
  ['Red', 'Yellow', 'Orange'],
  ['Blue', 'Yellow', 'Green'],
  ['Red', 'Blue', 'Purple'],
  ['Red', 'White', 'Pink'],
  ['Black', 'White', 'Gray'],
  ['Blue', 'White', 'Light blue'],
];

const hexOf = (name: string) => COLORS.find((c) => c[0] === name)![1];

function swatch(hex: string, size = 110) {
  return (
    <span
      role="img"
      aria-label="colour swatch"
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: 22,
        background: hex,
        border: '2px solid var(--border-strong)',
        boxShadow: 'var(--shadow-sm)',
      }}
    />
  );
}

function nameQuestion(rng: Rng, maxLevel: number): QuizQuestion {
  const pool = COLORS.filter((c) => c[2] <= maxLevel);
  const [name, hex] = rng.pick(pool);
  // Distractors come from the same pool so easy rounds stay easy.
  const wrong = rng
    .shuffle(pool.filter((c) => c[0] !== name))
    .slice(0, 3)
    .map((c) => c[0]);
  const choices = rng.shuffle([name, ...wrong]);
  return {
    prompt: 'What colour is this?',
    choices,
    answer: choices.indexOf(name),
    visual: swatch(hex),
  };
}

function mixQuestion(rng: Rng): QuizQuestion {
  const [a, b, result] = rng.pick(MIXES);
  const wrong = rng
    .shuffle(
      ['Orange', 'Green', 'Purple', 'Pink', 'Gray', 'Brown', 'Light blue'].filter(
        (c) => c !== result,
      ),
    )
    .slice(0, 3);
  const choices = rng.shuffle([result, ...wrong]);
  return {
    prompt: `What colour do you get when you mix ${a.toLowerCase()} and ${b.toLowerCase()} paint?`,
    choices,
    answer: choices.indexOf(result),
    explain: `${a} + ${b} = ${result.toLowerCase()}.`,
    visual: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {swatch(hexOf(a), 70)}
        <strong style={{ fontSize: '2rem' }}>+</strong>
        {swatch(hexOf(b), 70)}
      </div>
    ),
  };
}

function findQuestion(rng: Rng, maxLevel: number): QuizQuestion {
  const pool = rng.shuffle(COLORS.filter((c) => c[2] <= maxLevel)).slice(0, 4);
  const target = pool[0][0];
  const labels = ['Left', 'Second', 'Third', 'Right'];
  const order = rng.shuffle([0, 1, 2, 3]);
  const answerPos = order.indexOf(0);
  return {
    prompt: `Which swatch is ${target.toLowerCase()}?`,
    choices: labels,
    answer: answerPos,
    visual: (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {order.map((i, pos) => (
          <div key={pos} style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
            {swatch(pool[i][1], 64)}
            <span className="small muted">{labels[pos]}</span>
          </div>
        ))}
      </div>
    ),
  };
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const maxLevel = d === 'easy' ? 1 : d === 'normal' ? 2 : 3;
  return repeat(10, () => {
    const k = rng.int(0, 4);
    if (k === 0) return mixQuestion(rng);
    if (k === 1) return findQuestion(rng, maxLevel);
    return nameQuestion(rng, maxLevel);
  });
}
