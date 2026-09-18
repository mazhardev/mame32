import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'brick-breaker.score',
    gameId: 'brick-breaker',
    name: 'Wall Crumbler',
    description: 'Score 1,000 points in one game.',
    target: 1000,
    icon: '🧱',
    coins: 10,
  },
  {
    id: 'brick-breaker.win',
    gameId: 'brick-breaker',
    name: 'Clean Slate',
    description: 'Clear every brick.',
    target: 1,
    icon: '🏆',
    coins: 10,
  },
];
