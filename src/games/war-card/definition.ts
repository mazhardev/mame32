import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'war-card',
  title: 'War',
  category: 'card',
  difficulty: 'easy',
  icon: '⚔️',
  tags: ['cards', 'luck', 'classic', 'kids', 'quick', 'vs computer'],
  short: 'Flip cards against the computer — the higher card takes both.',
  full: 'The classic card game of pure luck. You and the computer each flip the top card of your deck, and the higher card wins both. Tie? That means WAR: three cards face down and one more face up, winner takes the lot. Have the most cards when the rounds run out, or win all 52.',
  minutes: 5,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Press Enter on Flip, or turn on Auto-play'],
    mouse: ['Click Flip or your deck'],
    touch: ['Tap Flip or your deck'],
  },
  instructions: {
    objective: 'Hold more cards than the computer when the round limit is reached — or win them all.',
    howToPlay: [
      'Each round both players flip their top card. Aces are high.',
      'The higher card wins both cards, which go to the bottom of the winner’s deck.',
      'Equal cards start a war: each player lays three cards face down and one face up. The higher face-up card takes everything.',
      'If a player cannot finish a war, they lose it.',
      'Use Auto-play to let the rounds run by themselves.',
    ],
    scoring: '10 points per card you hold at the end.',
    difficultyNotes: 'Difficulty sets the length of the game: 30 rounds on Easy, 75 on Normal and up to 250 on Hard.',
    tips: ['War is all luck — sit back and enjoy the battles!'],
  },
  achievements: [
    ['win', 'Victorious', 'Finish ahead of the computer.', 1, '⚔️', 5],
    ['war', 'This Means War', 'Win a war.', 1, '💥', 5],
    ['double', 'Double War', 'Win a war that went to a second tie.', 1, '🔥', 15],
    ['all', 'Total Victory', 'Win all 52 cards.', 1, '🏆', 30],
  ],
  load: () => import('./WarGame'),
});
