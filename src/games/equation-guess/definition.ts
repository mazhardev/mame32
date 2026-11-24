import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'equation-guess',
  title: 'Equation Guess',
  category: 'brain',
  difficulty: 'medium',
  icon: '🧮',
  tags: ['math', 'numbers', 'daily', 'deduction', 'logic', 'code breaking'],
  short: 'Find the hidden equation in six tries. Every guess must be a true sum.',
  full: 'A number twist on the five-letter word game, like the maths guessing puzzles that went viral. Find the hidden equation, such as 12+35=47, in six tries. Every guess has to be a true equation of the right length, so you are doing quick sums while you deduce. After each guess the squares turn green for the right symbol in the right place, amber for a symbol that belongs somewhere else, and grey for one that is not there at all. Easy uses six symbols, Normal seven and Hard eight, with multiplication and division in play. A new equation each day, and as many random ones as you like. Crack more codes in [Mastermind](game:mastermind) and [Code Breaker](game:code-breaker), or try the other [math games](hub:math-games).',
  minutes: 4,
  hasSaveState: true,
  controls: {
    keyboard: ['Type digits and + - * / =', 'Enter submits, Backspace deletes'],
    mouse: ['Click the keypad, then Enter'],
    touch: ['Tap the keypad, then Enter'],
  },
  instructions: {
    objective: 'Work out the hidden equation within six guesses.',
    howToPlay: [
      'Type an equation that fills every square, with one = sign and a whole number after it, for example 3*9=27.',
      'Your guess must be true: the left side has to equal the right side.',
      'Green means the right symbol in the right place, amber means it is in the equation elsewhere, grey means it is not in it.',
      'Normal order of operations applies: × and ÷ before + and −. Division must come out exact, and numbers have no leading zeros.',
      'The keypad colours remember what you have learned about each symbol.',
    ],
    scoring: '100 points for each guess you had left over (counting the winning one), multiplied by the length beyond four symbols.',
    difficultyNotes: 'Easy: six symbols with +, − and ×. Normal: seven symbols, sometimes two operators. Hard: eight symbols with ÷ too and bigger numbers.',
    tips: [
      'Your first guess should use many different digits and an operator you suspect.',
      'Where the = sits tells you how many digits the answer has.',
      'Once you know the operator, check which numbers could make the answer work.',
    ],
    touchNotes: ['Tap the keypad to type; ⌫ deletes the last symbol.'],
  },
  achievements: [
    ['first', 'Balanced', 'Solve your first equation.', 1, '🧮', 10],
    ['three', 'Quick Maths', 'Solve an equation in three guesses or fewer.', 1, '⚡', 30],
    ['hard', 'Eight Symbols', 'Solve a Hard eight-symbol equation.', 1, '🧠', 30],
    ['ten', 'Number Cruncher', 'Solve 10 equations.', 10, '🏅', 40],
  ],
  load: () => import('./EquationGuessGame'),
});
