import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './spec';

export default function BlockDropGame() {
  return <ArcadeGame spec={spec} maxHeight={0.8} />;
}
