import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const blackjackGame: GameDefinition = {
  id: 'blackjack',
  title: 'Blackjack',
  shortDescription: 'Beat the dealer to 21 over five hands. Virtual points only.',
  fullDescription: 'A card-game simulation using virtual points only. No real money or purchases are involved. Play five hands against a local dealer and try to finish with at least 300 points.',
  category: 'card',
  difficulty: 'easy',
  tags: ['cards', 'casino-style', 'ai', 'virtual-points'],
  icon: '🂡',
  controls: {
    keyboard: ['Tab to the buttons, Enter to Hit or Stand', 'P to pause, R to restart'],
    mouse: ['Click Hit, Stand or Next hand'],
    touch: ['Tap Hit, Stand or Next hand'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'vs-ai',
  estimatedMinutes: 5,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./BlackjackGame')),
};
