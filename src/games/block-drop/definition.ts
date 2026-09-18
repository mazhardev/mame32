import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const blockDropGame: GameDefinition = {
  id: 'block-drop',
  title: 'Block Drop',
  shortDescription: 'Rotate falling pieces and clear full rows.',
  fullDescription: 'Falling pieces stack up in the well. Complete horizontal rows to clear them, and clear twenty lines before the stack reaches the top.',
  category: 'arcade',
  difficulty: 'medium',
  tags: ['classic', 'falling-blocks', 'retro', 'puzzle'],
  icon: '🧱',
  controls: {
    keyboard: ['Arrow Left / Right to move', 'Arrow Up to rotate', 'Arrow Down to soft drop', 'Space to hard drop', 'P to pause, R to restart'],
    mouse: ['Use the on-screen buttons'],
    touch: ['Tap Left, Right, Rotate, Soft drop and Drop'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 6,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./BlockDropGame')),
};
