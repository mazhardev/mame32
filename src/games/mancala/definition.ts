import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'mancala',
  title: 'Mancala',
  category: 'board',
  difficulty: 'easy',
  icon: '🥜',
  tags: ['kalah', 'seeds', 'sowing', 'classic', 'ai', 'two player', 'strategy'],
  short: 'Sow seeds around the board and fill your store with the most.',
  full: 'An ancient count-and-capture game played with pits and seeds (Kalah rules). Pick up all the seeds from one of your pits and sow them one by one around the board. Land in your store to go again, or land in an empty pit on your side to capture the seeds opposite.',
  minutes: 8,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to one of your pits and press Enter'],
    mouse: ['Click one of your highlighted pits'],
    touch: ['Tap one of your highlighted pits'],
  },
  instructions: {
    objective: 'Finish with more seeds in your store (the long pit on the right) than your opponent.',
    howToPlay: [
      'Each player owns the six pits nearest them and the store to their right.',
      'Pick a non-empty pit: its seeds are sown one per pit counter-clockwise, including your store but skipping your opponent’s.',
      'If your last seed lands in your store, you move again.',
      'If your last seed lands in an empty pit on your side, you capture it and every seed in the pit directly opposite.',
      'When either side runs out of seeds, each player banks what remains on their side and the game ends.',
    ],
    scoring: 'Winning against the computer scores 20 points per seed in your store.',
    difficultyNotes: 'Easy: the computer looks two moves ahead and sometimes blunders. Normal: six moves. Hard: up to eleven.',
    tips: [
      'From the opening, the third pit lands exactly in your store.',
      'Count the seeds in a pit to see where it will land.',
      'Watch your empty pits — they are capture opportunities.',
    ],
  },
  achievements: [
    ['win', 'Seed Sower', 'Beat the computer.', 1, '🥜', 10],
    ['hard', 'Mancala Master', 'Beat the computer on Hard.', 1, '🏆', 30],
    ['capture', 'Big Harvest', 'Capture 8 or more seeds in one move against the computer.', 1, '🧺', 15],
  ],
  load: () => import('./MancalaGame'),
});
