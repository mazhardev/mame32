import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'chess',
  title: 'Chess',
  category: 'board',
  difficulty: 'hard',
  icon: '♛',
  tags: ['classic', 'strategy', 'ai', 'two player', 'checkmate', 'featured'],
  short: 'Full chess against a local computer opponent or a friend.',
  full: 'Complete chess with every rule — castling, en passant, promotion, check, checkmate, stalemate, threefold repetition and the fifty-move rule. Play White or Black against a computer opponent that thinks right in your browser, or pass and play with a friend. Unfinished games are saved automatically.',
  minutes: 20,
  multiplayer: 'vs-ai',
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to a piece and press Enter, then Tab to a highlighted square and press Enter'],
    mouse: ['Click a piece, then click one of the marked squares'],
    touch: ['Tap a piece, then tap one of the marked squares'],
  },
  instructions: {
    objective: 'Checkmate the opposing king: attack it so that it has no way to escape.',
    howToPlay: [
      'White moves first. Select a piece to see its legal moves, then pick a square.',
      'Castle by moving the king two squares towards a rook.',
      'A pawn reaching the last rank is promoted — choose a queen, rook, bishop or knight.',
      'Undo takes back your last move (and the computer’s reply). Resign ends the game.',
      'Games against the computer are saved automatically; Restart starts a fresh one.',
    ],
    scoring: 'A win scores 300 (Easy), 600 (Normal) or 1,000 (Hard), plus 5 for every move under 60. A draw scores a quarter of the win value.',
    difficultyNotes: 'Easy: the computer looks about two moves ahead and plays loosely. Normal: three moves. Hard: searches as deep as it can in about two seconds.',
    tips: ['Develop knights and bishops early and castle to keep your king safe.', 'Check every capture before you move — is the piece defended?', 'In the endgame, bring your king into play.'],
  },
  achievements: [
    ['win', 'Checkmate!', 'Beat the computer.', 1, '♛', 15],
    ['normal', 'Club Player', 'Beat the computer on Normal or Hard.', 1, '♜', 25],
    ['hard', 'Grandmaster', 'Beat the computer on Hard.', 1, '🏆', 50],
    ['quick', 'Blitz', 'Beat the computer within 25 moves.', 1, '⚡', 20],
    ['promote', 'New Queen', 'Promote a pawn against the computer.', 1, '👑', 10],
  ],
  load: () => import('./ChessGame'),
});
