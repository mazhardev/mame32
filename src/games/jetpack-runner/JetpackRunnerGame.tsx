import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import { spec } from './game';

export default function JetpackRunnerGame() {
  return <ArcadeGame spec={spec} />;
}
