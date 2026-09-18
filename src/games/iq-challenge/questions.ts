import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';
import { mathPuzzle, sequence } from '../_shared/quiz/math';

/** Verbal analogies, letter series and classification puzzles. */
export const BANK: BankItem[] = [
  {
    prompt: 'Hand is to glove as foot is to…',
    correct: 'sock',
    wrong: ['toe', 'leg', 'shoelace'],
    level: 1,
  },
  {
    prompt: 'Bird is to nest as bee is to…',
    correct: 'hive',
    wrong: ['honey', 'flower', 'wing'],
    level: 1,
  },
  {
    prompt: 'Hot is to cold as up is to…',
    correct: 'down',
    wrong: ['high', 'over', 'sky'],
    level: 1,
  },
  {
    prompt: 'Book is to reading as fork is to…',
    correct: 'eating',
    wrong: ['cooking', 'spoon', 'kitchen'],
    level: 1,
  },
  {
    prompt: 'Puppy is to dog as kitten is to…',
    correct: 'cat',
    wrong: ['mouse', 'cub', 'litter'],
    level: 1,
  },
  {
    prompt: 'Painter is to brush as writer is to…',
    correct: 'pen',
    wrong: ['book', 'paper', 'story'],
    level: 1,
  },
  {
    prompt: 'Water is to thirst as food is to…',
    correct: 'hunger',
    wrong: ['plate', 'cook', 'taste'],
    level: 2,
  },
  {
    prompt: 'Minute is to hour as month is to…',
    correct: 'year',
    wrong: ['week', 'day', 'season'],
    level: 2,
  },
  {
    prompt: 'Doctor is to hospital as teacher is to…',
    correct: 'school',
    wrong: ['student', 'lesson', 'book'],
    level: 1,
  },
  {
    prompt: 'Architect is to building as composer is to…',
    correct: 'symphony',
    wrong: ['piano', 'orchestra', 'concert hall'],
    level: 2,
  },
  {
    prompt: 'Evaporate is to vapour as freeze is to…',
    correct: 'ice',
    wrong: ['cold', 'water', 'winter'],
    level: 2,
  },
  {
    prompt: 'Caterpillar is to butterfly as tadpole is to…',
    correct: 'frog',
    wrong: ['fish', 'pond', 'egg'],
    level: 2,
  },
  {
    prompt: 'Odometer is to distance as thermometer is to…',
    correct: 'temperature',
    wrong: ['weather', 'speed', 'pressure'],
    level: 3,
  },
  {
    prompt: 'Prologue is to book as overture is to…',
    correct: 'opera',
    wrong: ['chapter', 'finale', 'song'],
    level: 3,
  },
  {
    prompt: 'Which letter comes next? A, C, E, G, …',
    correct: 'I',
    wrong: ['H', 'J', 'K'],
    level: 1,
  },
  {
    prompt: 'Which letter comes next? Z, X, V, T, …',
    correct: 'R',
    wrong: ['S', 'Q', 'P'],
    level: 2,
  },
  {
    prompt: 'Which letter comes next? B, E, H, K, …',
    correct: 'N',
    wrong: ['M', 'L', 'O'],
    level: 2,
  },
  {
    prompt: 'Which letter comes next? A, B, D, G, K, …',
    correct: 'P',
    wrong: ['O', 'N', 'Q'],
    level: 3,
    explain: 'The gaps grow by one: +1, +2, +3, +4, +5.',
  },
  {
    prompt: 'Which pair comes next? AZ, BY, CX, …',
    correct: 'DW',
    wrong: ['DV', 'EW', 'DX'],
    level: 2,
  },
  {
    prompt: 'Which word does not belong?',
    correct: 'Carrot',
    wrong: ['Apple', 'Banana', 'Cherry'],
    level: 1,
    explain: 'A carrot is a vegetable; the others are fruit.',
  },
  {
    prompt: 'Which word does not belong: square, triangle, circle, cube?',
    correct: 'Cube',
    wrong: ['Square', 'Triangle', 'Circle'],
    level: 2,
    explain: 'A cube is 3D; the others are flat shapes.',
  },
  {
    prompt: 'Which word does not belong: violin, cello, flute, viola?',
    correct: 'Flute',
    wrong: ['Violin', 'Cello', 'Viola'],
    level: 2,
    explain: 'The flute is a wind instrument; the others have strings.',
  },
  {
    prompt: 'Which word does not belong: Mercury, Venus, Moon, Mars?',
    correct: 'Moon',
    wrong: ['Mercury', 'Venus', 'Mars'],
    level: 1,
  },
  {
    prompt: 'Which number does not belong: 2, 3, 9, 11?',
    correct: '9',
    wrong: ['2', '3', '11'],
    level: 2,
    explain: '9 is not a prime number.',
  },
  {
    prompt: 'Which number does not belong: 16, 25, 36, 48?',
    correct: '48',
    wrong: ['16', '25', '36'],
    level: 2,
    explain: 'The others are square numbers.',
  },
  {
    prompt: 'If some Bloops are Razzies and all Razzies are Lazzies, which must be true?',
    correct: 'Some Bloops are Lazzies.',
    wrong: ['All Bloops are Lazzies.', 'All Lazzies are Bloops.', 'No Bloops are Lazzies.'],
    level: 3,
  },
  { prompt: 'Which is the mirror image of “b”?', correct: 'd', wrong: ['p', 'q', 'b'], level: 1 },
  {
    prompt: 'Rearrange “RAPETN” to make a word. It is a…',
    correct: 'family member (parent)',
    wrong: ['colour', 'fruit', 'country'],
    level: 3,
  },
  {
    prompt: 'Rearrange “LEPPA” to make a word. It is a…',
    correct: 'fruit (apple)',
    wrong: ['animal', 'country', 'colour'],
    level: 2,
  },
  {
    prompt: 'Which number should replace the question mark? 3 → 9, 4 → 16, 7 → ?',
    correct: '49',
    wrong: ['28', '21', '14'],
    level: 2,
  },
  {
    prompt: 'A clock shows 3:00. What is the angle between the hands?',
    correct: '90°',
    wrong: ['60°', '45°', '120°'],
    level: 2,
  },
  {
    prompt: 'How many squares are on a standard chessboard (all sizes)?',
    correct: '204',
    wrong: ['64', '128', '100'],
    level: 3,
    explain: '1² + 2² + … + 8² = 204.',
  },
];

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  // Two thirds verbal and logical puzzles, one third number puzzles.
  const verbal = drawFromBank(BANK, rng, d, 10);
  const numeric = [
    sequence(rng, d),
    sequence(rng, d),
    mathPuzzle(rng, d),
    sequence(rng, d),
    mathPuzzle(rng, d),
  ];
  return rng.shuffle([...verbal, ...numeric]);
}
