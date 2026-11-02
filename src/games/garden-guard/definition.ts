import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'garden-guard',
  title: 'Garden Guard',
  category: 'strategy',
  difficulty: 'medium',
  icon: '🌻',
  tags: ['lane defense', 'tower defense', 'plants', 'garden', 'strategy', 'levels', 'pests'],
  short: 'Plant a garden of defenders to stop snails, beetles and toads marching on your house — 15 levels.',
  full: 'Garden pests are coming, row by row, and only your plants stand in their way. Grow Sunblooms for sunlight, then spend it on defenders: Seed Spitters that pelt pests in their row, Stone Shells that hold the line, Pop Berries that burst, Root Mines, Frost Ferns that slow pests down and Twin Spitters. Snails, armoured beetles, leaping hoppers and the Big Toad grow bolder over 15 levels in the Front Lawn, the Orchard and the Moonlit Garden. Every row has one garden roller to save you, but only once.',
  minutes: 6,
  hasLevels: true,
  controls: {
    mouse: ['Click a seed card, then a square of lawn to plant', 'Click sunlight to collect it', 'Pick the shovel to dig a plant up'],
    keyboard: ['1–7 pick a seed card, 8 or Q the shovel', 'Arrow keys move the lawn cursor', 'Space or Enter plants at the cursor', 'C collects all the sunlight'],
    touch: ['Tap a seed card, then a square of lawn', 'Tap sunlight to collect it'],
  },
  instructions: {
    objective: 'Survive every wave of pests without letting one into the house.',
    howToPlay: [
      'Sunlight falls from the sky and Sunblooms make more. Tap it to collect it, then spend it on plants. Each card shows its cost.',
      'Pick a card, then a square of lawn. After planting, a card needs a little time to recharge.',
      'Pests walk in from the right along their row and eat any plant in their way. Shooters only hit pests in their own row.',
      'Each row has a garden roller. The first pest to reach it sets it off, flattening the whole row, but it only works once.',
      'A pest that gets past a used roller reaches the house and the level is lost. Try again, or pick another unlocked level from the list.',
      'Win levels to unlock new defenders: Stone Shell, Pop Berry, Root Mine, Frost Fern and Twin Spitter.',
    ],
    scoring: '10 points per pest (more for tougher ones), plus a bonus for every unused roller and leftover sunlight when you win.',
    difficultyNotes: 'Easy: more sunlight to start, sunlight collects itself, and pests are weaker. Normal: the standard garden. Hard: tougher pests.',
    tips: [
      'Start every level with Sunblooms. A strong economy wins long games.',
      'Watch which rows the first pests take and defend those first, but give every row a shooter before the big waves.',
      'Put Stone Shells in front of your shooters to hold up beetles and toads.',
      'Hoppers vault the first plant they reach: a cheap plant up front takes the jump for your shooters.',
      'Night levels have far less sunlight, so plant Sunblooms even sooner.',
    ],
    touchNotes: ['Tap a seed card to pick it (tap again to put it back), then tap a lawn square to plant. Tap the floating sunlight to collect it.'],
  },
  achievements: [
    ['first', 'Green Thumb', 'Win your first level.', 1, '🌱', 10],
    ['clean', 'Rollers Stay Home', 'Win a level without using a garden roller.', 1, '🚜', 20],
    ['pop', 'Berry Big Bang', 'Stop 4 pests with one Pop Berry or Root Mine.', 4, '🍒', 25],
    ['night', 'Night Gardener', 'Win a level in the Moonlit Garden.', 1, '🌙', 30],
    ['sun', 'Sun Catcher', 'Collect 25,000 sunlight in total.', 25000, '☀️', 30],
    ['all', 'Master Gardener', 'Win all 15 levels.', 1, '🏆', 80],
  ],
  load: () => import('./GardenGuardGame'),
});
