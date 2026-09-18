import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'penalty-shootout.first-goal',
    gameId: 'penalty-shootout',
    name: 'Off the Mark',
    description: 'Score your first penalty.',
    target: 1,
    icon: '⚽',
    coins: 5,
  },
  {
    id: 'penalty-shootout.win',
    gameId: 'penalty-shootout',
    name: 'Shootout Winner',
    description: 'Win a penalty shootout.',
    target: 1,
    icon: '🏆',
    coins: 15,
  },
  {
    id: 'penalty-shootout.keeper-3',
    gameId: 'penalty-shootout',
    name: 'Safe Hands',
    description: 'Make 3 saves in one shootout.',
    target: 3,
    icon: '🧤',
    coins: 15,
  },
  {
    id: 'penalty-shootout.top-bins-3',
    gameId: 'penalty-shootout',
    name: 'Top Corner',
    description: 'Score 3 top-corner goals in one shootout.',
    target: 3,
    icon: '🎯',
    coins: 15,
  },
  {
    id: 'penalty-shootout.hard-win',
    gameId: 'penalty-shootout',
    name: 'Nerves of Steel',
    description: 'Win a shootout on Hard.',
    target: 1,
    icon: '💎',
    coins: 25,
  },
];
