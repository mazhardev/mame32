import type { AchievementDefinition } from '@/types';
export const achievements: AchievementDefinition[] = [
  {
    id: 'memory-match.first-win',
    gameId: 'memory-match',
    name: 'Pair Finder',
    description: 'Complete a board.',
    target: 1,
    icon: '🦋',
    coins: 10,
  },
  {
    id: 'memory-match.score',
    gameId: 'memory-match',
    name: 'Memory Expert',
    description: 'Score 800 points.',
    target: 800,
    icon: '🦋',
    coins: 10,
  },
  {
    id: 'memory-match.perfect',
    gameId: 'memory-match',
    name: 'Perfect Recall',
    description: 'Complete a board without a mismatch.',
    target: 1,
    icon: '🦋',
    coins: 10,
  },
];
