import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const basketballShotGame: GameDefinition = {
  id: 'basketball-shot',
  title: 'Basketball Shot',
  shortDescription: 'Aim, set your power and sink as many baskets as you can against the clock.',
  fullDescription:
    'A timed shooting challenge with real ball physics. Drag to set the angle and power, bank shots off the backboard, and chain baskets for streak bonuses. Three-pointers and swishes are worth extra.',
  category: 'sports',
  difficulty: 'easy',
  tags: ['basketball', 'aim', 'power', 'timing', 'physics', 'hoops'],
  icon: '🏀',
  controls: {
    keyboard: [
      'Arrow Up / Down to change the angle',
      'Arrow Left / Right to change the power',
      'Space or Enter to shoot',
      'P to pause, R to restart',
    ],
    mouse: ['Drag back from anywhere on the court and release to shoot'],
    touch: ['Drag back and release to shoot', 'Angle, Power and Shoot buttons for fine control'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 2,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./BasketballGame')),
};
