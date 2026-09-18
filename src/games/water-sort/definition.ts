import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';
export const game: GameDefinition = {
  id: 'water-sort',
  title: 'Water Sort',
  shortDescription: 'Pour matching colors into separate tubes.',
  fullDescription:
    'Pour matching colors into separate tubes. Sort all colors into separate, full tubes.',
  category: 'puzzle',
  difficulty: 'easy',
  tags: ['puzzle', 'classic'],
  icon: '🧪',
  controls: {
    keyboard: ['Tab and Enter for game controls; P to pause; R to restart'],
    mouse: ['Use the game controls'],
    touch: ['Tap the game controls'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 3,
  hasHighScore: true,
  hasAchievements: true,
  hasSaveState: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./WaterSortGame')),
};
