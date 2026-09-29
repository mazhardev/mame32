import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'rhythm-runner',
  title: 'Rhythm Runner',
  category: 'arcade',
  difficulty: 'hard',
  icon: '🎵',
  tags: ['rhythm', 'jump', 'courses', 'one button', 'precision'],
  short: 'Jump a dashing cube over spikes and up blocks on a course built to the beat.',
  full: 'A precision one-button runner. Your cube dashes along a course whose spikes, blocks, staircases and jump pads land on a steady beat — listen for the tick. Tap to jump, hold to keep jumping as soon as you land. One touch of a spike or a block’s face sends you back to the start. Each difficulty is a fixed course: learn it and reach 100%.',
  minutes: 3,
  hasLevels: true,
  controls: {
    keyboard: ['Space or ↑ to jump (hold to jump again on landing)'],
    mouse: ['Click, or hold the button, to jump'],
    touch: ['Tap, or hold, to jump'],
  },
  instructions: {
    objective: 'Reach the end of the course (100%) without crashing.',
    howToPlay: [
      'The cube runs by itself. Jump over white spikes.',
      'You can land on top of blocks and run along them, but hitting a block’s side is a crash.',
      'Yellow pads launch you extra high.',
      'Obstacles are placed on the beat — the ticking sound helps with timing.',
    ],
    scoring: 'Your score is how far you got, in percent. Finishing scores 100.',
    difficultyNotes: 'Easy: slow course with single spikes and low blocks. Normal: faster, with triple spikes and jump pads. Hard: the fastest course with the toughest patterns.',
    tips: ['Jump at the last moment for spikes, but early for staircases.', 'Holding the button keeps you bouncing — handy for spike rows.'],
    touchNotes: ['Tap anywhere on the game to jump; hold for continuous jumping.'],
  },
  achievements: [
    ['half', 'Halfway There', 'Reach 50% of a course.', 1, '🎵', 15],
    ['complete', 'In the Groove', 'Complete a course.', 1, '🎶', 30],
    ['hard', 'Perfect Pitch', 'Complete the Hard course.', 1, '🏆', 50],
    ['attempts', 'Practice Makes Perfect', 'Make 50 attempts.', 50, '🔁', 20],
  ],
  load: () => import('./RhythmRunnerGame'),
});
