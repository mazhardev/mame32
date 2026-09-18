import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const numberMergeGame: GameDefinition = {
  id: 'number-merge-2048',
  title: 'Number Merge 2048',
  shortDescription: 'Slide and merge numbered tiles to build the 2048 tile.',
  fullDescription:
    'Slide every tile in one direction, merge matching pairs, and keep the board alive long enough to reach the target tile. Easy gives you a roomier five-by-five board, Hard removes undo entirely and pushes the goal to 4096. Your run saves automatically, so you can leave and come back.',
  category: 'puzzle',
  difficulty: 'medium',
  tags: ['merge', 'numbers', 'sliding', 'featured', 'save'],
  icon: '2️⃣',
  accent: 'linear-gradient(135deg, #edc22e, #f67c5f)',
  controls: {
    keyboard: ['Arrow keys or WASD to slide', 'U to undo', 'R to restart'],
    touch: ['Swipe in any direction to slide'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  multiplayer: 'single',
  estimatedMinutes: 8,
  hasHighScore: true,
  hasAchievements: true,
  hasSaveState: true,
  status: 'available',
  instructions,
  achievements,
  related: ['block-puzzle', 'sliding-puzzle', 'sudoku'],
  component: lazy(() => import('./NumberMergeGame')),
};
