import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'parking-challenge',
  title: 'Parking Challenge',
  category: 'racing',
  difficulty: 'medium',
  icon: '🅿️',
  tags: ['precision', 'levels', 'driving', 'puzzle', 'racing'],
  short: 'Ten tricky parking bays: nose in, reverse in and parallel park without a single scrape.',
  full: 'A slow, precise driving puzzle. Each of the ten levels has a marked yellow bay to park in — straight in, round corners, between tightly packed cars, parallel to the kerb, into a garage, and several that must be reversed into. Come to a complete stop with the whole car inside the lines, facing the arrow. Touching another car, a cone or a wall costs a life.',
  minutes: 6,
  hasLevels: true,
  controls: {
    keyboard: ['↑ forward, ↓ reverse', '← → steer'],
    touch: ['Use the direction pad: up and down drive, left and right steer'],
  },
  mouse: false,
  instructions: {
    objective: 'Park in all ten bays.',
    howToPlay: [
      'Drive into the yellow bay. ➜ means you must face that way; ⇆ means either way is fine.',
      'Stop with all four corners inside the bay; it turns green while you are parked correctly.',
      'Hold still for a moment to complete the level.',
      'Any bump against cars, cones or walls costs one of three lives and restarts the level.',
    ],
    scoring: '200 points per bay plus 20 for every second under the level’s par time.',
    difficultyNotes: 'Higher difficulty requires the car to be straighter in the bay.',
    tips: ['Steering only works while moving, and reverses when you reverse — just like a real car.', 'To reverse into a bay, drive past it first.'],
    touchNotes: ['Short taps on the pad give finer control than holding.'],
  },
  achievements: [
    ['level-5', 'Learner Driver', 'Complete 5 parking levels.', 5, '🅿️', 15],
    ['all', 'Driving Test Passed', 'Complete all ten levels.', 1, '🏆', 30],
    ['clean', 'Not a Scratch', 'Complete all ten levels without a bump.', 1, '✨', 40],
    ['hard', 'Valet Parker', 'Complete all ten levels on Hard.', 1, '🎩', 40],
    ['total', 'Car Park Regular', 'Complete 50 levels in total.', 50, '🎖️', 25],
  ],
  load: () => import('./ParkingChallengeGame'),
});
