import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'block-drop.score',
    gameId: 'block-drop',
    name: 'Line Clearer',
    description: 'Score 1,000 points.',
    target: 1000,
    icon: '🧱',
    coins: 10,
  },
  {
    id: 'block-drop.win',
    gameId: 'block-drop',
    name: 'Twenty Lines',
    description: 'Clear twenty lines.',
    target: 1,
    icon: '🏆',
    coins: 10,
  },
];
