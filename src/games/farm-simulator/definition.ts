import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'farm-simulator',
  title: 'Farm Simulator',
  category: 'strategy',
  difficulty: 'easy',
  icon: '🚜',
  tags: ['farming', 'crops', 'seasons', 'economy', 'save', 'relaxing'],
  short: 'Plant, water and harvest through spring, summer and autumn to earn your farm’s target.',
  full: 'Run a small farm for one year of three ten-day seasons. Each day you have a limited amount of energy for planting, watering and harvesting; crops only grow overnight if they were watered or it rained. Radishes and lettuce in spring, tomatoes and corn in summer, pumpkins and grapes in autumn — but anything still growing when its season ends will wither. Buy sprinklers, expand your fields and sell when prices are good.',
  minutes: 15,
  hasSaveState: true,
  controls: {
    keyboard: [
      'Arrow keys move between plots; Enter acts on a plot',
      '1–8 choose a seed',
      'N sleeps',
    ],
    mouse: ['Click a plot to plant, water, harvest or clear it'],
    touch: ['Tap a plot to plant, water, harvest or clear it'],
  },
  instructions: {
    objective: 'Have the target number of coins at the end of day 30.',
    howToPlay: [
      'Tap empty soil to plant the selected seed. Tap a growing crop to water it. Tap a ripe crop to harvest and sell it.',
      'Every action uses one energy. Sleep to start the next day with full energy.',
      'A crop that goes two nights without water withers. Rain waters everything.',
      'Each crop grows only in certain seasons; seeds marked “too late” will not ripen in time.',
      'Sprinklers water the eight plots around them every morning, saving lots of energy.',
    ],
    scoring: 'Your score is the coins you have at the end of the year.',
    difficultyNotes:
      'Easy: 40 energy a day, plenty of rain, goal 3,000. Normal: 32 energy, goal 2,800. Hard: 28 energy, little rain, goal 2,500.',
    tips: [
      'Fast crops early give you money for better seeds later.',
      'Place sprinklers in the middle of a 3×3 patch.',
    ],
    touchNotes: ['The farm grid stays square and large enough to tap on a phone.'],
  },
  achievements: [
    ['first', 'First Harvest', 'Harvest a crop.', 1, '🧺', 10],
    ['sprinkler', 'Irrigation', 'Place a sprinkler.', 1, '⛲', 15],
    ['pumpkin', 'Pumpkin Patch', 'Harvest a pumpkin.', 1, '🎃', 20],
    ['goal', 'Prize Farmer', 'Reach the year’s goal.', 1, '🏅', 25],
    ['harvests', 'Green Thumb', 'Harvest 300 crops in total.', 300, '🌿', 30],
    ['hard', 'Master Farmer', 'Reach the goal on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./FarmGame'),
});
