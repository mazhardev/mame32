import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const blockDropGame: GameDefinition = {
  id: 'block-drop',
  title: 'Block Drop',
  shortDescription: 'Rotate falling pieces and clear full rows.',
  fullDescription:
    'Falling pieces stack up in the well. Slide and turn each one, complete horizontal rows to clear them, and clear twenty lines before the stack reaches the top. A preview shows the next piece and a ghost outline shows where this one will land. The pieces speed up every five lines. For a calmer take with no falling pieces, try [Block Puzzle](game:block-puzzle), or browse all [block games](hub:block-games).',
  category: 'arcade',
  difficulty: 'medium',
  tags: ['classic', 'falling-blocks', 'retro', 'puzzle'],
  icon: '🧱',
  controls: {
    keyboard: [
      'Arrow Left / Right (or A, D) to move; hold to slide',
      'Arrow Up, W or X to turn',
      'Arrow Down (or S) to soft drop',
      'Space or Enter to hard drop',
      'P to pause, R to restart',
    ],
    mouse: ['Drag on the board to move a piece, click to turn it'],
    touch: ['Drag sideways on the board to move, tap to turn, flick down to drop', 'Or use the pad, ⟳ and Drop'],
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
