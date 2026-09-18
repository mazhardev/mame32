import type { AchievementDefinition } from '@/types';

export const achievements: AchievementDefinition[] = [
  {
    id: 'blackjack.win',
    gameId: 'blackjack',
    name: 'Beat the Dealer',
    description: 'Win a hand.',
    target: 1,
    icon: '🂡',
    coins: 10,
  },
  {
    id: 'blackjack.natural',
    gameId: 'blackjack',
    name: 'Natural',
    description: 'Get 21 with your first two cards.',
    target: 1,
    icon: '✨',
    coins: 10,
  },
  {
    id: 'blackjack.score',
    gameId: 'blackjack',
    name: 'Table Regular',
    description: 'Finish a session with 500 virtual points.',
    target: 500,
    icon: '🏆',
    coins: 10,
  },
];
