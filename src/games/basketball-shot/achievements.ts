import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'basketball-shot.first-basket',
    gameId: 'basketball-shot',
    name: 'Nothing but Net',
    description: 'Make your first basket.',
    target: 1,
    icon: '🏀',
    coins: 5,
  },
  {
    id: 'basketball-shot.score-20',
    gameId: 'basketball-shot',
    name: 'Hot Hand',
    description: 'Score 20 points in one round.',
    target: 20,
    icon: '🔥',
    coins: 10,
  },
  {
    id: 'basketball-shot.score-40',
    gameId: 'basketball-shot',
    name: 'Buzzer Beater',
    description: 'Score 40 points in one round.',
    target: 40,
    icon: '🏆',
    coins: 20,
  },
  {
    id: 'basketball-shot.streak-5',
    gameId: 'basketball-shot',
    name: 'On Fire',
    description: 'Make 5 baskets in a row.',
    target: 5,
    icon: '🎯',
    coins: 15,
  },
  {
    id: 'basketball-shot.swish-3',
    gameId: 'basketball-shot',
    name: 'Clean Swishes',
    description: 'Make 3 swishes (no rim) in one round.',
    target: 3,
    icon: '✨',
    coins: 10,
  },
];
