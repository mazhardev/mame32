import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { repeat, sequence } from '../_shared/quiz/math';

export const makeQuestions = (rng: Rng, d: DifficultySetting) => repeat(10, () => sequence(rng, d));
