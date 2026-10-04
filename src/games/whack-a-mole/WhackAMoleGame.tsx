'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function WhackAMoleGame() {
  return <ArcadeGame spec={spec} />;
}
