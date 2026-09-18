import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { repeat } from '../_shared/quiz/math';
import type { QuizQuestion } from '../_shared/quiz/engine';

const SYMBOLS = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⬛', '⬜', '🔺', '🔷', '⭐', '❤️'];

/** Repeating units, from simple alternation to longer cycles. */
const UNITS: Record<DifficultySetting, string[]> = {
  easy: ['AB', 'AAB', 'ABB'],
  normal: ['AB', 'ABC', 'AABB', 'ABB', 'AAB'],
  hard: ['ABC', 'ABCD', 'AABC', 'ABBC', 'ABAC', 'ABCB'],
};

function repeatingPattern(rng: Rng, d: DifficultySetting): QuizQuestion {
  const unit = rng.pick(UNITS[d]);
  const letters = [...new Set(unit)];
  const symbols = rng.shuffle([...SYMBOLS]).slice(0, letters.length);
  const map = Object.fromEntries(letters.map((l, i) => [l, symbols[i]]));
  const shown = unit.length * 2 + rng.int(0, unit.length);
  const seq = Array.from({ length: shown + 1 }, (_, i) => map[unit[i % unit.length]]);
  const answer = seq.pop()!;
  const wrong = rng.shuffle(SYMBOLS.filter((s) => s !== answer));
  // Always offer the other symbols from the pattern: the tempting wrong answers.
  const tempting = symbols.filter((s) => s !== answer);
  const pool = [...new Set([...tempting, ...wrong])].slice(0, 3);
  const choices = rng.shuffle([answer, ...pool]);
  return {
    prompt: 'What comes next?',
    choices,
    answer: choices.indexOf(answer),
    visual: <span style={{ fontSize: '2rem', letterSpacing: 4 }}>{seq.join(' ')} ❓</span>,
  };
}

const GROUPS: Record<string, string[]> = {
  fruit: ['🍎', '🍌', '🍇', '🍓', '🍍', '🍒', '🍑', '🍉'],
  animals: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐸'],
  vehicles: ['🚗', '🚕', '🚌', '🚲', '🚂', '✈️', '🚁', '🚤'],
  weather: ['☀️', '🌧️', '⛅', '❄️', '🌈', '⚡', '🌪️', '🌫️'],
  sports: ['⚽', '🏀', '🏈', '🎾', '🏐', '🏓', '🏸', '🥊'],
  food: ['🍕', '🍔', '🌭', '🌮', '🍟', '🥪', '🍝', '🍜'],
};

function oddOneOut(rng: Rng): QuizQuestion {
  const [groupName, other] = rng.shuffle(Object.keys(GROUPS)).slice(0, 2);
  const members = rng.shuffle([...GROUPS[groupName]]).slice(0, 3);
  const odd = rng.pick(GROUPS[other]);
  const choices = rng.shuffle([...members, odd]);
  return {
    prompt: 'Which one does not belong?',
    choices,
    answer: choices.indexOf(odd),
    explain: `The others are all ${groupName}.`,
    visual: <span style={{ fontSize: '2.4rem', letterSpacing: 8 }}>{choices.join(' ')}</span>,
  };
}

/** A shape grid where one cell is missing: rows repeat with a shift. */
function gridPattern(rng: Rng): QuizQuestion {
  const symbols = rng.shuffle([...SYMBOLS]).slice(0, 3);
  const grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => symbols[(r + c) % 3]));
  const answer = grid[2][2];
  const wrong = rng.shuffle(SYMBOLS.filter((s) => s !== answer)).slice(0, 1);
  const pool = [...new Set([...symbols.filter((s) => s !== answer), ...wrong])].slice(0, 3);
  const choices = rng.shuffle([answer, ...pool]);
  return {
    prompt: 'Each row and column uses every symbol once. Which symbol is missing?',
    choices,
    answer: choices.indexOf(answer),
    visual: (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 52px)',
          gap: 6,
          fontSize: '1.8rem',
        }}
      >
        {grid.flat().map((s, i) => (
          <span
            key={i}
            style={{
              display: 'grid',
              placeItems: 'center',
              height: 52,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            {i === 8 ? '❓' : s}
          </span>
        ))}
      </div>
    ),
  };
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const kinds =
    d === 'easy' ? [repeatingPattern, oddOneOut] : [repeatingPattern, oddOneOut, gridPattern];
  return repeat(10, () => rng.pick(kinds)(rng, d));
}
