import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'word-search.score',
    gameId: 'word-search',
    name: 'Word Spotter',
    description: 'Score 100 points on one board.',
    target: 100,
    icon: '🔍',
    coins: 10,
  },
  {
    id: 'word-search.win',
    gameId: 'word-search',
    name: 'Puzzle Solved',
    description: 'Find every word on a board.',
    target: 1,
    icon: '🏆',
    coins: 10,
  },
];
