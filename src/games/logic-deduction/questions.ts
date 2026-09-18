import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';

/**
 * Hand-written deduction puzzles. Every answer follows strictly from the
 * statements; "Cannot be determined" is right only when it truly is.
 */
export const BANK: BankItem[] = [
  {
    prompt: 'All cats are animals. Tom is a cat. Which must be true?',
    correct: 'Tom is an animal.',
    wrong: ['All animals are cats.', 'Tom is not an animal.', 'Cannot be determined.'],
    level: 1,
  },
  {
    prompt: 'Anna is taller than Ben. Ben is taller than Cara. Who is the shortest?',
    correct: 'Cara',
    wrong: ['Anna', 'Ben', 'Cannot be determined'],
    level: 1,
  },
  {
    prompt: 'If it rains, the grass gets wet. The grass is not wet. What follows?',
    correct: 'It did not rain.',
    wrong: ['It rained.', 'The grass is dry because of the sun.', 'Cannot be determined.'],
    level: 2,
    explain: 'If rain always wets the grass, dry grass means no rain (modus tollens).',
  },
  {
    prompt: 'If it rains, the grass gets wet. The grass is wet. What follows?',
    correct: 'Cannot be determined.',
    wrong: ['It rained.', 'It did not rain.', 'Someone watered it.'],
    level: 2,
    explain: 'The grass could be wet for another reason, such as a sprinkler.',
  },
  {
    prompt: 'Some birds can swim. All penguins are birds. Which must be true?',
    correct: 'None of these must be true.',
    wrong: ['All penguins can swim.', 'Some penguins cannot swim.', 'All birds are penguins.'],
    level: 3,
    explain: 'The statements alone don’t tell us anything about penguins swimming.',
  },
  {
    prompt: 'Max finished before Leo. Zoe finished after Leo. Who finished first of the three?',
    correct: 'Max',
    wrong: ['Leo', 'Zoe', 'Cannot be determined'],
    level: 1,
  },
  {
    prompt: 'No fish can fly. A goldfish is a fish. Which must be true?',
    correct: 'A goldfish cannot fly.',
    wrong: ['Some fish can fly.', 'A goldfish can fly.', 'Cannot be determined.'],
    level: 1,
  },
  {
    prompt:
      'The red house is left of the blue house. The green house is right of the blue house. Which house is in the middle?',
    correct: 'Blue',
    wrong: ['Red', 'Green', 'Cannot be determined'],
    level: 1,
  },
  {
    prompt: 'Sam always lies. Sam says, “I have a dog.” What do we know?',
    correct: 'Sam does not have a dog.',
    wrong: ['Sam has a dog.', 'Sam has a cat.', 'Cannot be determined.'],
    level: 1,
  },
  {
    prompt:
      'A knight always tells the truth; a knave always lies. Pat says, “I am a knave.” What can we conclude?',
    correct: 'Pat cannot be a knight or a knave.',
    wrong: ['Pat is a knight.', 'Pat is a knave.', 'Pat is both.'],
    level: 3,
    explain: 'A knight would not say it (it’s false), and a knave would not say it (it’s true).',
  },
  {
    prompt:
      'Knights always tell the truth; knaves always lie. Ria says, “We are both knaves,” about herself and Jo. What are they?',
    correct: 'Ria is a knave, Jo is a knight.',
    wrong: ['Both are knaves.', 'Both are knights.', 'Ria is a knight, Jo is a knave.'],
    level: 3,
    explain:
      'A knight could not say it, so Ria lies. Since the statement is false, they are not both knaves: Jo is a knight.',
  },
  {
    prompt: 'Every student in the class passed. Lena did not pass. Which must be true?',
    correct: 'Lena is not in the class.',
    wrong: ['Lena is in the class.', 'Some students failed.', 'Cannot be determined.'],
    level: 2,
  },
  {
    prompt:
      'Five people sit in a row. Dan is in the middle. Eve is at the far left. How many people sit between Eve and Dan?',
    correct: '1',
    wrong: ['0', '2', '3'],
    level: 2,
  },
  {
    prompt: 'A is older than B. C is older than A. D is younger than B. Who is the oldest?',
    correct: 'C',
    wrong: ['A', 'B', 'D'],
    level: 2,
  },
  {
    prompt: 'A is older than B. C is older than A. D is younger than B. Who is the youngest?',
    correct: 'D',
    wrong: ['A', 'B', 'C'],
    level: 2,
  },
  {
    prompt: 'Only people with tickets can enter. Ray entered. Which must be true?',
    correct: 'Ray had a ticket.',
    wrong: [
      'Ray did not have a ticket.',
      'Everyone with a ticket entered.',
      'Cannot be determined.',
    ],
    level: 2,
  },
  {
    prompt: 'Only people with tickets can enter. Kim has a ticket. Which must be true?',
    correct: 'None of these must be true.',
    wrong: ['Kim entered.', 'Kim did not enter.', 'Kim bought the last ticket.'],
    level: 3,
    explain: 'A ticket is needed to enter, but having one does not mean Kim went in.',
  },
  {
    prompt: 'Today is Wednesday. What day will it be 10 days from today?',
    correct: 'Saturday',
    wrong: ['Friday', 'Sunday', 'Thursday'],
    level: 2,
    explain: '10 days = 1 week + 3 days. Wednesday + 3 = Saturday.',
  },
  {
    prompt: 'If yesterday was Friday, what day is the day after tomorrow?',
    correct: 'Monday',
    wrong: ['Sunday', 'Saturday', 'Tuesday'],
    level: 2,
  },
  {
    prompt:
      'A drawer has only red and blue socks. How many must you take out, without looking, to be sure of a matching pair?',
    correct: '3',
    wrong: ['2', '4', 'It depends on how many there are'],
    level: 3,
    explain: 'With two colours, three socks guarantee two of the same colour.',
  },
  {
    prompt: 'All roses are flowers. Some flowers fade quickly. Which must be true?',
    correct: 'None of these must be true.',
    wrong: ['Some roses fade quickly.', 'All roses fade quickly.', 'No roses fade quickly.'],
    level: 3,
    explain: 'The flowers that fade quickly might not include any roses.',
  },
  {
    prompt: 'Box A is heavier than box B. Box B is heavier than box C. Is A heavier than C?',
    correct: 'Yes',
    wrong: ['No', 'They weigh the same', 'Cannot be determined'],
    level: 1,
  },
  {
    prompt: 'Mia has more marbles than Noah but fewer than Olga. Who has the most marbles?',
    correct: 'Olga',
    wrong: ['Mia', 'Noah', 'Cannot be determined'],
    level: 1,
  },
  {
    prompt:
      'Either the light is on or the door is locked (or both). The light is off. What follows?',
    correct: 'The door is locked.',
    wrong: ['The door is unlocked.', 'The light is broken.', 'Cannot be determined.'],
    level: 2,
  },
  {
    prompt:
      'Three friends own a cat, a dog and a fish, one each. Ali doesn’t own the dog or the fish. Bea doesn’t own the dog. Who owns the dog?',
    correct: 'The third friend',
    wrong: ['Ali', 'Bea', 'Cannot be determined'],
    level: 2,
    explain: 'Ali has the cat, so Bea has the fish and the third friend has the dog.',
  },
  {
    prompt:
      'A father and son are 36 years apart. In 6 years the father will be 4 times the son’s age. How old is the son now?',
    correct: '6',
    wrong: ['4', '8', '12'],
    level: 3,
    explain: 'In 6 years: son 12, father 48. 48 = 4 × 12 and 48 − 12 = 36.',
  },
  {
    prompt:
      'It takes 5 machines 5 minutes to make 5 widgets. How long do 100 machines take to make 100 widgets?',
    correct: '5 minutes',
    wrong: ['100 minutes', '20 minutes', '1 minute'],
    level: 3,
    explain: 'Each machine makes one widget in 5 minutes.',
  },
  {
    prompt:
      'A bat and a ball cost 1.10 in total. The bat costs 1.00 more than the ball. How much is the ball?',
    correct: '0.05',
    wrong: ['0.10', '0.01', '0.15'],
    level: 3,
    explain: 'Ball 0.05, bat 1.05: the bat is 1.00 more and together they cost 1.10.',
  },
];

export const makeQuestions = (rng: Rng, d: DifficultySetting): QuizQuestion[] =>
  drawFromBank(BANK, rng, d, 10);
