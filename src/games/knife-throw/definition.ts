import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'knife-throw',
  title: 'Knife Throw',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🔪',
  tags: ['timing', 'one button', 'stages', 'reflex'],
  short: 'Throw knives into a spinning log — but never hit a knife that is already there.',
  full: 'A tense timing game. A wooden log spins at the top of the screen; tap to throw a knife into it. Stick every knife to split the log and reach the next stage, where the log spins in trickier patterns. Hitting another knife ends the run. Hit the apples for bonus points, and watch out for the boss log every five stages.',
  minutes: 2,
  controls: {
    keyboard: ['Space or ↑ to throw'],
    mouse: ['Click to throw'],
    touch: ['Tap to throw'],
  },
  instructions: {
    objective: 'Clear as many stages as you can.',
    howToPlay: [
      'Each tap throws one knife straight up into the log.',
      'The knife sticks where it lands — a knife that hits another knife bounces off and the game ends.',
      'Use all of a stage’s knives (the ticks on the left) to split the log.',
      'Later logs speed up, slow down and change direction. Every fifth log is a boss with extra knives already in it.',
    ],
    scoring: '1 point per knife, 5 per apple, 3 per log split.',
    difficultyNotes: 'Easy: slower logs and more room between knives. Hard: faster logs and a tighter squeeze.',
    tips: ['Throw just after a gap passes the bottom.', 'On changing logs, wait for a steady moment.'],
    touchNotes: ['Tap anywhere on the game to throw.'],
  },
  achievements: [
    ['stage-5', 'Boss Beaten', 'Reach stage 5.', 5, '🪵', 15],
    ['stage-15', 'Knife Master', 'Reach stage 15.', 15, '🗡️', 40],
    ['apples', 'Apple Picker', 'Hit 5 apples in one game.', 5, '🍎', 20],
    ['throws', 'Sharpshooter', 'Stick 500 knives in total.', 500, '🎯', 30],
  ],
  load: () => import('./KnifeThrowGame'),
});
