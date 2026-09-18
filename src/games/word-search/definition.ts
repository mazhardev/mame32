import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const wordSearchGame: GameDefinition = {
  id: 'word-search',
  title: 'Word Search',
  shortDescription: 'Find every hidden word in the letter grid.',
  fullDescription: 'Words are hidden horizontally, vertically and diagonally. Select the first and last letter of a word to mark it found.',
  category: 'word',
  difficulty: 'easy',
  tags: ['word', 'grid', 'relaxing', 'puzzle'],
  icon: '🔍',
  controls: {
    keyboard: ['Tab to move between letters, Enter to select', 'P to pause, R to restart'],
    mouse: ['Click the first letter, then the last letter of a word'],
    touch: ['Tap the first letter, then the last letter of a word'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 5,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./WordSearchGame')),
};
