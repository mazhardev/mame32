import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';

type Pair = [word: string, synonym: string, antonym: string, level: 1 | 2 | 3];

/** Each word with one clear synonym and one clear antonym. */
export const PAIRS: Pair[] = [
  ['happy', 'joyful', 'sad', 1],
  ['fast', 'quick', 'slow', 1],
  ['begin', 'start', 'finish', 1],
  ['easy', 'simple', 'difficult', 1],
  ['huge', 'gigantic', 'tiny', 1],
  ['bright', 'shiny', 'dim', 1],
  ['ancient', 'old', 'modern', 1],
  ['brave', 'bold', 'cowardly', 1],
  ['quiet', 'silent', 'noisy', 1],
  ['rich', 'wealthy', 'poor', 1],
  ['abundant', 'plentiful', 'scarce', 2],
  ['accept', 'receive', 'refuse', 2],
  ['arrogant', 'conceited', 'humble', 2],
  ['calm', 'serene', 'agitated', 2],
  ['conceal', 'hide', 'reveal', 2],
  ['expand', 'enlarge', 'shrink', 2],
  ['fortunate', 'lucky', 'unlucky', 2],
  ['genuine', 'authentic', 'fake', 2],
  ['hostile', 'unfriendly', 'friendly', 2],
  ['increase', 'raise', 'reduce', 2],
  ['optimistic', 'hopeful', 'pessimistic', 2],
  ['vague', 'unclear', 'precise', 2],
  ['benevolent', 'kind', 'malevolent', 3],
  ['candid', 'frank', 'evasive', 3],
  ['diminish', 'lessen', 'amplify', 3],
  ['ephemeral', 'fleeting', 'enduring', 3],
  ['frugal', 'thrifty', 'extravagant', 3],
  ['lucid', 'clear', 'confusing', 3],
  ['obstinate', 'stubborn', 'compliant', 3],
  ['prudent', 'sensible', 'reckless', 3],
  ['tenacious', 'persistent', 'yielding', 3],
  ['verbose', 'wordy', 'concise', 3],
  ['zealous', 'passionate', 'apathetic', 3],
  ['meagre', 'sparse', 'ample', 3],
];

/**
 * Words whose meanings overlap. Their synonyms/antonyms could be a second
 * right answer for each other, so they never supply each other's distractors.
 */
const CONFLICTS: string[][] = [
  ['vague', 'lucid'],
  ['calm', 'quiet'],
  ['benevolent', 'hostile'],
  ['huge', 'expand', 'abundant', 'meagre', 'increase', 'diminish'],
  ['rich', 'frugal', 'fortunate'],
  ['happy', 'optimistic'],
  ['brave', 'arrogant'],
  ['obstinate', 'tenacious'],
  ['candid', 'genuine'],
  ['begin', 'accept'],
];

function related(a: string, b: string): boolean {
  return CONFLICTS.some((g) => g.includes(a) && g.includes(b));
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const items: BankItem[] = [];
  for (const [word, syn, ant, level] of PAIRS) {
    // Distractors never include this word's own synonym or antonym, nor
    // words from pairs with overlapping meanings.
    const others = PAIRS.filter((p) => p[0] !== word && !related(word, p[0]));
    const pool = rng
      .shuffle(others.flatMap((p) => [p[1], p[2]]))
      .filter((w) => w !== syn && w !== ant);
    items.push({
      prompt: `Choose a SYNONYM of “${word}” (same meaning).`,
      correct: syn,
      wrong: [ant, ...pool.slice(0, 2)],
      level,
    });
    items.push({
      prompt: `Choose an ANTONYM of “${word}” (opposite meaning).`,
      correct: ant,
      wrong: [syn, ...pool.slice(2, 4)],
      level,
    });
  }
  return drawFromBank(items, rng, d, 12);
}
