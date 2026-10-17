import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'candy-match',
  title: 'Candy Match',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '🍬',
  tags: ['match', 'match 3', 'levels', 'saga', 'sweets', 'casual', 'boosters', 'jelly'],
  short: 'A 120-level sweet-matching saga with jelly, icing, chocolate, ingredients and boosters.',
  full: 'Travel a candy trail of 120 levels across eight worlds — from Sugar Meadow to the Starlight Bakery. Swap neighbouring sweets to match three or more, build striped, wrapped and rainbow candies, and combine them for huge blasts. Each level has its own goal and move limit: collect sweets, clear jelly, break icing, stop spreading chocolate, or bring hazelnuts and cherries down to the bottom of the board. Finish with moves to spare to set off a Sugar Rush, earn up to three stars, and win boosters along the way.',
  minutes: 4,
  hasLevels: true,
  difficultyPicker: 'none',
  controls: {
    keyboard: ['Arrow keys move the cursor', 'Enter picks up a candy, then an arrow key swaps it', 'Enter smashes the cursor cell with the hammer'],
    mouse: ['Drag a candy towards a neighbour to swap', 'Or click a candy, then its neighbour', 'Click a level on the map to play it'],
    touch: ['Swipe a candy towards the neighbour you want to swap with', 'Tap a level on the map to play it'],
  },
  instructions: {
    objective: 'Complete every goal shown at the top before your moves run out, then move on along the candy trail.',
    howToPlay: [
      'Swap two neighbouring candies to line up three or more of the same kind. Swaps that make no match bounce back and cost nothing.',
      'Four in a line makes a striped candy that clears its row or column. An L or T shape makes a wrapped candy that blasts the 3×3 area around it. Five in a line makes a rainbow candy that clears every candy of the kind you swap it with.',
      'Swap two special candies together for a combo: two stripes make a cross, a stripe and a wrapped candy clear three rows and three columns, two wrapped candies make a 5×5 blast, and a rainbow turns every candy of a kind into the special it is swapped with. Two rainbows clear the board.',
      'Goals: collect sweets of a colour, clear jelly by matching on top of it (darker jelly needs two), break icing by matching next to it, clear chocolate before it spreads, or bring ingredients down and out through the arrows at the bottom.',
      'Locked candies cannot be swapped. Match them (or blast them) to break the lock.',
      'Boosters: the Hammer smashes one cell, Free Swap swaps any two neighbours, Shuffle mixes the board. When you run out of moves you can spend a +5 Moves booster to keep going.',
    ],
    scoring:
      'Points for every candy (multiplied by chain reactions), special candy, obstacle, jelly layer and ingredient. Moves left at the end trigger a Sugar Rush of striped candies for bonus points. Stars depend on how many moves you have left.',
    difficultyNotes:
      'Difficulty rises along the trail: each world adds a new obstacle, later boards have unusual shapes, double jelly, thick icing and a sixth colour of candy. Every level has been play-tested to be beatable within its move limit.',
    tips: [
      'Make matches low on the board: the candies that fall in can set off free cascades.',
      'Save special candies for where they count — a stripe aimed down a column of jelly, or a wrapped candy next to icing.',
      'On chocolate levels, clear at least one chocolate block every move or it grows.',
      'For ingredients, clear the candies directly underneath them so they drop faster.',
      'Three-star a level for the first time to win a booster, and finish a world for a full set.',
    ],
    touchNotes: ['Swipe candies with your finger. Tap a booster, then tap the board to use it. Tap 🗺 Map to return to the trail.'],
  },
  achievements: [
    ['first', 'Sweet Start', 'Complete your first level.', 1, '🍬', 10],
    ['three-stars', 'Sugar Rush', 'Complete a level with three stars.', 1, '⭐', 20],
    ['jelly', 'Jelly Buster', 'Complete a jelly level.', 1, '🍮', 15],
    ['bomb', 'Wrapped Up', 'Make a wrapped candy.', 1, '🎁', 10],
    ['rainbow', 'Rainbow Drop', 'Make a rainbow candy.', 1, '🌈', 20],
    ['combo', 'Sweet Combination', 'Swap two special candies together.', 1, '💥', 20],
    ['ingredient', 'Nut Delivery', 'Bring an ingredient to the bottom of the board.', 1, '🌰', 15],
    ['twenty', 'Sweet Tooth', 'Complete 20 levels.', 20, '🍭', 30],
    ['pack', 'World Champion', 'Complete every level in a world.', 1, '🏆', 50],
    ['saga', 'Master Confectioner', 'Complete all 120 levels.', 1, '👑', 150],
  ],
  load: () => import('./CandyMatchGame'),
});
