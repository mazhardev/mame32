'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function FallingBlocksGame() {
  return <ArcadeGame spec={spec} maxHeight={0.8} />;
}
