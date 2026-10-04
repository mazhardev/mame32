import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function DartsGame() {
  return <ArcadeGame spec={spec} />;
}
