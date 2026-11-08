import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './spec';

export default function NeonSerpentsGame() {
  return <ArcadeGame spec={spec} maxHeight={0.76} />;
}
