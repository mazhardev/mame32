import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { mentalMath, repeat } from '../_shared/quiz/math';

export const makeQuestions = (rng: Rng, d: DifficultySetting) =>
  repeat(10, () => mentalMath(rng, d));
