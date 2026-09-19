import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tripeaks',
  title: 'TriPeaks',
  category: 'card',
  difficulty: 'easy',
  icon: '⛰️',
  tags: ['solitaire', 'patience', 'cards', 'streaks', 'single player', 'relaxing'],
  short: 'Clear three peaks of cards by playing one higher or one lower.',
  full: 'A fast, streaky solitaire. Three peaks of cards sit above a waste pile. Play any uncovered card that is one rank higher or lower than the waste card, and chain as many as you can for bigger streak bonuses. When you run dry, flip from the stock. Clear all three peaks to win.',
  minutes: 5,
  multiplayer: 'single',
  controls: {
    keyboard: ['Tab to a face-up card and press Enter; Enter on the stock flips a new card'],
    mouse: ['Click a face-up card to play it; click the stock to flip'],
    touch: ['Tap a face-up card to play it; tap the stock to flip'],
  },
  instructions: {
    objective: 'Move all 28 peak cards to the waste pile.',
    howToPlay: [
      'Only face-up cards (not covered by another card) can be played.',
      'Play a card that is one rank higher or lower than the top waste card, whatever its suit.',
      'Each card in a row adds to your streak; flipping from the stock ends it.',
      'Covered cards turn face up when both cards over them are gone.',
    ],
    scoring: 'Each card scores 10 × your current streak; clearing a peak top adds 250; clearing the board adds 1,000 plus 50 per stock card left.',
    difficultyNotes: 'Easy and Normal: Kings and Aces connect (K–A–2). Hard: they don’t.',
    tips: ['Choose the play that keeps a streak going longest.', 'Uncover face-down cards before the stock runs out.'],
  },
  achievements: [
    ['win', 'Peak Performer', 'Clear all three peaks.', 1, '⛰️', 15],
    ['peak', 'Summit', 'Clear the top card of a peak.', 1, '🏔️', 5],
    ['streak', 'Avalanche', 'Play a streak of 10 cards.', 10, '🔥', 20],
  ],
  load: () => import('./TriPeaksGame'),
});
