'use client';

import { reportProgress } from '@/achievements/AchievementService';
import { ClickerGame } from '../_shared/idle/ClickerGame';
import type { ClickerTheme } from '../_shared/idle/ClickerGame';
import { cookieConfig } from './config';

const theme: ClickerTheme = {
  gameId: 'cookie-factory',
  config: cookieConfig,
  currency: 'cookies',
  currencyIcon: '🍪',
  clickIcon: '🍪',
  clickLabel: 'Bake a cookie',
  goalText: (goal) => `Bake ${goal} cookies`,
  milestones: [
    ['first', 100],
    ['k', 1e5],
    ['m', 1e7],
  ],
  bonus: {
    icon: '🌟',
    name: 'golden cookie',
    every: [45, 100],
    life: 9,
    claim: (s, perSecond, random) => {
      if (random() < 0.5) {
        s.boost = 20;
        s.boostMult = 7;
        void reportProgress('cookie-factory.golden', 1);
        return 'Frenzy! Production ×7 for 20 seconds.';
      }
      const gain = Math.max(13, Math.min(s.amount * 0.15, perSecond * 600));
      s.amount += gain;
      s.run += gain;
      s.total += gain;
      void reportProgress('cookie-factory.golden', 1);
      return `Lucky! +${Math.round(gain).toLocaleString('en-US')} cookies.`;
    },
  },
  report: (s) => {
    void reportProgress('cookie-factory.clicks', s.clicks);
  },
};

export default function CookieFactoryGame() {
  return <ClickerGame theme={theme} />;
}
