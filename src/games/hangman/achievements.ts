import type { AchievementDefinition } from '@/types';
export const achievements: AchievementDefinition[] = [
  {
    id: 'hangman.first-win',
    gameId: 'hangman',
    name: 'Word Finder',
    description: 'Solve a word.',
    target: 1,
    icon: '🔤',
    coins: 10,
  },
  {
    id: 'hangman.score',
    gameId: 'hangman',
    name: 'Careful Guesser',
    description: 'Score 300 points.',
    target: 300,
    icon: '🔤',
    coins: 10,
  },
  {
    id: 'hangman.perfect',
    gameId: 'hangman',
    name: 'Flawless Word',
    description: 'Win without a wrong letter.',
    target: 1,
    icon: '🔤',
    coins: 10,
  },
];
