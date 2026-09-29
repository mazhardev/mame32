import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'fruit-slice',
  title: 'Fruit Slice',
  category: 'arcade',
  difficulty: 'easy',
  icon: '🍉',
  tags: ['swipe', 'slice', 'fruit', 'reflex', 'casual', 'touch'],
  short: 'Swipe to slice flying fruit in two — but never touch a bomb.',
  full: 'Fruit flies up into the air; swipe through it to slice it in half with a satisfying splash. Catch several fruits in one swipe for a combo bonus. Let three whole fruits fall and the game is over — and slicing a bomb ends it instantly.',
  minutes: 2,
  controls: {
    keyboard: ['Arrow keys steer the blade', 'Hold Space to cut while moving'],
    mouse: ['Hold the button and sweep the mouse across the fruit'],
    touch: ['Swipe your finger across the fruit'],
  },
  instructions: {
    objective: 'Slice as much fruit as possible.',
    howToPlay: [
      'Fruit is thrown up from the bottom. Swipe through it before it falls back.',
      'Each whole fruit that drops out of sight costs one of your three lives.',
      'Black bombs with lit fuses end the game if you slice them — swipe around them.',
      'Three or more fruits in a single swipe earn a combo bonus.',
    ],
    scoring: '1 point per fruit, plus the number of fruits for a combo of three or more.',
    difficultyNotes: 'Easy: fewer bombs and slower throws. Hard: frequent throws and more bombs.',
    tips: ['Wait for fruits to bunch up at the top of their arc for combos.', 'Short, quick swipes are safer near bombs.'],
    touchNotes: ['Swipe with a finger anywhere on the game.'],
  },
  achievements: [
    ['fifty', 'Fruit Salad', 'Score 50 in one game.', 50, '🍉', 15],
    ['hundred-fifty', 'Master Chef', 'Score 150 in one game.', 150, '👨‍🍳', 35],
    ['combo', 'Combo Slicer', 'Slice 5 fruits in one swipe.', 5, '🔪', 25],
    ['total', 'Juicer', 'Slice 2,000 fruits in total.', 2000, '🥤', 30],
  ],
  load: () => import('./FruitSliceGame'),
});
