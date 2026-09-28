import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'parking-puzzle',
  title: 'Parking Puzzle',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🅿️',
  tags: ['sliding cars', 'logic', 'levels', 'parking', 'casual'],
  short: 'Clear the jammed car park — each car only drives forwards, so pick the right order.',
  full: 'The car park is jammed. Every car faces one way and can only drive forwards: if the road ahead is clear it drives out, but if another car or a bollard is in the way it bumps it and picks up a dent. Work out the order that empties the lot without a scratch. Sixty levels across three packs, each with a star rating.',
  minutes: 3,
  hasLevels: true,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to a car and press Enter to drive it'],
    mouse: ['Click a car to drive it forwards'],
    touch: ['Tap a car to drive it forwards'],
  },
  instructions: {
    objective: 'Drive every car out of the lot with as few dents as possible.',
    howToPlay: [
      'The arrow and windscreen on each car show which way it faces. Cars only drive forwards.',
      'A car with a clear road to the edge drives away. A car with something in front bumps it and gets a dent, but stays put.',
      'Yellow-and-black bollards never move. Every lot can be cleared, so no car is stuck behind one for good.',
      'Clear the lot to unlock the next level. Your best result for each level is saved.',
    ],
    scoring:
      '60 points per car, minus 45 per dent and 2 per second beyond a par of 3 seconds per car. Three stars for no dents, two for one or two.',
    difficultyNotes:
      'Easy: 5×5 lots with 5–9 cars. Normal: 6×6 lots with up to 13 cars and a bollard. Hard: 7×7 lots with up to 17 cars and three bollards.',
    tips: [
      'Start with cars on the edge that face outwards.',
      'Trace each car’s road to the edge before tapping it.',
      'Some cars can only leave after several others — find the chain.',
    ],
    touchNotes: ['Tap a car to send it. Use the level picker to replay any unlocked level.'],
  },
  achievements: [
    ['first', 'Pulling Out', 'Clear your first car park.', 1, '🅿️', 10],
    ['no-dents', 'Not a Scratch', 'Clear a lot with no dents.', 1, '✨', 15],
    ['twenty', 'Valet', 'Clear 20 car parks.', 20, '🚗', 30],
    ['pack', 'Full Pack', 'Clear every level in one pack.', 1, '🏁', 40],
    ['hard-final', 'Gridlock Buster', 'Clear the final Hard level.', 1, '🏆', 50],
  ],
  load: () => import('./ParkingGame'),
});
