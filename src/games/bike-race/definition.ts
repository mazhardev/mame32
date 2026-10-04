import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'bike-race',
  title: 'Bike Race',
  category: 'sports',
  difficulty: 'medium',
  icon: '🚴',
  tags: ['motocross', 'physics', 'balance', 'jumps', 'racing', 'sports'],
  short: 'Race a dirt bike over jumps and whoops against two ghost riders across three stages.',
  full: 'Three motocross stages packed with kickers, tabletops, whoops, step-ups and drops. Hold the throttle, brake before the big drops and lean to land your jumps level — land on your head and you go back to the last checkpoint while the clock keeps running. Two ghost riders show the pace to beat; land a full flip in the air for bonus points.',
  minutes: 4,
  hasLevels: true,
  controls: {
    keyboard: ['↑ or Space throttle, ↓ brake', '← lean back, → lean forward'],
    touch: [
      'Bottom-right: throttle, bottom-left: brake',
      'Top-right: lean forward, top-left: lean back',
    ],
  },
  instructions: {
    objective: 'Finish all three stages, beating the ghost riders’ times.',
    howToPlay: [
      'Throttle drives the rear wheel; too much speed off a kicker sends you flying.',
      'Leaning shifts your weight. In the air it rotates the bike much more than on the ground.',
      'Land with both wheels parallel to the slope. If your head hits the ground, you restart from the last checkpoint.',
      'The coloured dots on the progress bar are the ghost riders.',
    ],
    scoring:
      'Points for finishing fast (1000 per stage minus 12 per second), 200 per stage win and 50 per flip.',
    difficultyNotes:
      'Easy has smaller jumps and slower ghosts. Hard has bigger features and ghosts that ride close to flat out.',
    tips: [
      'Ease off before tabletops so you land on the far downslope.',
      'Lean back over step-ups to lift the front wheel.',
    ],
    touchNotes: ['Keep one thumb on throttle and use the other for leaning.'],
  },
  achievements: [
    ['finish', 'Moto Rookie', 'Finish all three stages.', 1, '🏁', 15],
    ['win', 'Holeshot', 'Win a stage.', 1, '🥇', 20],
    ['clean', 'Clean Run', 'Finish without crashing.', 1, '✨', 30],
    ['flips', 'Flip Master', 'Land 10 flips in total.', 10, '🔄', 30],
    ['hard', 'Supercross Champion', 'Win every stage on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./BikeRaceGame'),
});
