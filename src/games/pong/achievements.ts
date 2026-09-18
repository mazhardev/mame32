import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'pong.score',
    gameId: 'pong',
    name: 'Rally Starter',
    description: 'Score 300 points in a match.',
    target: 300,
    icon: '🏓',
    coins: 10,
  },
  {
    id: 'pong.win',
    gameId: 'pong',
    name: 'Paddle Champion',
    description: 'Win a match against the computer.',
    target: 1,
    icon: '🏆',
    coins: 10,
  },
];
