import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'color-match-cards',
  title: 'Color Match Cards',
  category: 'card',
  difficulty: 'easy',
  icon: '🌈',
  tags: ['cards', 'shedding', 'colours', 'family', 'wild', 'ai', 'two to four players'],
  short: 'Match colours and symbols, play action cards, and be first to empty your hand.',
  full: 'A fast family shedding game with its own colourful deck. Match the top card by colour or by symbol, use Skip, Reverse and +2 cards to trip up your opponents, and play Wild cards to change the colour. Remember to call “One!” when you are down to your last card. Play against one to three computer players.',
  minutes: 6,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a highlighted card and press Enter; choose a colour after a Wild'],
    mouse: ['Click a highlighted card, or Draw when you can’t play'],
    touch: ['Tap a highlighted card, or Draw when you can’t play'],
  },
  instructions: {
    objective: 'Be the first to play every card in your hand.',
    howToPlay: [
      'Play a card that matches the top card’s colour or symbol. Wild cards can always be played and let you choose the colour.',
      'Skip: the next player misses a turn. Reverse: play changes direction (with two players it acts as a Skip).',
      '+2: the next player draws two and misses a turn. Wild +4: choose a colour; the next player draws four and misses a turn.',
      'If you can’t play, draw one card; play it if it fits, otherwise pass.',
      'When you are about to play your second-to-last card, press Call “One!” first — forgetting costs two cards (not on Easy).',
    ],
    scoring: 'The winner scores the cards left in other hands: numbers at face value, action cards 20, wilds 50. Your score is that total × 5.',
    difficultyNotes: 'Easy: opponents play any matching card and there is no “One!” penalty. Normal: they save wilds and attack players close to going out. Hard: they also keep to their strongest colour.',
    tips: ['Save a Wild for when you are stuck.', 'Use +2 and Skip on a player with one or two cards.', 'Change to the colour you hold most of.'],
  },
  achievements: [
    ['win', 'Color Champ', 'Win a game.', 1, '🌈', 5],
    ['four', 'Full House Party', 'Win a four-player game.', 1, '👥', 15],
    ['wild', 'Wild Finish', 'Go out on a Wild card.', 1, '★', 10],
    ['plus4', 'Draw Four!', 'Play 2 Wild +4 cards in one game.', 2, '➕', 10],
  ],
  load: () => import('./ColorMatchGame'),
});
