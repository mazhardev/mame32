import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  { id: 'c4.first-win', gameId: 'connect-four', name: 'Four in a Row', description: 'Win your first game.', target: 1, icon: '🔴', coins: 10 },
  { id: 'c4.beat-hard', gameId: 'connect-four', name: 'Deep Thinker', description: 'Beat the computer on Hard.', target: 1, icon: '🧠', coins: 45 },
  { id: 'c4.diagonal', gameId: 'connect-four', name: 'On the Diagonal', description: 'Win with a diagonal line.', target: 1, icon: '📐', coins: 20 },
  { id: 'c4.fast-win', gameId: 'connect-four', name: 'Quick Four', description: 'Win using 8 discs or fewer.', target: 1, icon: '⚡', coins: 30 },
  { id: 'c4.streak-3', gameId: 'connect-four', name: 'On a Roll', description: 'Win three games in a row.', target: 3, icon: '🔥', coins: 25 },
  { id: 'c4.two-player', gameId: 'connect-four', name: 'Head to Head', description: 'Finish a two-player game.', target: 1, icon: '👥', coins: 10 },
];
