import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'motorcycle-racing',
  title: 'Motorcycle Racing',
  category: 'racing',
  difficulty: 'medium',
  icon: '🏍️',
  tags: ['endless', 'traffic', 'bike', 'wheelie', 'racing'],
  short: 'Split lanes on a two-way road, ride the oncoming lanes for double points and pull wheelies.',
  full: 'A fast, risky motorbike run on a two-way road. Your bike is slim enough to squeeze between cars in neighbouring lanes. The two left lanes carry oncoming traffic: ride there for double points if you dare. Hold the wheelie button for a burst of extra speed — but while the front wheel is in the air you cannot steer.',
  minutes: 3,
  controls: {
    keyboard: ['← → steer', '↑ throttle, ↓ brake', 'Hold Space or X to wheelie'],
    mouse: ['Hold the button to accelerate and steer towards the pointer'],
    touch: ['Direction pad and Wheelie button, or hold the screen to ride towards your finger'],
  },
  instructions: {
    objective: 'Ride as far as you can and score as many points as possible.',
    howToPlay: [
      'Traffic on the right two lanes goes your way; the left two lanes come towards you.',
      'Points come with distance, doubled in the oncoming lanes.',
      'Pass between two cars side by side for a lane-split bonus.',
      'A wheelie gives up to 25 % more top speed and more points, but locks your steering.',
      'Touching any vehicle ends the ride.',
    ],
    scoring: 'Distance points (×2 in oncoming lanes, more in a wheelie) plus 150 per lane split.',
    difficultyNotes: 'Higher difficulty raises your top speed, which makes everything come at you faster.',
    tips: ['Only wheelie on a clear stretch.', 'Oncoming cars close in very quickly; dip in and out of those lanes.'],
    touchNotes: ['Hold the Wheelie button with your right thumb and steer with the pad.'],
  },
  achievements: [
    ['km-5', 'Road Rider', 'Ride 5 km in one run.', 5, '🏍️', 15],
    ['oncoming-30', 'Wrong Way', 'Spend 30 seconds in the oncoming lanes in one run.', 30, '⚠️', 25],
    ['splits-10', 'Filter Master', 'Make 10 lane splits in one run.', 10, '↔️', 25],
    ['total', 'Iron Butt', 'Ride 200 km in total.', 200, '🎖️', 30],
  ],
  load: () => import('./MotorcycleRacingGame'),
});
