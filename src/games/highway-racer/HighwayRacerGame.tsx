'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function HighwayRacerGame() {
  return <ArcadeGame spec={spec} />;
}
