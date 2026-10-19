import { CampaignGame } from '../_shared/platform/CampaignGame';
import { START_POINTS, describe, makeSpec } from './spec';

export default function BubbleBuddiesGame() {
  return <CampaignGame gameId="bubble-buddies" makeSpec={makeSpec} starts={START_POINTS} describe={describe} maxHeight={0.78} />;
}
