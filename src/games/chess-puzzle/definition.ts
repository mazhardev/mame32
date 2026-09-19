import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'chess-puzzle',
  title: 'Chess Puzzle',
  category: 'puzzle',
  difficulty: 'hard',
  icon: '♟️',
  tags: ['chess', 'checkmate', 'mate in one', 'mate in two', 'tactics', 'brain'],
  short: 'Find the checkmate: mate-in-one and mate-in-two chess puzzles.',
  full: 'A collection of original checkmate puzzles, each checked by a computer solver to have exactly one winning key move. Find mate in one on Easy, mate in two on Normal, and tricky quiet mates in two — where the key move is not even a check — on Hard. Your progress is saved.',
  minutes: 5,
  multiplayer: 'single',
  hasLevels: true,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to a piece and press Enter, then Tab to a marked square and press Enter'],
    mouse: ['Click a piece, then click a marked square'],
    touch: ['Tap a piece, then tap a marked square'],
  },
  instructions: {
    objective: 'Checkmate the opposing king in the number of moves shown.',
    howToPlay: [
      'The side to move is shown at the bottom of the board.',
      'In mate-in-two puzzles, play the key move; the computer then chooses its toughest defence and you deliver mate.',
      'A wrong move is taken back so you can try again.',
      'Hint highlights the piece to move, then the full key move.',
      'Use Next and Previous to move through the collection. Solved puzzles are remembered.',
    ],
    scoring: '100 points for a first-try solve (200 on Normal and Hard), 50 (or 100) with mistakes or hints, minus 10 per mistake.',
    difficultyNotes: 'Easy: mate in one. Normal: mate in two, starting with a check. Hard: mate in two where the key move is a quiet, non-checking move.',
    tips: ['Look at every check first — then every capture.', 'Count the king’s escape squares and ask how to take them away.', 'In quiet mates, the key move usually cuts off the king’s last flight square.'],
  },
  achievements: [
    ['first', 'Mate Spotted', 'Solve your first puzzle.', 1, '♟️', 5],
    ['two', 'Two-Mover', 'Solve a mate-in-two puzzle.', 1, '✌️', 15],
    ['ten', 'Puzzle Hunter', 'Solve 10 different puzzles.', 10, '🧩', 20],
    ['streak', 'Clear Sight', 'Solve 5 puzzles in a row with no mistakes or hints.', 5, '👁️', 25],
  ],
  load: () => import('./ChessPuzzleGame'),
});
