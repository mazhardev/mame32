import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'hearts',
  title: 'Hearts vs AI',
  category: 'card',
  difficulty: 'hard',
  icon: '♥️',
  tags: ['cards', 'trick taking', 'hearts', 'queen of spades', 'ai', 'four players', 'classic'],
  short: 'Avoid hearts and the Queen of Spades against three computer players.',
  full: 'The classic trick-avoidance card game against three local computer players. Pass three cards, follow suit, and dodge every heart and the dreaded Queen of Spades — or take them all and shoot the moon. The first to 50 points ends the game, and the lowest score wins.',
  minutes: 15,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a highlighted card and press Enter'],
    mouse: ['Click cards to pass, then click a highlighted card to play'],
    touch: ['Tap cards to pass, then tap a highlighted card to play'],
  },
  instructions: {
    objective: 'Have the lowest score when someone reaches 50 points.',
    howToPlay: [
      'Before each hand, pass three cards: left, then right, then across, then no pass.',
      'The player holding the 2♣ leads it. You must follow the suit led if you can.',
      'The highest card of the suit led wins the trick. There are no trumps.',
      'Each heart you take costs 1 point and the Queen of Spades costs 13.',
      'Hearts can’t be led until one has been played. No points may be played on the first trick unless you have no choice.',
      'Take all 26 points in a hand to “shoot the moon”: everyone else gets 26 instead.',
    ],
    scoring: 'Win: 200 plus 20 for every point you stayed under 50.',
    difficultyNotes: 'Easy: the computer plays random legal cards. Normal: it ducks tricks and dumps dangerous cards. Hard: it also tracks the Queen of Spades and creates voids.',
    tips: ['Pass the Queen, Ace and King of Spades unless you hold lots of spades.', 'Get rid of a whole suit so you can dump hearts on it.', 'Keep low cards to duck under dangerous tricks.'],
  },
  achievements: [
    ['win', 'Heartbreaker', 'Win a game of Hearts.', 1, '♥️', 15],
    ['hard', 'Cold Heart', 'Win on Hard.', 1, '🏆', 35],
    ['clean', 'Clean Hands', 'Finish a hand without taking any points.', 1, '🧼', 5],
    ['moon', 'Shoot the Moon', 'Take all 26 points in one hand.', 1, '🌙', 40],
  ],
  load: () => import('./HeartsGame'),
});
