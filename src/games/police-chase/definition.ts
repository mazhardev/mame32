import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'police-chase',
  title: 'Police Chase',
  category: 'racing',
  difficulty: 'hard',
  icon: '🚓',
  tags: ['chase', 'pursuit', 'endless', 'traffic', 'racing'],
  short: 'Sirens on! Chase a fleeing suspect through traffic and ram them to make the arrest.',
  full: 'You are the patrol car. A suspect is fleeing down a busy four-lane road, swerving between lanes to lose you. Close the gap, line up behind them and ram their car four times to make the arrest — all before the clock runs out. Each arrest earns more time, but the next suspect drives faster. Careful: crashing into civilians damages your car, and three knocks take you off the case.',
  minutes: 4,
  controls: {
    keyboard: ['↑ accelerate, ↓ brake', '← → steer'],
    mouse: ['Hold the button to accelerate and steer towards the pointer'],
    touch: ['Hold the screen to accelerate and steer towards your finger, or use the pad'],
  },
  instructions: {
    objective: 'Arrest as many suspects as you can.',
    howToPlay: [
      'The black suspect car is ahead of you. An arrow shows where it is when it is off screen.',
      'Drive into it from behind to ram it. Four rams make an arrest.',
      'Every arrest adds 30 seconds; a new, faster suspect appears.',
      'Hitting civilian traffic slows you down and damages your car. Three hits and you are out.',
    ],
    scoring: '1,000 points per arrest plus 20 for every second left on the clock when you make it.',
    difficultyNotes: 'Higher difficulty gives you less time and faster suspects.',
    tips: ['Line up in the suspect’s lane before you close in.', 'The suspect barges through traffic; you cannot — pick your gaps.'],
    touchNotes: ['Hold your finger a little ahead of your car to chase and steer at once.'],
  },
  achievements: [
    ['first', 'First Collar', 'Make an arrest.', 1, '🚓', 15],
    ['five', 'Five-O', 'Make 5 arrests in one game.', 5, '🏆', 30],
    ['total', 'Chief of Police', 'Make 50 arrests in total.', 50, '🎖️', 30],
  ],
  load: () => import('./PoliceChaseGame'),
});
