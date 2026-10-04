import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'traffic-racer',
  title: 'Traffic Racer',
  category: 'racing',
  difficulty: 'medium',
  icon: '🚗',
  tags: ['endless', 'traffic', 'dodge', 'near miss', 'racing'],
  short: 'Weave through busy traffic at full speed and chain near misses for big combos.',
  full: 'An endless traffic dodger where you set the pace. Hold the accelerator to go faster and score faster, but the gaps between cars close quicker too. Slip past a car with only a whisker of space for a near miss, and keep them coming to build a combo multiplier. Cars change lanes now and then, and trucks are long. One crash ends the run.',
  minutes: 3,
  controls: {
    keyboard: ['← → steer', '↑ accelerate, ↓ brake'],
    mouse: ['Hold the button to accelerate; the car steers towards the pointer'],
    touch: ['Hold the screen to accelerate and steer towards your finger, or use the pad'],
  },
  instructions: {
    objective: 'Drive as far and score as much as you can without crashing.',
    howToPlay: [
      'Your car keeps moving; ↑ speeds up and ↓ slows down (there is a minimum speed).',
      'Steer between the lanes to get past slower cars.',
      'Passing a car very closely at speed is a near miss: +50 × your combo.',
      'Near misses within three seconds of each other keep the combo going.',
      'Touching any vehicle ends the run.',
    ],
    scoring: 'Points for distance (more at high speed) plus near-miss combos.',
    difficultyNotes: 'Higher difficulty raises your top speed and the amount of traffic.',
    tips: ['Watch for indicators of lane changes: cars drift slowly across.', 'Brake briefly to let a gap open rather than forcing through.'],
    touchNotes: ['Hold your finger slightly ahead of the car to steer and accelerate together.'],
  },
  achievements: [
    ['km-5', 'Commuter', 'Drive 5 km in one run.', 5, '🚗', 15],
    ['combo-5', 'Close Call', 'Chain a combo of 5 near misses.', 5, '😬', 20],
    ['score-5000', 'Rush Hour Hero', 'Score 5,000 points in one run.', 5000, '🏆', 30],
    ['misses', 'Daredevil', 'Make 300 near misses in total.', 300, '🎖️', 25],
  ],
  load: () => import('./TrafficRacerGame'),
});
