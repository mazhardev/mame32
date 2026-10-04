'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function EndlessRunnerGame() {
  return <ArcadeGame spec={spec} />;
}
