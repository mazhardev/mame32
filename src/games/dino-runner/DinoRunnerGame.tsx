'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function DinoRunnerGame() {
  return <ArcadeGame spec={spec} />;
}
