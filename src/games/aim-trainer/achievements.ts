import type { AchievementDefinition } from '@/types';
export const achievements: AchievementDefinition[] = [
  {
    id: 'aim-trainer.hits',
    gameId: 'aim-trainer',
    name: 'On Target',
    description: 'Hit 10 targets in a round.',
    target: 10,
    icon: '🎯',
    coins: 10,
  },
  {
    id: 'aim-trainer.score',
    gameId: 'aim-trainer',
    name: 'Sharp Shooter',
    description: 'Score 4000 points.',
    target: 4000,
    icon: '🎯',
    coins: 10,
  },
  {
    id: 'aim-trainer.perfect',
    gameId: 'aim-trainer',
    name: 'Clean Sweep',
    description: 'Hit at least 10 targets without missing.',
    target: 1,
    icon: '🎯',
    coins: 10,
  },
];
