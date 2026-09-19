import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'snakes-and-ladders',
  title: 'Snakes and Ladders',
  category: 'board',
  difficulty: 'easy',
  icon: '🪜',
  tags: ['dice', 'family', 'luck', 'kids', 'two player', 'four player', 'race'],
  short: 'Roll the die, climb ladders, dodge snakes and race to square 100.',
  full: 'The family dice race. Roll and move your token along the winding 100-square board: ladders carry you up, snakes slide you down. Play against up to three computer players, or pass and play with up to four people on one device.',
  minutes: 6,
  multiplayer: 'local-multiplayer',
  controls: {
    keyboard: ['Tab to Roll and press Enter or Space'],
    mouse: ['Click Roll'],
    touch: ['Tap Roll'],
  },
  instructions: {
    objective: 'Be the first player to reach square 100.',
    howToPlay: [
      'Choose opponents and the number of players, then press Roll on your turn.',
      'Your token moves forward by the number shown.',
      'Land at the foot of a ladder to climb it; land on a snake’s head to slide down to its tail.',
      'Players take turns in order: red, blue, green, yellow.',
    ],
    scoring: 'Winning against the computer scores 1,000 minus 15 for each roll you took (minimum 100).',
    difficultyNotes: 'Easy: two fewer snakes, and any roll past 100 finishes. Normal: you need the exact roll to land on 100. Hard: three extra snakes, and overshooting bounces you back.',
    tips: ['It is all luck — enjoy the ride!', 'Near the end on Normal, count the squares you still need.'],
  },
  achievements: [
    ['win', 'Top of the Board', 'Beat the computer to 100.', 1, '🪜', 10],
    ['charmed', 'Snake Charmer', 'Win without landing on a single snake.', 1, '🐍', 20],
    ['big-climb', 'Sky High', 'Climb the longest ladder.', 1, '☁️', 10],
    ['crowd', 'Crowd Pleaser', 'Win a four-player game against the computer.', 1, '👥', 15],
  ],
  load: () => import('./SnakesLaddersGame'),
});
