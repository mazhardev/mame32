import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'ludo',
  title: 'Ludo',
  category: 'board',
  difficulty: 'easy',
  icon: '🎲',
  tags: ['dice', 'family', 'race', 'two player', 'four player', 'ai', 'classic'],
  short: 'Roll the die, race your four tokens around the board and capture rivals.',
  full: 'The classic family race game for 2–4 players. Roll a six to bring tokens out, race them around the cross-shaped board and up your home column. Land on an opponent to send them back to their yard. Play against computer opponents or pass and play on one device.',
  minutes: 15,
  multiplayer: 'local-multiplayer',
  controls: {
    keyboard: ['Tab to Roll and press Enter; then Tab to a highlighted token and press Enter'],
    mouse: ['Click Roll, then click a highlighted token'],
    touch: ['Tap Roll, then tap a highlighted token'],
  },
  instructions: {
    objective: 'Be the first to bring all four of your tokens into the centre.',
    howToPlay: [
      'You are red. Roll a six to move a token out of your yard onto your start square.',
      'Tokens travel clockwise once around the board, then up your coloured home column to the centre. You need the exact roll to finish.',
      'Landing on an opponent’s token sends it back to its yard — except on start squares and ★ stars, which are safe.',
      'Rolling a six, capturing a token or bringing one home gives you another roll. Three sixes in a row lose the turn.',
      'When only one move is possible, it is played for you.',
    ],
    scoring: 'Winning scores 500 per opponent plus 50 per capture you made.',
    difficultyNotes: 'Easy: computer players move a random token. Normal: they prefer captures, leaving the yard and reaching home. Hard: they also dodge danger and hunt for safe squares.',
    tips: ['Get several tokens out early so you have choices.', 'Tokens on stars cannot be captured.', 'A token just ahead of an opponent is in danger — move it or protect it.'],
  },
  achievements: [
    ['win', 'Home Run', 'Beat the computer players.', 1, '🎲', 10],
    ['four', 'Full Table', 'Win a four-player game against the computer.', 1, '👥', 20],
    ['hard', 'Ludo Legend', 'Win on Hard.', 1, '🏆', 30],
    ['capture', 'Send Them Home', 'Capture 3 tokens in a single game.', 3, '💥', 15],
  ],
  load: () => import('./LudoGame'),
});
