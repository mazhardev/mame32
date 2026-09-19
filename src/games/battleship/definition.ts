import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'battleship',
  title: 'Sea Battle',
  category: 'board',
  difficulty: 'medium',
  icon: '🚢',
  tags: ['naval', 'ships', 'grid', 'guessing', 'deduction', 'ai', 'classic'],
  short: 'Hunt down the hidden enemy fleet before it finds yours.',
  full: 'A classic naval guessing game. Both sides hide five ships on a 10×10 grid, then take turns firing at coordinates. Hits are marked, and a ship sinks once every square of it has been hit. Sink the whole enemy fleet before the computer admiral sinks yours.',
  minutes: 8,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a cell in Enemy waters and press Enter to fire'],
    mouse: ['Click a cell in Enemy waters to fire'],
    touch: ['Tap a cell in Enemy waters to fire'],
  },
  instructions: {
    objective: 'Sink all five enemy ships before the computer sinks yours.',
    howToPlay: [
      'Shuffle your fleet until you like its layout, then press Start battle.',
      'Take turns firing one shot at a time at the enemy grid.',
      'White dots are misses and orange crosses are hits. A ship turns dark red when it sinks.',
      'The fleet: Flagship (5), Cruiser (4), Frigate (3), Submarine (3) and Patrol boat (2).',
    ],
    scoring: 'Winning scores 1,500 minus 12 per shot fired (minimum 100). Losing scores 10 per enemy ship square you hit.',
    difficultyNotes: 'Easy: the computer fires mostly at random. Normal: it hunts on a checkerboard and chases hits. Hard: it calculates where ships are most likely to be.',
    tips: ['After a hit, try the four cells around it.', 'Ships can’t fit in small gaps between misses — skip them.', 'A checkerboard pattern finds every ship of size 2 or more.'],
  },
  achievements: [
    ['win', 'Admiral', 'Sink the enemy fleet.', 1, '🚢', 10],
    ['hard', 'Fleet Commander', 'Win on Hard.', 1, '🏆', 30],
    ['sharp', 'Sharpshooter', 'Win using 50 shots or fewer.', 1, '🎯', 20],
  ],
  load: () => import('./SeaBattleGame'),
});
