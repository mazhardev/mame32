import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'endless-traffic-driving',
  title: 'Endless Traffic Driving',
  category: 'racing',
  difficulty: 'easy',
  icon: '🚙',
  tags: ['endless', 'survival', 'coins', 'one tap', 'racing'],
  short: 'A relaxed endless drive: hop between three lanes, dodge slow traffic and collect coins.',
  full: 'The friendliest driving game on the site. Your car drives itself down an endless country road; tap left or right to hop one lane at a time. Dodge the slower traffic ahead, scoop up lines of coins, and see how far you can go. You have three lives, with a moment of safety after every bump, and the speed creeps up gently as you go.',
  minutes: 3,
  controls: {
    keyboard: ['← → hop one lane'],
    mouse: ['Click to the left or right of the car to hop that way'],
    touch: ['Tap to the left or right of the car, or use the arrow buttons'],
  },
  instructions: {
    objective: 'Drive as far as you can and collect as many coins as possible.',
    howToPlay: [
      'Your car speeds along by itself in one of three lanes.',
      'Each tap moves one lane to the left or right.',
      'Coins come in lines of four: drive through them.',
      'Hitting a car costs a life; you then flash and are safe for two seconds.',
    ],
    scoring: 'One point per 20 m plus 10 per coin.',
    difficultyNotes: 'Higher difficulty starts faster. Speed always rises slowly over time.',
    tips: ['Change lanes early: there is plenty of time if you look ahead.', 'It is fine to skip a coin line to stay safe.'],
    touchNotes: ['Tap anywhere on the side of the road you want to move towards.'],
  },
  achievements: [
    ['km-3', 'Sunday Driver', 'Drive 3 km in one run.', 3, '🚙', 10],
    ['coins-50', 'Coin Cruiser', 'Collect 50 coins in one run.', 50, '🪙', 20],
    ['total', 'Loose Change', 'Collect 1,000 coins in total.', 1000, '🎖️', 25],
  ],
  load: () => import('./EndlessTrafficDrivingGame'),
});
