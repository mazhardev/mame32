'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function BoatRacingGame() {
  return <ArcadeGame spec={spec} />;
}
