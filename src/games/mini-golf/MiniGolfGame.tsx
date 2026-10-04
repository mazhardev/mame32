import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function MiniGolfGame() {
  return <ArcadeGame spec={spec} />;
}
