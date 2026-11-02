import { CampaignGame } from '../_shared/platform/CampaignGame';
import { START_POINTS, describe, makeSpec } from './spec';

export default function MarbleChainGame() {
  return <CampaignGame gameId="marble-chain" makeSpec={makeSpec} starts={START_POINTS} describe={describe} maxHeight={0.78} />;
}
