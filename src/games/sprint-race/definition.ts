import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'sprint-race',
  title: 'Sprint Race',
  category: 'sports',
  difficulty: 'easy',
  icon: '🏃',
  tags: ['tapping', 'speed', 'athletics', 'quick', 'sports'],
  short: 'The 100 m dash: alternate two buttons as fast as you can and beat three rivals to the line.',
  full: 'A frantic button-bashing 100 m sprint. Wait in the blocks for the gun, then alternate left and right as fast and as evenly as you can — hitting the same side twice does nothing, so rhythm counts. Go before the gun and you are held back for a second. Beat three rival sprinters for gold.',
  minutes: 1,
  controls: {
    keyboard: ['Alternate ← and →, or Z and M, or A and L'],
    mouse: ['Click the left and right halves alternately'],
    touch: ['Tap the left and right halves of the screen alternately, or the two arrow buttons'],
  },
  instructions: {
    objective: 'Run 100 m faster than your three rivals.',
    howToPlay: [
      'Press Start. The runners settle in the blocks: “Set…”.',
      'After a random pause the gun fires — start alternating left and right.',
      'Each alternate press adds speed; repeating the same side does nothing.',
      'Pressing before the gun is a false start and holds you back for one second.',
    ],
    scoring: '100 points per tenth of a second under 20 s, plus a medal bonus.',
    difficultyNotes: 'Rivals run around 11.6 s on Easy, 10.8 s on Normal and 10 s on Hard.',
    tips: ['Use two fingers, one per key, rather than one finger.', 'Keep a steady rhythm; speed fades between presses.'],
    touchNotes: ['Use both thumbs, one on each half of the screen.'],
  },
  achievements: [
    ['gold', 'Gold Medal', 'Win a race.', 1, '🥇', 15],
    ['fast', 'Sub-11', 'Run 100 m in under 11 seconds.', 1, '⚡', 25],
    ['hard', 'World Class', 'Win on Hard.', 1, '🏆', 30],
    ['races', 'Season Athlete', 'Run 50 races.', 50, '🎖️', 20],
  ],
  load: () => import('./SprintRaceGame'),
});
