import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'mini-city-builder',
  title: 'Mini City Builder',
  category: 'strategy',
  difficulty: 'medium',
  icon: '🏙️',
  tags: ['city builder', 'simulation', 'economy', 'planning', 'save', 'zoning'],
  short:
    'Zone homes, shops and factories, keep the lights on and grow a town before time runs out.',
  full: 'Turn an empty valley into a thriving town, one month at a time. Lay roads, power everything, and balance homes against jobs: people only move in when there is work, and homes only grow into apartment blocks when the neighbourhood is pleasant — parks and shops nearby, factory smoke far away. Upgrade shops and factories as you grow, keep an eye on upkeep, and reach the population goal within four years. Progress saves automatically.',
  minutes: 20,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys move the cursor; Enter builds', '1–8 choose a tool', 'N ends the month'],
    mouse: ['Click a tool, then click the map'],
    touch: ['Tap a tool, then tap the map'],
  },
  instructions: {
    objective: 'Reach the population goal before the last month.',
    howToPlay: [
      'Every building needs a road next to it and must be within range of a power plant.',
      'Shops (10 jobs) and factories (25 jobs) create work. Each job supports about two residents.',
      'Homes fill up while there is work, and grow to level 2 and 3 when their happiness is high.',
      'Parks and shops nearby raise happiness; factories within two tiles lower it.',
      'Press Next month to collect taxes, pay upkeep and see who moves in.',
      'Use Upgrade on shops and factories to add jobs once you have money.',
    ],
    scoring:
      'Score = population, plus 25 for every month to spare and 1 per 10 coins left in the treasury.',
    difficultyNotes:
      'Easy: 1,600 starting coins, goal 600, fast growth. Normal: 1,200 coins, goal 800. Hard: 900 coins, goal 900 and slower growth.',
    tips: [
      'Keep factories at the edge of town, away from homes.',
      'Put a park in the middle of a block of homes.',
      'Watch for 🚧 (needs a road) and 🔌 (needs power) badges.',
      'Choose the Power tool to see the range of a plant before you place it.',
    ],
    touchNotes: ['The map scales to fit your screen; tap a tile to see what is wrong with it.'],
  },
  achievements: [
    ['first', 'Welcome Home', 'Get your first residents.', 1, '🏠', 5],
    ['tower', 'High Rise', 'Grow a home to level 3.', 1, '🏢', 15],
    ['upgrade', 'Big Business', 'Fully upgrade a shop or factory.', 1, '🏬', 15],
    ['town', 'Boom Town', 'Reach 500 residents.', 500, '👥', 20],
    ['goal', 'Mayor of the Year', 'Reach the population goal.', 1, '🏅', 30],
    ['hard', 'Master Planner', 'Reach the goal on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./CityGame'),
});
