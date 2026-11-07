import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'snip-snack',
  title: 'Snip Snack',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🍬',
  tags: ['physics', 'rope', 'cut', 'candy', 'sweet', 'monster', 'stars', 'levels', 'swipe'],
  short: 'Cut the ropes to swing a sweet into the Nibbler’s mouth and grab three stars on the way — 15 levels.',
  full: 'A sweet dangles from ropes and the Nibbler, a small green monster, is very hungry. Swipe across a rope to cut it and let the sweet swing, fly and fall. Time your cuts so it picks up all three stars before it drops into the Nibbler’s mouth. Bubbles float the sweet upward until you pop them, blowers puff it sideways, dotted rings tie on a fresh rope as it passes, and spikes are best avoided. 15 levels across the Pantry, the Garden Shed and the Toy Box.',
  minutes: 5,
  hasLevels: true,
  controls: {
    mouse: ['Drag across a rope to cut it', 'Click a bubble to pop it', 'Click a blower to puff air'],
    keyboard: ['1–9 cut the rope with that number', 'Space pops the bubble, or puffs the first blower', 'B puffs the second blower'],
    touch: ['Swipe across a rope to cut it', 'Tap a bubble to pop it', 'Tap a blower to puff air'],
  },
  instructions: {
    objective: 'Get the sweet into the Nibbler’s mouth, collecting all three stars on the way if you can.',
    howToPlay: [
      'Swipe across a rope to cut it. A sweet held by several ropes swings on the ones that are left.',
      'The sweet picks up any star it touches. The Nibbler eats it when it reaches his mouth.',
      'A bubble closes round the sweet when it touches it and carries it upward. Tap the bubble to pop it and the sweet drops again.',
      'Tap a pink blower to puff air. It pushes the sweet if the sweet is in front of it and close enough.',
      'A dotted ring ties a new rope to the sweet as soon as the sweet comes inside it.',
      'If the sweet falls off the screen or touches spikes, the level is lost and you can play it again. Win a level to unlock the next.',
    ],
    scoring: '1,000 points for feeding the Nibbler and 1,000 more for each star. The level list shows your best stars for every level.',
    difficultyNotes: 'The levels are the same on every difficulty. Easy runs the action at three-quarters speed so there is more time to cut; Hard runs it a little faster.',
    tips: [
      'Watch the sweet swing once before you cut. Cutting at the end of a swing drops it straight down; cutting at the bottom flings it.',
      'Several ropes? Cut them one at a time and see where the sweet swings next.',
      'A bubble that has been puffed sideways keeps its new place, so you can pop it whenever the sweet is right above the Nibbler.',
      'Missed a star? Restart and try a slightly earlier or later cut.',
    ],
    touchNotes: ['Swipe a finger across a rope to cut it. You can cut several ropes in one swipe. Tap bubbles and blowers.'],
  },
  achievements: [
    ['first', 'Sweet Tooth', 'Feed the Nibbler for the first time.', 1, '🍬', 10],
    ['three', 'Star Snacker', 'Win a level with all three stars.', 1, '⭐', 15],
    ['stars', 'Star Collector', 'Collect 30 stars in winning levels.', 30, '🌟', 25],
    ['shed', 'Out of the Shed', 'Win level 10 or any later level.', 1, '🧺', 25],
    ['all', 'Toy Box Champion', 'Win the last level, Grand Finale.', 1, '🏆', 50],
    ['perfect', 'Three-Star Chef', 'Get three stars on all 15 levels.', 15, '👑', 80],
  ],
  load: () => import('./SnipSnackGame'),
});
