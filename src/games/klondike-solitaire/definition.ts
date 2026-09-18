import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const klondikeGame: GameDefinition = {
  id: 'klondike-solitaire',
  title: 'Klondike Solitaire',
  shortDescription: 'The classic patience game: build all four foundations.',
  fullDescription: 'Move cards between seven tableau columns, alternating colours in descending order, and build each suit from Ace to King on the foundations.',
  category: 'card',
  difficulty: 'medium',
  tags: ['cards', 'solitaire', 'classic', 'patience'],
  icon: '🃏',
  controls: {
    keyboard: ['Tab to a card or pile, Enter to select and move', 'P to pause, R to restart'],
    mouse: ['Click a card, then click the destination pile', 'Click the stock to draw'],
    touch: ['Tap a card, then tap the destination pile', 'Tap the stock to draw'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 10,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./KlondikeGame')),
};
