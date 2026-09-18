import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';
export const game: GameDefinition = {
  id: 'memory-match',
  title: 'Memory Match',
  shortDescription: 'Find every pair with as few turns as possible.',
  fullDescription: 'Find every pair with as few turns as possible. Match every symbol pair.',
  category: 'puzzle',
  difficulty: 'easy',
  tags: ['puzzle', 'classic'],
  icon: '🦋',
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
  component: lazy(() => import('./MemoryMatchGame')),
};
