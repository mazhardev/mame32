import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tile-solitaire',
  title: 'Tile Solitaire',
  category: 'board',
  difficulty: 'medium',
  icon: '🀄',
  tags: ['tiles', 'matching', 'pairs', 'relaxing', 'single player', 'mahjong style'],
  short: 'Clear a stacked layout of picture tiles by matching free pairs.',
  full: 'A relaxing tile-matching solitaire. Picture tiles are stacked in layers; remove them two at a time by matching identical tiles that are free — nothing on top and an open left or right side. Every deal is generated to be solvable, and Undo, Hint and Shuffle are there when you get stuck.',
  minutes: 10,
  multiplayer: 'single',
  hasLevels: true,
  controls: {
    keyboard: ['Tab to a tile and press Enter to select it, then select its twin'],
    mouse: ['Click two matching free tiles'],
    touch: ['Tap two matching free tiles'],
  },
  instructions: {
    objective: 'Remove every tile from the board in matching pairs.',
    howToPlay: [
      'A tile is free if no tile sits on top of it and its left or right side is open. Free tiles look brighter.',
      'Select two free tiles with the same picture to remove them.',
      'Undo takes back a pair, Hint shows a free pair, and Shuffle re-deals the remaining pictures.',
      'Choose Finish to end the game early and keep your points.',
    ],
    scoring: '10 points per pair, plus a clear bonus (500 / 1,000 / 1,500) and up to 600 for speed. Hints cost 20 and shuffles 50.',
    difficultyNotes: 'Easy: Pyramid (34 tiles). Normal: Fortress (84 tiles). Hard: Tower (108 tiles).',
    tips: ['Work on the tallest stacks first — they hide the most tiles.', 'When three identical tiles are free, think about which pair to take.', 'Clear the long rows from their ends.'],
  },
  achievements: [
    ['clear', 'Clean Table', 'Clear any layout.', 1, '🀄', 10],
    ['pure', 'Unaided', 'Clear a layout without hints or shuffles.', 1, '🧘', 20],
    ['tower', 'Tower Toppler', 'Clear the Tower layout.', 1, '🏯', 30],
  ],
  load: () => import('./TileSolitaireGame'),
});
