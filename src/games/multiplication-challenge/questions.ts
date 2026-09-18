import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { multiplication, repeat } from '../_shared/quiz/math';

export const makeQuestions = (rng: Rng, d: DifficultySetting) =>
  repeat(15, () => multiplication(rng, d));
