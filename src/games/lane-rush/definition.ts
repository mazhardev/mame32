import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'lane-rush',
  title: 'Lane Rush',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🏃',
  tags: ['runner', 'endless', 'swipe', 'trains', 'coins', 'reflex', 'arcade'],
  short: 'Dash down three lanes of track: dodge trains, jump hurdles, slide under bars and grab coins.',
  full: 'Run as far as you can down a busy stretch of track at sunset. Swipe between three lanes to dodge oncoming trains, jump the hurdles, slide under the bars and scoop up coins on the way. The pace keeps rising the further you go. Grab a magnet to pull in every coin nearby, a 2× badge to double your score, or a shield that saves you from one crash.',
  minutes: 5,
  controls: {
    keyboard: ['← → (or A, D) change lanes', '↑, W or Space jump', '↓ or S slide (in the air: drop fast)'],
    touch: ['Swipe left or right to change lanes', 'Swipe up (or tap) to jump', 'Swipe down to slide'],
  },
  instructions: {
    objective: 'Run as far as you can and collect coins without crashing.',
    howToPlay: [
      'You run automatically and keep speeding up. Move between the three lanes to stay clear of trains.',
      'Jump over red-and-white hurdles. Slide under yellow-and-black bars, because jumping into them is a crash.',
      'Pressing down in mid-air drops you straight to the ground into a slide.',
      'Brushing the side of a train while changing lanes bounces you back; running into its front ends the run.',
      'Power-ups: the red magnet pulls in nearby coins from every lane, the purple 2× doubles your score for a while, and the blue shield saves you from one crash.',
    ],
    scoring: 'One point per metre and 10 per coin, both doubled while 2× is active.',
    difficultyNotes: 'Easy: a gentle starting pace and a low top speed. Normal: faster. Hard: starts fast and speeds up quickly to a very high top speed.',
    tips: [
      'Keep to the middle lane when you can: it is one move from either side.',
      'Coins in an arc mean there is a hurdle underneath. Jump through them.',
      'Save the shield for the late game, when things move fastest.',
    ],
    touchNotes: ['Swipe anywhere on the game: left and right change lanes, up jumps and down slides. A quick tap also jumps.'],
  },
  achievements: [
    ['first', 'Off the Blocks', 'Run 500 metres in one go.', 500, '👟', 10],
    ['marathon', 'Long Hauler', 'Run 3,000 metres in one go.', 3000, '🏅', 50],
    ['coins', 'Pocketful', 'Collect 150 coins in one run.', 150, '🪙', 25],
    ['shield', 'Saved by the Shield', 'Survive a crash with a shield.', 1, '🛡️', 15],
  ],
  load: () => import('./LaneRushGame'),
});
