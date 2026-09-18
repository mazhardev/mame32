import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Finish five hands with at least 300 points.',
  howToPlay: [
    'You and the dealer each get two cards.',
    'Hit to take another card; Stand to keep your total.',
    'Go over 21 and you bust.',
    'The dealer draws to 17, then the higher total wins.',
  ],
  scoring: 'Wins add points and a natural 21 adds a bonus. Points are virtual and have no value.',
  difficultyNotes: 'Rules are the same on every difficulty.',
  tips: [
    'Stand on 17 or more.',
    'Always take a card on 11 or less; you cannot bust.',
  ],
  touchNotes: [
    'Tap Hit, Stand or Next hand',
  ],
};
