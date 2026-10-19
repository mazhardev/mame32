import { CampaignGame } from '../_shared/platform/CampaignGame';
import { START_POINTS, describe, makeSpec } from './spec';

export default function SnowRollersGame() {
  return <CampaignGame gameId="snow-rollers" makeSpec={makeSpec} starts={START_POINTS} describe={describe} maxHeight={0.78} />;
}
