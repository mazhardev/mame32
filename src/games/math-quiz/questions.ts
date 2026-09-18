import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { arithmetic, repeat } from '../_shared/quiz/math';

export const makeQuestions = (rng: Rng, d: DifficultySetting) =>
  repeat(10, () => arithmetic(rng, d));
