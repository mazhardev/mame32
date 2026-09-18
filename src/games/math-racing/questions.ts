import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { arithmetic, repeat } from '../_shared/quiz/math';

/** Plenty of questions: the race ends at the finish line, not when they run out. */
export const makeQuestions = (rng: Rng, d: DifficultySetting) =>
  repeat(80, () => arithmetic(rng, d));
