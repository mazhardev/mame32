import { CampaignGame } from '../_shared/platform/CampaignGame';
import { START_POINTS, describe, makeSpec } from './spec';

export default function PipQuestGame() {
  return <CampaignGame gameId="pip-quest" makeSpec={makeSpec} starts={START_POINTS} describe={describe} />;
}
