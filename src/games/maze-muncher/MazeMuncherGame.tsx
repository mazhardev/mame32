'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function MazeMuncherGame() {
  return <ArcadeGame spec={spec} maxHeight={0.78} />;
}
