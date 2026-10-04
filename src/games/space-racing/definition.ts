import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'space-racing',
  title: 'Space Racing',
  category: 'racing',
  difficulty: 'hard',
  icon: '🚀',
  tags: ['tunnel', 'speed', 'endless', 'reflex', 'racing'],
  short: 'Rocket down an endless space tunnel — rotate to slip through the gaps at blistering speed.',
  full: 'A high-speed tunnel racer with a 3D look. Your ship rides the inside wall of a neon tunnel and you rotate around it. Walls rush towards you with a gap somewhere in them: line up with the gap before the wall arrives. Speed keeps climbing, gaps get smaller, and blue boost rings make you even faster for a moment — great for points, terrible for reaction time.',
  minutes: 2,
  controls: {
    keyboard: ['← → rotate around the tunnel'],
    mouse: ['Hold the left or right half of the play area to rotate'],
    touch: ['Hold the left or right half of the screen, or use the arrows'],
  },
  instructions: {
    objective: 'Fly through as many walls as you can.',
    howToPlay: [
      'Your ship always appears at the bottom; rotating turns the whole tunnel around you.',
      'Each wall has one gap. Be in the gap when the wall reaches you.',
      'Blue rings give a short speed boost and bonus points.',
      'Touching a wall ends the run.',
    ],
    scoring: 'Points for every wall passed (more at higher speed) and 50 per boost ring.',
    difficultyNotes: 'Higher difficulty starts faster with smaller gaps. Gaps shrink as you go on every level.',
    tips: ['Look at the far walls, not the nearest one: start rotating early.', 'Skip a boost ring if the next gap is on the other side.'],
    touchNotes: ['Rest a thumb on each side of the screen.'],
  },
  achievements: [
    ['walls-50', 'Hyperspace', 'Pass 50 walls in one run.', 50, '🚀', 20],
    ['walls-150', 'Light Speed', 'Pass 150 walls in one run.', 150, '🏆', 35],
    ['boosts-10', 'Boost Junkie', 'Collect 10 boost rings in one run.', 10, '💫', 20],
    ['total', 'Tunnel Vision', 'Pass 3,000 walls in total.', 3000, '🎖️', 30],
  ],
  load: () => import('./SpaceRacingGame'),
});
