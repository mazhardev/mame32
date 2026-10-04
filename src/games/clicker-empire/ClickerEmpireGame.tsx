import { reportProgress } from '@/achievements/AchievementService';
import { ClickerGame } from '../_shared/idle/ClickerGame';
import type { ClickerTheme } from '../_shared/idle/ClickerGame';
import { empireConfig } from './config';

const theme: ClickerTheme = {
  gameId: 'clicker-empire',
  config: empireConfig,
  currency: 'gold',
  currencyIcon: '🪙',
  clickIcon: '👑',
  clickLabel: 'Collect taxes',
  goalText: (goal) => `Amass ${goal} gold in total`,
  prestigeName: 'Crowns',
  milestones: [
    ['first', 1000],
    ['m', 1e6],
  ],
  report: (s) => {
    if (s.resets > 0) void reportProgress('clicker-empire.crown', 1);
    void reportProgress('clicker-empire.crowns', s.prestige);
    void reportProgress('clicker-empire.castle', s.owned.castle ?? 0);
  },
};

export default function ClickerEmpireGame() {
  return <ClickerGame theme={theme} />;
}
