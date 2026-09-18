import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const snakeGame: GameDefinition = {
  id: 'snake',
  title: 'Snake',
  shortDescription: 'Guide a growing snake around the board without hitting your own tail.',
  fullDescription:
    'The arcade classic, rebuilt for the browser. Steer a snake around a grid, eat food to grow longer, and survive as long as you can while the pace keeps climbing. Three difficulties change the board size, the speed curve and whether the walls are deadly.',
  category: 'arcade',
  difficulty: 'easy',
  tags: ['classic', 'reflex', 'retro', 'featured', 'grid'],
  icon: '🐍',
  accent: 'linear-gradient(135deg, #16a34a, #4ade80)',
  controls: {
    keyboard: ['Arrow keys or WASD to turn', 'P to pause', 'R to restart'],
    touch: ['Swipe on the board to turn', 'Or use the on-screen direction pad'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  multiplayer: 'single',
  estimatedMinutes: 3,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  related: ['block-drop', 'maze-muncher', 'road-hopper'],
  component: lazy(() => import('./SnakeGame')),
};
