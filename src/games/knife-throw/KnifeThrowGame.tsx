'use client';

import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function KnifeThrowGame() {
  return <ArcadeGame spec={spec} />;
}
