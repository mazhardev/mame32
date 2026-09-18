import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { mathPuzzle, repeat } from '../_shared/quiz/math';

export const makeQuestions = (rng: Rng, d: DifficultySetting) =>
  repeat(10, () => mathPuzzle(rng, d));
