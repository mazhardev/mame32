import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'endless-runner',
  title: 'Endless Runner',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🏃',
  tags: ['runner', 'jump', 'rooftops', 'coins', 'endless', 'featured'],
  short: 'Free-run across the city rooftops at dusk — double-jump the gaps and dodge the spikes.',
  full: 'Sprint across an endless sunset skyline. Your runner never stops: jump between rooftops of different heights, double-jump the wide gaps, hop over spikes and scoop up coins. The run gets faster the further you go.',
  minutes: 3,
  controls: {
    keyboard: ['Space or ↑ to jump; press again in the air to double-jump'],
    mouse: ['Click to jump'],
    touch: ['Tap the game or the Jump button'],
  },
  instructions: {
    objective: 'Run as far as possible and collect coins without falling or touching spikes.',
    howToPlay: [
      'You run automatically. Jump to cross gaps between rooftops.',
      'You can jump once more in mid-air — save it for wide gaps.',
      'Landing on a rooftop resets your jumps.',
      'Spikes on the rooftops and falling off end the run.',
    ],
    scoring: '1 point per 20 units run and 10 points per coin.',
    difficultyNotes: 'Easy: slower and shorter gaps. Hard: faster with wider gaps.',
    tips: ['Don’t waste the double jump: wait until the first jump peaks.', 'Coin arcs show a safe path.'],
    touchNotes: ['Tap anywhere on the game to jump.'],
  },
  achievements: [
    ['distance', 'Rooftop Runner', 'Run 1,000 m in one go.', 1000, '🏃', 20],
    ['coins', 'Pocket Change', 'Collect 50 coins in one run.', 50, '🪙', 20],
    ['score', 'Skyline Legend', 'Score 2,000 points in one run.', 2000, '🏆', 40],
    ['total-coins', 'Savings Account', 'Collect 1,000 coins in total.', 1000, '💰', 30],
  ],
  load: () => import('./EndlessRunnerGame'),
});
