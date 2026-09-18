import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';

type Entry = [word: string, meaning: string, level: 1 | 2 | 3];

/** Word → meaning. Distractors are other meanings from the same level. */
export const ENTRIES: Entry[] = [
  ['enormous', 'very large', 1],
  ['tiny', 'very small', 1],
  ['ancient', 'very old', 1],
  ['brave', 'showing courage', 1],
  ['fragile', 'easily broken', 1],
  ['rapid', 'happening very quickly', 1],
  ['silent', 'making no sound', 1],
  ['weary', 'very tired', 1],
  ['furious', 'extremely angry', 1],
  ['generous', 'happy to give more than expected', 1],
  ['curious', 'eager to know or learn something', 1],
  ['delighted', 'very pleased', 1],
  ['abundant', 'existing in large quantities', 2],
  ['candid', 'truthful and straightforward', 2],
  ['diligent', 'careful and hard-working', 2],
  ['elated', 'extremely happy and excited', 2],
  ['frugal', 'careful not to waste money', 2],
  ['gregarious', 'fond of company; sociable', 2],
  ['hesitant', 'slow to act because unsure', 2],
  ['meticulous', 'showing great attention to detail', 2],
  ['nostalgia', 'a wistful longing for the past', 2],
  ['obsolete', 'no longer in use', 2],
  ['resilient', 'able to recover quickly from difficulty', 2],
  ['tranquil', 'calm and peaceful', 2],
  ['vivid', 'bright, clear and striking', 2],
  ['ambiguous', 'having more than one possible meaning', 3],
  ['benevolent', 'kind and well-meaning', 3],
  ['cacophony', 'a harsh mixture of sounds', 3],
  ['ephemeral', 'lasting a very short time', 3],
  ['fastidious', 'very concerned about accuracy and detail', 3],
  ['garrulous', 'excessively talkative', 3],
  ['impeccable', 'without any fault', 3],
  ['laconic', 'using very few words', 3],
  ['magnanimous', 'generous towards a rival or someone less powerful', 3],
  ['pragmatic', 'dealing with things sensibly and realistically', 3],
  ['quintessential', 'the most perfect example of something', 3],
  ['serendipity', 'finding something good by chance', 3],
  ['ubiquitous', 'present everywhere', 3],
  ['verbose', 'using more words than needed', 3],
  ['zealous', 'full of energy and enthusiasm for a cause', 3],
  ['candour', 'the quality of being open and honest', 3],
  ['lethargic', 'sluggish and lacking energy', 3],
];

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const items: BankItem[] = ENTRIES.map(([word, meaning, level]) => {
    const sameLevel = ENTRIES.filter((e) => e[2] === level && e[0] !== word);
    // Alternate direction: sometimes pick the meaning, sometimes the word.
    if (rng.bool()) {
      return {
        prompt: `What does “${word}” mean?`,
        correct: meaning,
        wrong: rng
          .shuffle(sameLevel)
          .slice(0, 3)
          .map((e) => e[1]),
        level,
      };
    }
    return {
      prompt: `Which word means “${meaning}”?`,
      correct: word,
      wrong: rng
        .shuffle(sameLevel)
        .slice(0, 3)
        .map((e) => e[0]),
      level,
    };
  });
  return drawFromBank(items, rng, d, 10);
}
