import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';
export const game: GameDefinition = {
  id: 'simon-memory',
  title: 'Simon Memory',
  shortDescription: 'Remember an expanding sequence of four colored pads.',
  fullDescription:
    'Remember an expanding sequence of four colored pads. Repeat a sequence of 12 steps to win.',
  category: 'brain',
  difficulty: 'easy',
  tags: ['brain', 'classic'],
  icon: '🧠',
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
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./SimonMemoryGame')),
};
