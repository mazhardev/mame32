import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const penaltyShootoutGame: GameDefinition = {
  id: 'penalty-shootout',
  title: 'Penalty Shootout',
  shortDescription: 'Take penalties and play in goal in a five-kick shootout against the computer.',
  fullDescription:
    "A football shootout against a local computer opponent. Aim for the corners and time your strike on the power meter, then swap roles and dive to stop the computer's kicks. Level after five kicks each? It goes to sudden death.",
  category: 'sports',
  difficulty: 'medium',
  tags: ['football', 'soccer', 'penalty', 'aim', 'keeper', 'ai'],
  icon: '⚽',
  controls: {
    keyboard: [
      'Arrow keys to aim, Space or Enter to lock and strike',
      'While keeping: Arrow Left / Right to dive, Arrow Down to stay',
      'P to pause, R to restart',
    ],
    mouse: [
      'Move over the goal to aim, click to lock, click again to strike',
      'While keeping: click the left, middle or right of the goal',
    ],
    touch: [
      'Tap the goal to aim and lock, tap again to strike',
      'While keeping: tap a side of the goal or use the Dive buttons',
    ],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'vs-ai',
  estimatedMinutes: 3,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./PenaltyGame')),
};
