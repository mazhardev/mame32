import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'alchemy-lab',
  title: 'Alchemy Lab',
  category: 'casual',
  difficulty: 'easy',
  icon: '⚗️',
  tags: ['discovery', 'combine', 'crafting', 'elements', 'relaxing', 'creative'],
  short: 'Mix water, fire, earth and air to discover 153 elements, from steam to astronauts.',
  full: 'A relaxing discovery game in the spirit of the element-crafting games that spread through classrooms. You begin with water, fire, earth and air. Mix any two to make something new: water and fire make steam, earth and water make mud, and before long you are building villages, launching rockets and finding dragons. There are 153 elements and an original recipe book to work through, with no timer and no way to lose. Every discovery is saved in your browser, and a hint is there whenever you get stuck. For more calm games try [Pixel Art](game:pixel-art) or [Mandala Coloring](game:mandala-coloring), or see all [relaxing games](hub:relaxing-games).',
  minutes: 10,
  hasSaveState: true,
  hasHighScore: false,
  difficultyPicker: 'none',
  controls: {
    keyboard: ['Tab to an element and press Enter to add it to the bench'],
    mouse: ['Click two elements to mix them'],
    touch: ['Tap two elements to mix them'],
  },
  instructions: {
    objective: 'Discover all 153 elements by mixing the ones you have found.',
    howToPlay: [
      'Tap one element, then a second. The two are mixed on the bench above.',
      'If they make something you have not found yet, it is added to your collection.',
      'Many pairs make nothing: that is part of the fun. An element can be mixed with itself.',
      'Elements with a dashed border cannot make anything more.',
      'Use the search box to find an element quickly, and Hint when you are stuck.',
    ],
    scoring: 'Discover every element for 20 points each, minus 25 per hint used.',
    difficultyNotes: 'There is no timer and no way to lose; play at your own pace. Restart wipes your collection.',
    tips: [
      'Try every new element with the four starting elements first.',
      'Think about what things are made of: glass comes from sand and fire, bread from flour and fire.',
      'Life, humans and tools open up whole new branches of the recipe book.',
    ],
    touchNotes: ['Tap two elements to mix them. Scroll the collection to see everything you have found.'],
  },
  achievements: [
    ['ten', 'Apprentice', 'Discover 10 new elements.', 10, '⚗️', 10],
    ['fifty', 'Alchemist', 'Discover 50 new elements.', 50, '🧪', 30],
    ['hundred', 'Grand Alchemist', 'Discover 100 new elements.', 100, '🔮', 40],
    ['myth', 'Legend Maker', 'Create a dragon or a unicorn.', 1, '🐉', 20],
    ['space', 'Lift Off', 'Create an astronaut.', 1, '🧑‍🚀', 20],
    ['all', 'Philosopher’s Stone', 'Discover every element.', 1, '🏆', 80],
  ],
  load: () => import('./AlchemyLabGame'),
});
