import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'reaction.first-round',
    gameId: 'reaction-timer',
    name: 'Quick Start',
    description: 'Complete five reaction trials.',
    target: 1,
    icon: '⚡',
    coins: 5,
  },
  {
    id: 'reaction.clean-round',
    gameId: 'reaction-timer',
    name: 'Steady Nerves',
    description: 'Finish a round without a false start.',
    target: 1,
    icon: '🎯',
    coins: 10,
  },
  {
    id: 'reaction.under-300',
    gameId: 'reaction-timer',
    name: 'Lightning Reflexes',
    description: 'Average 300 ms or less with no false starts.',
    target: 1,
    icon: '🏅',
    coins: 20,
  },
];
