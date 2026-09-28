import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'candy-match',
  title: 'Candy Match',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '🍬',
  tags: ['match', 'levels', 'chain', 'sweets', 'casual', 'goals'],
  short: 'Match sweets to hit each level’s goal before you run out of moves.',
  full: 'A level-by-level sweet-matching puzzle. Each level has a goal — reach a target score, collect a number of particular sweets, or clear all the jelly from the board — and a limited number of moves. Line up three or more matching sweets, build striped sweets, bombs and rainbow sweets for big clears, and finish with moves to spare for bonus points and three stars. Seventy-two levels across three packs.',
  minutes: 3,
  hasLevels: true,
  controls: {
    keyboard: ['Arrow keys move the cursor', 'Enter picks up a sweet, then an arrow key swaps it'],
    mouse: ['Drag a sweet towards a neighbour to swap', 'Or click a sweet, then its neighbour'],
    touch: ['Swipe a sweet towards the neighbour you want to swap with'],
  },
  instructions: {
    objective: 'Complete the level goal before your moves run out.',
    howToPlay: [
      'Swap two neighbouring sweets to make a line of three or more of the same kind. Only swaps that make a match use up a move.',
      'Goals: reach the target score, collect enough of the sweets shown, or clear every jelly tile by making matches on top of them. Darker jelly needs two matches.',
      'Four in a line makes a striped sweet; an L or T makes a bomb; five in a line makes a rainbow sweet that clears every sweet of the kind you swap it with.',
      'Every move left over when you finish is worth 100 bonus points.',
    ],
    scoring:
      '10 points per sweet cleared, multiplied by chain reactions, plus 30 per special made and 100 per unused move. Stars depend on how many moves you have left.',
    difficultyNotes:
      'Easy: 5 kinds of sweet and generous move limits. Normal: 5–6 kinds with tighter limits. Hard: 6 kinds, bigger goals and the fewest moves.',
    tips: [
      'On jelly levels, make matches low on the board so falling sweets land on jelly too.',
      'For collection goals, a rainbow sweet swapped with the colour you need collects them all at once.',
      'Watch the goal counter — do not waste specials once the goal is almost done.',
    ],
    touchNotes: ['Swipe sweets with your finger. Replay any unlocked level from the level picker.'],
  },
  achievements: [
    ['first', 'Sweet Start', 'Complete your first level.', 1, '🍬', 10],
    ['three-stars', 'Sugar Rush', 'Complete a level with three stars.', 1, '⭐', 20],
    ['jelly', 'Jelly Buster', 'Complete a jelly level.', 1, '🍮', 15],
    ['bomb', 'Candy Bomb', 'Make a bomb sweet.', 1, '💣', 10],
    ['rainbow', 'Rainbow Drop', 'Make a rainbow sweet.', 1, '🌈', 20],
    ['twenty', 'Sweet Tooth', 'Complete 20 levels.', 20, '🍭', 30],
    ['pack', 'Candy Champion', 'Complete every level in one pack.', 1, '🏆', 50],
  ],
  load: () => import('./CandyMatchGame'),
});
