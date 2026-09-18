import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  { id: 'ttt.first-win', gameId: 'tic-tac-toe', name: 'Three in a Row', description: 'Win your first game.', target: 1, icon: '❌', coins: 10 },
  { id: 'ttt.beat-hard', gameId: 'tic-tac-toe', name: 'Outsmarted', description: 'Beat the computer on Hard.', target: 1, icon: '🧠', coins: 40 },
  { id: 'ttt.draw-hard', gameId: 'tic-tac-toe', name: 'Unbreakable', description: 'Draw against the computer on Hard.', target: 1, icon: '🛡️', coins: 20 },
  { id: 'ttt.streak-3', gameId: 'tic-tac-toe', name: 'Hat Trick', description: 'Win three games in a row.', target: 3, icon: '🔥', coins: 25 },
  { id: 'ttt.two-player', gameId: 'tic-tac-toe', name: 'Pass and Play', description: 'Finish a two-player game on one device.', target: 1, icon: '👥', coins: 10 },
];
