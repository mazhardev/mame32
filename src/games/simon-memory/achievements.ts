import type { AchievementDefinition } from '@/types';
export const achievements: AchievementDefinition[] = [
  {
    id: 'simon-memory.level',
    gameId: 'simon-memory',
    name: 'Pattern Keeper',
    description: 'Repeat a sequence of 4.',
    target: 4,
    icon: '🧠',
    coins: 10,
  },
  {
    id: 'simon-memory.level-eight',
    gameId: 'simon-memory',
    name: 'Long Memory',
    description: 'Repeat a sequence of 8.',
    target: 8,
    icon: '🧠',
    coins: 10,
  },
  {
    id: 'simon-memory.master',
    gameId: 'simon-memory',
    name: 'Memory Master',
    description: 'Complete the 12-step challenge.',
    target: 1,
    icon: '🧠',
    coins: 10,
  },
];
