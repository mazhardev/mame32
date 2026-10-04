'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function MotorcycleRacingGame() {
  return <ArcadeGame spec={spec} />;
}
