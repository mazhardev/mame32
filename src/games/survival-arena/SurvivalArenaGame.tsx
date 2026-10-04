import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function SurvivalArenaGame() {
  return <ArcadeGame spec={spec} />;
}
