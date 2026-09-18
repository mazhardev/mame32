import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tile-word-builder',
  title: 'Tile Word Builder',
  category: 'word',
  difficulty: 'medium',
  icon: '🀄',
  tags: ['letter tiles', 'rack', 'points', 'strategy'],
  short: 'Score big words from a rack of seven letter tiles over eight turns.',
  full: 'A tile-scoring word game. Each turn, spell a word from your seven letter tiles. Rare letters are worth more, longer words get multipliers and using all seven tiles earns a bonus. Reach the target score in eight turns.',
  minutes: 6,
  controls: {
    keyboard: ['Type letters to pick tiles', 'Enter to play, Backspace to undo a tile'],
    mouse: ['Click tiles to build a word, then Play word'],
    touch: ['Tap tiles to build a word, then Play word'],
  },
  instructions: {
    objective: 'Reach the target score within eight turns.',
    howToPlay: [
      'Tap tiles (or type) to spell a word of three or more letters.',
      'Press Play word. Used tiles are replaced from the bag.',
      'Swap tiles trades your whole rack for new tiles, but uses your turn.',
      'After each turn you see the best word you could have played.',
    ],
    scoring:
      'Add up the tile values. Words of 5–6 letters score ×1.5 and 7 letters ×2, with +50 for using all seven tiles.',
    difficultyNotes: 'Easy: target 120. Normal: target 170. Hard: target 230.',
    tips: [
      'Save S and E to extend words.',
      'A rare letter in a long word is worth more than two short words.',
    ],
  },
  achievements: [
    ['score', 'Tile Collector', 'Score 200 points in one game.', 200, '🀄', 15],
    ['big-word', 'Big Play', 'Score 40 points with a single word.', 40, '💥', 15],
    ['target', 'Target Hit', 'Reach the target score.', 1, '🎯', 10],
  ],
  load: () => import('./TileWordBuilderGame'),
});
