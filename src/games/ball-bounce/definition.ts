import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'ball-bounce',
  title: 'Ball Bounce',
  category: 'arcade',
  difficulty: 'easy',
  icon: '⚪',
  tags: ['ball', 'bounce', 'timing', 'platforms', 'physics', 'endless'],
  short: 'A never-stopping bouncy ball: speed up, slow down and slam to land every bounce.',
  full: 'Your ball bounces on its own and keeps rolling forward — your job is timing. Speed up to clear long gaps, ease off to drop onto near ledges, and slam straight down when you are about to overshoot. Watch out for spike strips, ledges that crumble after one bounce, and springy pads that launch you higher than usual. Collect gems along the way.',
  minutes: 3,
  controls: {
    keyboard: ['→ / D speed up', '← / A slow down', 'Space or ↓ slam down'],
    mouse: ['Hold on the right third to speed up, the left third to slow down', 'Click the middle to slam'],
    touch: ['◀ ▶ buttons change speed, Slam drops straight down'],
  },
  instructions: {
    objective: 'Land every bounce on a platform for as long as you can.',
    howToPlay: [
      'The ball always bounces to the same height, and always rolls forward.',
      'Holding right speeds the ball up; holding left slows it down. Let go to return to cruising speed.',
      'Slam drops the ball straight down — handy when you are about to overshoot.',
      'Red spikes pop the ball. Cracked brown ledges crumble after one bounce.',
      'Green spring pads bounce you higher, so the next jump is longer.',
    ],
    scoring: '1 point for every new platform and 5 per gem.',
    difficultyNotes: 'Harder settings make the ball faster overall. Platforms narrow and hazards appear more often as you go.',
    tips: ['Decide early — speed changes take a moment.', 'Aim for the middle of each platform.', 'After a spring, you will fly further than you expect.'],
    touchNotes: ['Hold ◀ or ▶ to change speed; tap Slam to drop.'],
  },
  achievements: [
    ['platforms-25', 'Bouncy', 'Land on 25 platforms in one run.', 25, '⚪', 15],
    ['platforms-100', 'Unstoppable', 'Land on 100 platforms in one run.', 100, '🏅', 35],
    ['score', 'Bounce Master', 'Score 250 points in one run.', 250, '🏆', 30],
    ['gems', 'Gem Hunter', 'Collect 100 gems in total.', 100, '💎', 25],
  ],
  load: () => import('./BallBounceGame'),
});
