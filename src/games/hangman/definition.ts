import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';
export const game: GameDefinition = {
  id: 'hangman',
  title: 'Hangman',
  shortDescription: 'Discover a hidden word before six incorrect guesses.',
  fullDescription:
    'Discover a hidden word before six incorrect guesses. Reveal the entire hidden word.',
  category: 'word',
  difficulty: 'easy',
  tags: ['word', 'classic'],
  icon: '🔤',
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
  component: lazy(() => import('./HangmanGame')),
};
