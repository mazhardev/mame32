import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'road-hopper',
  title: 'Road Hopper',
  category: 'arcade',
  difficulty: 'easy',
  icon: '🐔',
  tags: ['hop', 'crossing', 'traffic', 'endless', 'casual', 'featured'],
  short: 'Hop across endless roads, rivers and railways without getting squashed.',
  full: 'Why did the bird cross the road? To see how far it could get! Hop forward across busy roads, jump between drifting logs on the rivers, and wait for the warning light before crossing the railway. Collect coins on the grass — but keep moving, because the view creeps forward and won’t wait for you.',
  minutes: 3,
  controls: {
    keyboard: ['Arrow keys or WASD hop one square', 'Space also hops forward'],
    mouse: ['Click to hop forward; drag in a direction to hop that way'],
    touch: ['Tap to hop forward, swipe to hop in any direction, or use the pad'],
  },
  instructions: {
    objective: 'Hop forward as many rows as possible.',
    howToPlay: [
      'Each press hops one square. Trees block the way.',
      'Cars and trains are deadly. A flashing red light means a train is coming.',
      'Rivers can only be crossed by standing on logs, which carry you along. Being carried off the edge counts as falling in.',
      'The view slowly moves forward on its own; if you drop off the bottom, the game ends.',
    ],
    scoring: 'One point per new row reached, plus 5 per coin.',
    difficultyNotes: 'Easy: slow traffic and a lazy view. Hard: fast traffic and a pushy view.',
    tips: ['Pause on grass to time your road crossings.', 'On rivers, hop sideways along logs to line up the next jump.'],
    touchNotes: ['Tap anywhere to hop forward; swipe left, right or down for other directions.'],
  },
  achievements: [
    ['fifty', 'Across the Road', 'Reach row 50.', 50, '🐔', 15],
    ['two-hundred', 'Long Journey', 'Reach row 200.', 200, '🗺️', 40],
    ['coins', 'Coin Collector', 'Collect 10 coins in one run.', 10, '🪙', 20],
    ['hops', 'Frequent Hopper', 'Cross 2,000 rows in total.', 2000, '🦘', 30],
  ],
  load: () => import('./RoadHopperGame'),
});
