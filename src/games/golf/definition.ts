import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'golf',
  title: 'Golf',
  category: 'sports',
  difficulty: 'medium',
  icon: '⛳',
  tags: ['course', 'clubs', 'wind', 'putting', 'aim', 'sports'],
  short: 'Play nine holes of golf: choose your club, beat the wind and read the greens.',
  full: 'A nine-hole, par-36 golf course seen from above, with doglegs, creeks, an island green, bunkers and tree-lined fairways. Pick the right club for the distance, aim around the hazards and allow for the wind. On the green the view zooms in and the slope arrows show which way your putt will break.',
  minutes: 10,
  hasLevels: true,
  controls: {
    keyboard: ['← → aim', '↑ ↓ power', 'Space swings', 'X next club, Q previous club'],
    mouse: ['Drag back from the ball and release to swing'],
    touch: ['Drag back from the ball and lift to swing', 'Club button changes club'],
  },
  instructions: {
    objective: 'Complete nine holes in as few strokes as possible. Par is 36.',
    howToPlay: [
      'The best club for the distance is picked for you; change it if you want to lay up or go long.',
      'Power sets how much of the club’s full distance you hit. Harder swings are less accurate.',
      'Rough cuts your distance; bunkers cut it a lot unless you use the sand wedge.',
      'Water and out of bounds cost a stroke and you play again from the same spot.',
      'On the green, the arrows show the slope — aim uphill of the cup.',
    ],
    scoring:
      'Each hole scores 100 points for every stroke under par + 3. A birdie on a par 4 earns 400.',
    difficultyNotes:
      'Easy has no wind, gentle greens and shows exactly where the ball will land and how putts will roll. Normal adds wind and a landing ring. Hard has strong wind, steep greens, less accurate swings and only an aim line.',
    tips: [
      'Laying up short of the creek on hole 4 is often the smart play.',
      'A putt that would finish a little past the hole has the best chance of dropping.',
    ],
    touchNotes: ['Pull further back for more power; the bar on the right shows it.'],
  },
  achievements: [
    ['rounds', 'Tee Time', 'Finish a round.', 1, '⛳', 10],
    ['bogey', 'Bogey Golfer', 'Finish within 5 over par.', 1, '🏌️', 20],
    ['birdie', 'Birdie!', 'Score under par on a hole.', 1, '🐦', 20],
    ['putt', 'Long Putt', 'Hole a putt of 30 feet or more.', 30, '🎯', 25],
    ['par', 'Scratch Golfer', 'Finish at par or better on Normal or Hard.', 1, '🏆', 40],
  ],
  load: () => import('./GolfGame'),
});
