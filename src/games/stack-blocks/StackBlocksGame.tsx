import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function StackBlocksGame() {
  return <ArcadeGame spec={spec} />;
}
