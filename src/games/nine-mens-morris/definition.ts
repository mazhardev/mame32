import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'nine-mens-morris',
  title: "Nine Men's Morris",
  category: 'board',
  difficulty: 'medium',
  icon: '⭕',
  tags: ['strategy', 'ai', 'classic', 'two player', 'mills'],
  short: 'Form mills of three to capture your opponent’s men in this ancient strategy game.',
  full: "One of the oldest board games still played. Each player has nine men. Take turns placing them on the board's 24 points, then slide them along the lines. Every time you line up three in a row — a mill — you remove one of your opponent's men. Reduce your opponent to two men, or leave them with no legal move, to win. Play against the computer or a friend on the same device.",
  minutes: 10,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab between points, Enter or Space to select'],
    mouse: ['Click a point to place; click a man then a point to move'],
    touch: ['Tap a point to place; tap a man then a point to move'],
  },
  instructions: {
    objective: 'Capture your opponent’s men until they have only two left, or block them so they cannot move.',
    howToPlay: [
      'Placing: take turns putting one man on any empty point until both players have placed all nine.',
      'Moving: slide one of your men along a line to an adjacent empty point.',
      'Three of your men in a straight line form a mill. Each new mill lets you remove one opponent man.',
      'You cannot remove a man that is in a mill unless all of that player’s men are in mills.',
      'When you are down to three men you may fly: move to any empty point.',
      'A player with two men, or no legal move, loses. Fifty moves without a capture is a draw.',
    ],
    scoring: 'A win scores 100 points plus 20 for each of your men still in play.',
    difficultyNotes: 'Easy: the computer looks one move ahead and sometimes plays randomly. Normal: three moves. Hard: five moves.',
    tips: [
      'In the placing phase, spread out and keep your men mobile.',
      'A “running mill” — a man that can step in and out of a mill each turn — captures every other move.',
      'Block your opponent’s two-in-a-rows before they become mills.',
    ],
    touchNotes: ['Tap a man to select it; tap it again or press Cancel selection to change your mind.'],
  },
  achievements: [
    ['mill', 'First Mill', 'Capture a man against the computer.', 1, '⭕', 10],
    ['win', 'Morris Winner', 'Beat the computer.', 1, '🏆', 20],
    ['flawless', 'Untouched', 'Beat the computer without losing a man.', 1, '💎', 30],
    ['hard', 'Master of Mills', 'Beat the computer on Hard.', 1, '👑', 30],
    ['wins', 'Village Champion', 'Beat the computer 10 times.', 10, '🎖️', 30],
  ],
  hasSaveState: false,
  load: () => import('./NineMensMorrisGame'),
});
