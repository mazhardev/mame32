'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function CricketBowlingGame() {
  return <ArcadeGame spec={spec} />;
}
