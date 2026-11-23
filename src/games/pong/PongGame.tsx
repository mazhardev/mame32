import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './spec';

export default function PongGame() {
  return <ArcadeGame spec={spec} maxHeight={0.78} />;
}
