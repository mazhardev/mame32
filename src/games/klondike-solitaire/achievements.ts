import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'klondike-solitaire.score',
    gameId: 'klondike-solitaire',
    name: 'Card Mover',
    description: 'Score 200 points in one game.',
    target: 200,
    icon: '🃏',
    coins: 10,
  },
  {
    id: 'klondike-solitaire.win',
    gameId: 'klondike-solitaire',
    name: 'Every Card Home',
    description: 'Win a game of Klondike.',
    target: 1,
    icon: '🏆',
    coins: 10,
  },
];
