import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'match-three',
  title: 'Match Three',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '💠',
  tags: ['match', 'swap', 'chain', 'gems', 'timed', 'casual'],
  short: 'Swap gems to line up three or more — a fast, timed gem blitz with special combos.',
  full: 'A timed gem-matching blitz. Swap neighbouring gems to make lines of three or more of the same kind. Longer lines and L or T shapes create special gems that clear rows, columns, blasts or every gem of one colour — and chain reactions multiply your points. Score as much as you can before the clock runs out. Every gem has its own shape as well as its colour.',
  minutes: 2,
  controls: {
    keyboard: ['Arrow keys move the cursor', 'Enter picks up a gem, then an arrow key swaps it that way'],
    mouse: ['Drag a gem towards a neighbour to swap', 'Or click a gem, then click the neighbour to swap with'],
    touch: ['Swipe a gem towards the neighbour you want to swap with'],
  },
  instructions: {
    objective: 'Score as many points as possible before time runs out.',
    howToPlay: [
      'Swap two neighbouring gems to make a line of three or more matching gems. Swaps that make no match bounce back.',
      'Matched gems disappear, the gems above fall down, and new gems drop in — which can set off chain reactions.',
      'Four in a line makes a striped gem that clears a whole row or column when matched.',
      'An L or T shape makes a bomb that clears the gems around it. Five in a line makes a rainbow gem: swap it with any gem to clear all of that kind.',
      'Swap two special gems together for an even bigger effect.',
    ],
    scoring: '10 points per gem cleared, multiplied by the cascade step (×2 for the first chain reaction, ×3 for the next…), plus 30 per special gem made.',
    difficultyNotes: 'Easy: 5 kinds of gem and 2 minutes. Normal: 6 kinds and 90 seconds. Hard: 7 kinds and 60 seconds.',
    tips: [
      'Make matches near the bottom — the falling gems often set off free chain reactions.',
      'Save rainbow gems for the colour that fills most of the board.',
      'If you stop for a few seconds, a possible move starts to wiggle.',
    ],
    touchNotes: ['Swipe gems with your finger; a swipe swaps with the neighbour in that direction.'],
  },
  achievements: [
    ['special', 'Something Special', 'Create a special gem.', 1, '✨', 10],
    ['rainbow', 'Over the Rainbow', 'Create a rainbow gem.', 1, '🌈', 20],
    ['cascade', 'Chain Reaction', 'Set off a cascade of four or more steps.', 1, '⛓️', 25],
    ['score-3000', 'Gem Collector', 'Score 3,000 points in one round.', 3000, '💎', 20],
    ['score-8000', 'Jeweller', 'Score 8,000 points in one round.', 8000, '👑', 40],
  ],
  load: () => import('./MatchThreeGame'),
});
