import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  { id: 'merge.tile-128', gameId: 'number-merge-2048', name: 'Getting Somewhere', description: 'Create a 128 tile.', target: 128, icon: '🔢', coins: 10 },
  { id: 'merge.tile-512', gameId: 'number-merge-2048', name: 'Big Numbers', description: 'Create a 512 tile.', target: 512, icon: '🔷', coins: 25 },
  { id: 'merge.tile-1024', gameId: 'number-merge-2048', name: 'Four Digits', description: 'Create a 1024 tile.', target: 1024, icon: '💠', coins: 40 },
  { id: 'merge.tile-2048', gameId: 'number-merge-2048', name: 'Target Reached', description: 'Create a 2048 tile.', target: 2048, icon: '🏆', coins: 80 },
  { id: 'merge.score-10000', gameId: 'number-merge-2048', name: 'Ten Thousand', description: 'Score 10,000 points in one run.', target: 10000, icon: '📈', coins: 50 },
  { id: 'merge.no-undo', gameId: 'number-merge-2048', name: 'No Take-Backs', description: 'Reach 512 without using undo.', target: 1, icon: '🚫', coins: 30 },
];
