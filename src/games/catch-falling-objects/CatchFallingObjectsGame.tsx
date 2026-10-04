import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function CatchFallingObjectsGame() {
  return <ArcadeGame spec={spec} />;
}
