import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'resource-manager',
  title: 'Resource Manager',
  category: 'strategy',
  difficulty: 'medium',
  icon: '📦',
  tags: ['colony', 'space', 'resources', 'planning', 'survival', 'save'],
  short: 'Run a colony on a dusty planet: balance food, water, power and metal to grow it.',
  full: 'Six colonists have landed on a dusty red planet. Each day you decide who farms, who pumps water, who mines and who builds. Solar arrays power everything — until a dust storm rolls in. Greenhouses turn water into food, extractors pull water from the ground, mines dig the metal you need for new modules, and each new habitat brings more colonists on the next shuttle. Watch the daily forecast, keep stores from running dry, repair meteor damage, and grow the colony to its target before the supply contract ends.',
  minutes: 15,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab between buttons; Enter or Space to press'],
    mouse: ['Use − and + to assign jobs, click a module to build it'],
    touch: ['Tap − and + to assign jobs, tap a module to build it'],
  },
  instructions: {
    objective: 'Reach the colonist target before the last day.',
    howToPlay: [
      'Every colonist eats 1 food and drinks 1 water a day; farmers drink an extra 1 water.',
      'Assign colonists to jobs. The coloured numbers show tomorrow’s change in each supply.',
      'Working modules need power. If solar arrays cannot keep up, everything slows down.',
      'Choose a module to build; engineers put work into it each day. Meteors break modules — engineers repair them first.',
      'Every 4 days a shuttle brings up to 3 colonists, if there is room in the habitats and the colony is healthy.',
      'If food or water runs out, the colony’s health drops; at zero a colonist is lost.',
    ],
    scoring:
      '40 points per colonist, plus 500 for reaching the target and 20 for each day to spare; −50 for every colonist lost.',
    difficultyNotes:
      'Easy: target 18 colonists, rare storms and meteors. Normal: target 22. Hard: target 26 with frequent storms and meteor strikes.',
    tips: [
      'Build a solar array before every second production module.',
      'Storms are forecast a day ahead — stock up on water and food.',
      'Habitats are the key to growth: keep one ahead of the shuttle.',
      'Storage lets you ride out storms and bad days.',
    ],
    touchNotes: ['All buttons are large; the forecast updates as you change jobs.'],
  },
  achievements: [
    ['modules', 'Builder Bots', 'Build 20 modules in total.', 20, '🏗️', 20],
    ['repair', 'Patch Job', 'Repair a meteor-damaged module.', 1, '🔧', 10],
    ['storm', 'Weather the Storm', 'Get through a dust storm without losing anyone.', 1, '🌪️', 15],
    ['colonists', 'Growing Colony', 'Have 15 colonists at once.', 15, '👩‍🚀', 15],
    ['goal', 'Colony Established', 'Reach the colonist target.', 1, '🚀', 30],
    ['nobody', 'Nobody Left Behind', 'Reach the target without losing a colonist.', 1, '💚', 30],
    ['hard', 'Frontier Legend', 'Reach the target on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./ColonyGame'),
});
