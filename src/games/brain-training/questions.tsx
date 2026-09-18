import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { arithmetic, mentalMath, repeat, sequence } from '../_shared/quiz/math';
import type { QuizQuestion } from '../_shared/quiz/engine';

const INKS: [name: string, hex: string][] = [
  ['Red', '#e53935'],
  ['Blue', '#1e63d6'],
  ['Green', '#2e9d44'],
  ['Yellow', '#e0b400'],
  ['Purple', '#7b3fbf'],
  ['Orange', '#fb8c00'],
];

/** Stroop test: name the ink colour, not the word. */
function stroop(rng: Rng): QuizQuestion {
  const [word, ink] = rng.shuffle([...INKS]).slice(0, 2);
  const others = rng.shuffle(INKS.filter((c) => c[0] !== ink[0] && c[0] !== word[0])).slice(0, 2);
  // The printed word is always one of the choices: that is the trap.
  const choices = rng.shuffle([ink[0], word[0], ...others.map((c) => c[0])]);
  return {
    prompt: 'What colour is the ink? (Ignore what the word says.)',
    choices,
    answer: choices.indexOf(ink[0]),
    visual: (
      <strong style={{ color: ink[1], fontSize: '3.4rem', letterSpacing: 2 }}>
        {word[0].toUpperCase()}
      </strong>
    ),
  };
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

/** Which fraction is bigger? Pairs are never equal. */
function fractions(rng: Rng): QuizQuestion {
  let a: [number, number];
  let b: [number, number];
  do {
    const d1 = rng.int(2, 10);
    const d2 = rng.int(2, 10);
    a = [rng.int(1, d1), d1];
    b = [rng.int(1, d2), d2];
  } while (a[0] * b[1] === b[0] * a[1] || gcd(a[0], a[1]) !== 1 || gcd(b[0], b[1]) !== 1);
  const fa = `${a[0]}/${a[1]}`;
  const fb = `${b[0]}/${b[1]}`;
  const bigger = a[0] / a[1] > b[0] / b[1] ? fa : fb;
  const choices = [fa, fb];
  return {
    prompt: 'Which fraction is bigger?',
    choices,
    answer: choices.indexOf(bigger),
    explain: `${fa} ≈ ${(a[0] / a[1]).toFixed(2)} and ${fb} ≈ ${(b[0] / b[1]).toFixed(2)}.`,
  };
}

/** Count a particular shape in a scattered grid. */
function spotCount(rng: Rng): QuizQuestion {
  const target = rng.pick(['▲', '●', '■', '◆']);
  const others = ['▲', '●', '■', '◆'].filter((s) => s !== target);
  const n = rng.int(3, 9);
  const cells = rng.shuffle([
    ...Array(n).fill(target),
    ...Array.from({ length: 20 - n }, () => rng.pick(others)),
  ]);
  const answer = String(n);
  const choices = rng.shuffle([answer, String(n + 1), String(n - 1), String(n + 2)]);
  return {
    prompt: `How many ${target} are there?`,
    choices,
    answer: choices.indexOf(answer),
    visual: (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 36px)',
          gap: 4,
          fontSize: '1.5rem',
        }}
      >
        {cells.map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
    ),
  };
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const drills = [
    () => arithmetic(rng, d),
    () => mentalMath(rng, d),
    () => sequence(rng, d),
    () => stroop(rng),
    () => fractions(rng),
    () => spotCount(rng),
  ];
  return repeat(15, () => rng.pick(drills)());
}
