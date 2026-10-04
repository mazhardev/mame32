import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'local-pictionary',
  title: 'Local Pictionary',
  category: 'creative',
  difficulty: 'easy',
  icon: '✏️',
  tags: ['party', 'drawing', 'two-player', 'family', 'guessing', 'creative'],
  short: 'A pass-and-play drawing party game: draw the secret word while friends shout guesses.',
  full: 'A drawing party game for 2–8 players on one device. Each turn, one player secretly sees a word and draws it against the clock while everyone else shouts guesses. When someone gets it, tap their name: the guesser scores a point and the artist scores one (two for a quick guess). Words range from easy objects to tricky ideas like “jet lag”. Nothing goes online — just pass the phone or tablet around.',
  minutes: 15,
  multiplayer: 'local-multiplayer',
  keyboard: false,
  controls: {
    mouse: ['Draw with the mouse; click a name when someone guesses'],
    touch: ['Draw with a finger; tap a name when someone guesses'],
  },
  instructions: {
    objective: 'Score the most points by drawing well and guessing fast.',
    howToPlay: [
      'Add players (or teams), then pass the device to the first artist.',
      'Only the artist looks at the word, then hides it and starts drawing.',
      'No letters, numbers or speaking — just pictures.',
      'When someone guesses, tap their name. If time runs out, nobody scores.',
    ],
    scoring:
      'Correct guesser: 1 point. Artist: 1 point, or 2 if guessed in the first half of the time.',
    difficultyNotes:
      'Easy uses simple objects with 90 seconds. Normal uses trickier things with 60 seconds. Hard uses actions and ideas with 75 seconds.',
    tips: [
      'Draw the big shape first, then add one telling detail.',
      'Arrows and simple symbols are allowed.',
    ],
    touchNotes: ['Hold “peek” to see the word again without the others noticing.'],
  },
  achievements: [
    ['guess', 'Got It!', 'Have a drawing guessed.', 1, '✏️', 10],
    ['quick', 'Speed Sketch', 'Have a drawing guessed within 15 seconds.', 1, '⚡', 20],
    ['party', 'Party Time', 'Finish a game.', 1, '🎉', 15],
    ['crowd', 'Full House', 'Play with 4 or more players.', 1, '👨‍👩‍👧‍👦', 20],
    ['words', 'Doodler', 'Play 50 drawing turns in total.', 50, '🖍️', 25],
  ],
  load: () => import('./PictionaryGame'),
});
