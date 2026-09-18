import type { AchievementDefinition } from '@/types';
export const achievements: AchievementDefinition[] = [
  {
    id: 'water-sort.first-win',
    gameId: 'water-sort',
    name: 'Color Sorter',
    description: 'Solve a puzzle.',
    target: 1,
    icon: '🧪',
    coins: 10,
  },
  {
    id: 'water-sort.score',
    gameId: 'water-sort',
    name: 'Pour Planner',
    description: 'Score 2000 points.',
    target: 2000,
    icon: '🧪',
    coins: 10,
  },
  {
    id: 'water-sort.hard',
    gameId: 'water-sort',
    name: 'Seven Colors',
    description: 'Solve a seven-color puzzle.',
    target: 1,
    icon: '🧪',
    coins: 10,
  },
];
