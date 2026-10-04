import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'highway-racer',
  title: 'Highway Racer',
  category: 'racing',
  difficulty: 'medium',
  icon: '🛣️',
  tags: ['endless', 'traffic', 'speed', 'checkpoints', 'racing'],
  short: 'Beat the clock to each checkpoint on a busy four-lane motorway — day into night.',
  full: 'An arcade checkpoint race on a four-lane motorway. The clock is always ticking down; reach the next checkpoint to add more time. Crashing does not end your run, but it knocks you down to a crawl and costs you seconds you cannot afford. Keep going long enough and the sun sets, leaving only your headlights to show the traffic ahead.',
  minutes: 4,
  controls: {
    keyboard: ['↑ accelerate, ↓ brake', '← → steer'],
    mouse: ['Hold the button to accelerate; the car steers towards the pointer'],
    touch: ['Hold the screen to accelerate and steer, or use the pad'],
  },
  instructions: {
    objective: 'Drive as far as possible before the timer reaches zero.',
    howToPlay: [
      'Every 5 km is a checkpoint that adds time to the clock.',
      'Later checkpoints add a little less time.',
      'A crash slows you to a crawl and briefly takes away control.',
      'After 15 km it gets dark: watch the headlight cone.',
    ],
    scoring: 'One point per 25 m driven plus 500 per checkpoint.',
    difficultyNotes: 'Higher difficulty starts with less time and gives less per checkpoint, but your car is faster.',
    tips: ['Top speed matters, but a single crash costs more than braking would have.', 'Trucks are long — leave extra room when passing them.'],
    touchNotes: ['Hold your finger ahead of the car to accelerate and steer.'],
  },
  achievements: [
    ['cp-5', 'Road Warrior', 'Reach 5 checkpoints in one run.', 5, '🛣️', 20],
    ['night', 'Night Driver', 'Drive into the night (15 km).', 1, '🌙', 20],
    ['clean', 'Clean Driving', 'Reach 3 checkpoints without crashing.', 1, '✅', 25],
    ['km', 'Long Haul', 'Drive 500 km in total.', 500, '🎖️', 30],
  ],
  load: () => import('./HighwayRacerGame'),
});
