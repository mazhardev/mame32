import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function TowerDefenseGame() {
  return <ArcadeGame spec={spec} />;
}
