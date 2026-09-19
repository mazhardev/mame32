import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'crazy-eights',
  title: 'Crazy Eights',
  category: 'card',
  difficulty: 'easy',
  icon: '8️⃣',
  tags: ['cards', 'shedding', 'family', 'wild cards', 'ai', 'two to four players'],
  short: 'Match suit or rank, play wild eights, and be first to empty your hand.',
  full: 'The classic family shedding game against one to three computer players. Match the top card of the discard pile by suit or by rank. Eights are wild — play one any time and name the next suit. Can’t go? Draw a card. First to get rid of every card wins the points left in everyone else’s hands.',
  minutes: 6,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a highlighted card and press Enter; choose a suit after playing an 8'],
    mouse: ['Click a highlighted card, or Draw when you can’t play'],
    touch: ['Tap a highlighted card, or Draw when you can’t play'],
  },
  instructions: {
    objective: 'Be the first player to play all your cards.',
    howToPlay: [
      'Play a card that matches the top discard’s suit or rank.',
      'An 8 can be played on anything; you then choose the suit the next player must follow.',
      'If you can’t play, draw one card. If it fits you may play it; otherwise pass.',
      'Two players get seven cards each; three or four players get five.',
    ],
    scoring: 'The winner scores the cards left in opponents’ hands: 8s are 50, face cards 10, others their number. Your score is that total × 5.',
    difficultyNotes: 'Easy: opponents play any legal card. Normal: they save eights and shed high cards. Hard: they also try to switch suit when someone is about to go out.',
    tips: ['Hold on to your eights for when you are stuck.', 'Change to the suit you hold most of.', 'Watch opponents with one card left.'],
  },
  achievements: [
    ['win', 'Out First', 'Win a game of Crazy Eights.', 1, '8️⃣', 5],
    ['four', 'Crowded Table', 'Win a four-player game.', 1, '👥', 15],
    ['finish8', 'Wild Finish', 'Go out by playing an 8.', 1, '🎉', 10],
    ['eights', 'Crazy for Eights', 'Play 3 eights in one game.', 3, '🌀', 10],
  ],
  load: () => import('./CrazyEightsGame'),
});
