import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';

type Element = [number: number, symbol: string, name: string, level: 1 | 2 | 3];

/** Atomic number, symbol and name. Levels: well-known, school-level, deeper cuts. */
export const ELEMENTS: Element[] = [
  [1, 'H', 'Hydrogen', 1],
  [2, 'He', 'Helium', 1],
  [3, 'Li', 'Lithium', 2],
  [4, 'Be', 'Beryllium', 3],
  [5, 'B', 'Boron', 3],
  [6, 'C', 'Carbon', 1],
  [7, 'N', 'Nitrogen', 1],
  [8, 'O', 'Oxygen', 1],
  [9, 'F', 'Fluorine', 2],
  [10, 'Ne', 'Neon', 2],
  [11, 'Na', 'Sodium', 2],
  [12, 'Mg', 'Magnesium', 2],
  [13, 'Al', 'Aluminium', 2],
  [14, 'Si', 'Silicon', 2],
  [15, 'P', 'Phosphorus', 2],
  [16, 'S', 'Sulfur', 2],
  [17, 'Cl', 'Chlorine', 2],
  [18, 'Ar', 'Argon', 3],
  [19, 'K', 'Potassium', 2],
  [20, 'Ca', 'Calcium', 1],
  [22, 'Ti', 'Titanium', 3],
  [24, 'Cr', 'Chromium', 3],
  [25, 'Mn', 'Manganese', 3],
  [26, 'Fe', 'Iron', 1],
  [27, 'Co', 'Cobalt', 3],
  [28, 'Ni', 'Nickel', 2],
  [29, 'Cu', 'Copper', 1],
  [30, 'Zn', 'Zinc', 2],
  [35, 'Br', 'Bromine', 3],
  [36, 'Kr', 'Krypton', 3],
  [47, 'Ag', 'Silver', 1],
  [50, 'Sn', 'Tin', 2],
  [53, 'I', 'Iodine', 2],
  [54, 'Xe', 'Xenon', 3],
  [74, 'W', 'Tungsten', 3],
  [78, 'Pt', 'Platinum', 2],
  [79, 'Au', 'Gold', 1],
  [80, 'Hg', 'Mercury', 2],
  [82, 'Pb', 'Lead', 2],
  [86, 'Rn', 'Radon', 3],
  [92, 'U', 'Uranium', 2],
];

/** Facts about particular elements. */
const FACTS: BankItem[] = [
  {
    prompt: 'Which element makes up most of the air we breathe?',
    correct: 'Nitrogen',
    wrong: ['Oxygen', 'Carbon', 'Argon'],
    level: 2,
  },
  {
    prompt: 'Which element is a liquid metal at room temperature?',
    correct: 'Mercury',
    wrong: ['Lead', 'Gallium', 'Tin'],
    level: 2,
  },
  {
    prompt: 'Which noble gas glows red-orange in advertising signs?',
    correct: 'Neon',
    wrong: ['Helium', 'Argon', 'Xenon'],
    level: 2,
  },
  {
    prompt: 'Which element is the basis of all known life?',
    correct: 'Carbon',
    wrong: ['Silicon', 'Oxygen', 'Nitrogen'],
    level: 1,
  },
  {
    prompt: 'Which element is used in computer chips?',
    correct: 'Silicon',
    wrong: ['Carbon', 'Copper', 'Germanium'],
    level: 2,
  },
  {
    prompt: 'Which element is lighter than air and used in party balloons?',
    correct: 'Helium',
    wrong: ['Hydrogen', 'Neon', 'Nitrogen'],
    level: 1,
  },
  {
    prompt: 'Which element has the highest melting point of all metals?',
    correct: 'Tungsten',
    wrong: ['Titanium', 'Iron', 'Platinum'],
    level: 3,
  },
  {
    prompt: 'Table salt is a compound of sodium and which element?',
    correct: 'Chlorine',
    wrong: ['Fluorine', 'Iodine', 'Oxygen'],
    level: 2,
  },
  {
    prompt: 'Which element is added to toothpaste to help prevent tooth decay?',
    correct: 'Fluorine',
    wrong: ['Chlorine', 'Calcium', 'Iodine'],
    level: 3,
  },
  {
    prompt: 'What is the most abundant element in the universe?',
    correct: 'Hydrogen',
    wrong: ['Helium', 'Oxygen', 'Carbon'],
    level: 2,
  },
  {
    prompt: 'How many elements are in the periodic table (as of today)?',
    correct: '118',
    wrong: ['92', '108', '124'],
    level: 3,
  },
  {
    prompt: 'Which group of elements is known as the noble gases?',
    correct: 'Group 18',
    wrong: ['Group 1', 'Group 2', 'Group 17'],
    level: 3,
  },
];

function others<T>(rng: Rng, list: T[], not: T): T[] {
  return rng.shuffle(list.filter((x) => x !== not)).slice(0, 3);
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const items: BankItem[] = [...FACTS];
  const names = ELEMENTS.map((e) => e[2]);
  const symbols = ELEMENTS.map((e) => e[1]);
  for (const [num, symbol, name, level] of ELEMENTS) {
    items.push({
      prompt: `Which element has the symbol ${symbol}?`,
      correct: name,
      wrong: others(rng, names, name),
      level,
    });
    items.push({
      prompt: `What is the chemical symbol for ${name}?`,
      correct: symbol,
      wrong: others(rng, symbols, symbol),
      level,
    });
    if (num <= 20) {
      const wrong = [num - 1, num + 1, num + 2, num - 2]
        .filter((n) => n > 0)
        .slice(0, 3)
        .map(String);
      items.push({
        prompt: `What is the atomic number of ${name}?`,
        correct: String(num),
        wrong,
        level: 3,
      });
    }
  }
  return drawFromBank(items, rng, d, 10);
}
