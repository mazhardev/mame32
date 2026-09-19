import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'dominoes',
  title: 'Dominoes',
  category: 'board',
  difficulty: 'easy',
  icon: '🁫',
  tags: ['tiles', 'matching', 'draw game', 'classic', 'ai', 'double six'],
  short: 'Match the ends of the line and be first to play all your tiles.',
  full: 'Classic draw dominoes with a double-six set against a computer opponent. Match a number on one of your tiles to an open end of the line. Can’t match? Draw from the boneyard. Empty your hand first to score your opponent’s pips — first to 50 points wins the match.',
  minutes: 10,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a highlighted tile and press Enter; choose Left or Right end if asked'],
    mouse: ['Click a highlighted tile'],
    touch: ['Tap a highlighted tile'],
  },
  instructions: {
    objective: 'Reach 50 points first by emptying your hand before the computer.',
    howToPlay: [
      'Each player gets seven tiles. The player with the highest double leads.',
      'On your turn, play a tile whose number matches either open end of the line.',
      'If you can’t match, draw from the boneyard until you can. If it is empty, pass.',
      'The round ends when a player plays their last tile, or when neither player can move (blocked).',
    ],
    scoring: 'The round winner scores the pips left in the loser’s hand; in a blocked game, the lower hand scores the difference. Winning the match scores 10 per match point.',
    difficultyNotes: 'Easy: the computer plays any legal tile. Normal: it sheds its heaviest tiles first. Hard: it also keeps a varied hand and plays numbers you have shown you lack.',
    tips: ['Get rid of heavy tiles early in case the game blocks.', 'Keep a mix of numbers so you can always match.', 'If the computer draws, remember which numbers it couldn’t match.'],
  },
  achievements: [
    ['win', 'Bones Boss', 'Win a match against the computer.', 1, '🁫', 10],
    ['hard', 'Domino Master', 'Win a match on Hard.', 1, '🏆', 30],
    ['domino', 'Domino!', 'Win a round by playing your last tile.', 1, '✋', 5],
    ['shutout', 'Shutout', 'Win a match without the computer scoring.', 1, '🧱', 25],
  ],
  load: () => import('./DominoesGame'),
});
