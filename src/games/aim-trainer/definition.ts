import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';
export const game: GameDefinition = {
  id: 'aim-trainer',
  title: 'Aim Trainer',
  shortDescription: 'Hit as many targets as possible in thirty seconds.',
  fullDescription:
    'Hit as many targets as possible in thirty seconds. Hit targets quickly and accurately before time runs out.',
  category: 'casual',
  difficulty: 'easy',
  tags: ['casual', 'classic'],
  icon: '🎯',
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
  component: lazy(() => import('./AimTrainerGame')),
};
