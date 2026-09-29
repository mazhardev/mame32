import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function CannonShooterGame() {
  return <ArcadeGame spec={spec} maxHeight={0.8} />;
}
