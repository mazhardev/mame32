import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { repeat } from '../_shared/quiz/math';
import type { QuizQuestion } from '../_shared/quiz/engine';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Picture words for "starts with" questions. X is left out: few simple X words. */
const PICTURES: [letter: string, word: string, emoji: string][] = [
  ['A', 'apple', '🍎'],
  ['B', 'ball', '⚽'],
  ['C', 'cat', '🐱'],
  ['D', 'dog', '🐶'],
  ['E', 'egg', '🥚'],
  ['F', 'fish', '🐟'],
  ['G', 'grapes', '🍇'],
  ['H', 'hat', '🎩'],
  ['I', 'ice cream', '🍦'],
  ['J', 'jellyfish', '🪼'],
  ['K', 'kite', '🪁'],
  ['L', 'lion', '🦁'],
  ['M', 'moon', '🌙'],
  ['N', 'nose', '👃'],
  ['O', 'orange', '🍊'],
  ['P', 'pig', '🐷'],
  ['Q', 'queen', '👸'],
  ['R', 'rabbit', '🐰'],
  ['S', 'sun', '☀️'],
  ['T', 'tree', '🌳'],
  ['U', 'umbrella', '☂️'],
  ['V', 'violin', '🎻'],
  ['W', 'whale', '🐳'],
  ['Y', 'yo-yo', '🪀'],
  ['Z', 'zebra', '🦓'],
];

function otherLetters(rng: Rng, not: string): string[] {
  return rng.shuffle(LETTERS.filter((l) => l !== not)).slice(0, 3);
}

function choicesFor(rng: Rng, correct: string, wrong: string[]): QuizQuestion['choices'] {
  return rng.shuffle([correct, ...wrong]);
}

function startsWith(rng: Rng): QuizQuestion {
  const [letter, word, emoji] = rng.pick(PICTURES);
  const choices = choicesFor(rng, letter, otherLetters(rng, letter));
  return {
    prompt: `Which letter does "${word}" start with?`,
    choices,
    answer: choices.indexOf(letter),
    visual: <span aria-hidden="true">{emoji}</span>,
    explain: `${word[0].toUpperCase()}${word.slice(1)} starts with ${letter}.`,
  };
}

function neighbour(rng: Rng, after: boolean): QuizQuestion {
  const i = after ? rng.int(0, 25) : rng.int(1, 26);
  const letter = LETTERS[i];
  const target = LETTERS[after ? i + 1 : i - 1];
  // Near-miss distractors make children actually recite the order.
  const near = [LETTERS[i + 2], LETTERS[i - 2], LETTERS[i], LETTERS[after ? i - 1 : i + 1]].filter(
    (l): l is string => !!l && l !== target,
  );
  const wrong = rng.shuffle([...new Set(near)]).slice(0, 3);
  while (wrong.length < 3) {
    const extra = rng.pick(LETTERS);
    if (extra !== target && !wrong.includes(extra)) wrong.push(extra);
  }
  const choices = choicesFor(rng, target, wrong);
  return {
    prompt: `Which letter comes ${after ? 'after' : 'before'} ${letter}?`,
    choices,
    answer: choices.indexOf(target),
    visual: (
      <strong style={{ fontSize: '3.5rem' }}>{after ? `${letter} → ?` : `? → ${letter}`}</strong>
    ),
  };
}

function matchCase(rng: Rng): QuizQuestion {
  const letter = rng.pick(LETTERS);
  const correct = letter.toLowerCase();
  const wrong = otherLetters(rng, letter).map((l) => l.toLowerCase());
  const choices = choicesFor(rng, correct, wrong);
  return {
    prompt: `Which is the small letter for ${letter}?`,
    choices,
    answer: choices.indexOf(correct),
    visual: <strong style={{ fontSize: '4rem' }}>{letter}</strong>,
  };
}

function pictureFor(rng: Rng): QuizQuestion {
  const [letter, word, emoji] = rng.pick(PICTURES);
  const others = rng.shuffle(PICTURES.filter((p) => p[0] !== letter)).slice(0, 3);
  const choices = choicesFor(
    rng,
    `${emoji} ${word}`,
    others.map((p) => `${p[2]} ${p[1]}`),
  );
  return {
    prompt: `Which picture starts with the letter ${letter}?`,
    choices,
    answer: choices.indexOf(`${emoji} ${word}`),
    visual: <strong style={{ fontSize: '4rem' }}>{letter}</strong>,
  };
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const kinds =
    d === 'easy'
      ? [startsWith, matchCase, pictureFor]
      : [
          startsWith,
          matchCase,
          pictureFor,
          (r: Rng) => neighbour(r, true),
          (r: Rng) => neighbour(r, false),
        ];
  return repeat(10, () => rng.pick(kinds)(rng));
}
