import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'backgammon',
  title: 'Backgammon',
  category: 'board',
  difficulty: 'hard',
  icon: '🎯',
  tags: ['dice', 'race', 'classic', 'strategy', 'ai', 'checkers', 'tavla'],
  short: 'Race your fifteen checkers home and bear them off before the computer.',
  full: 'The ancient race game of dice and strategy. Move your checkers around the board according to the dice, hit your opponent’s lone checkers to send them back, build blocking points, and bear off all fifteen before the computer does. Gammons and backgammons count double and triple.',
  minutes: 12,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to Roll; Tab to a point with a green dot, press Enter, then Tab to a highlighted point and press Enter'],
    mouse: ['Click Roll, click a checker, then click a highlighted point or the tray to bear off'],
    touch: ['Tap Roll, tap a checker, then tap a highlighted point or the tray'],
  },
  instructions: {
    objective: 'Bear off all 15 of your light checkers before the computer bears off its dark ones.',
    howToPlay: [
      'You move light checkers anticlockwise, from point 24 towards point 1 and your home board (points 1–6, bottom right).',
      'Each die is a separate move. Doubles are played four times. You must use both dice if you can — and the larger one if only one can be used.',
      'You cannot land on a point holding two or more opposing checkers. Landing on a single one (a blot) hits it onto the bar.',
      'Checkers on the bar must re-enter in the opponent’s home board before anything else moves.',
      'Once all your checkers are in your home board, bear them off by clicking the tray on the right.',
      'Undo takes back the moves you have made this turn.',
    ],
    scoring: 'Win: 1 point; gammon (loser bore off none): 2; backgammon (and still has a checker in your home board or on the bar): 3. Your score is points × 300/500/800 by difficulty.',
    difficultyNotes: 'Easy: the computer often plays a random legal move. Normal: it races and makes points while avoiding blots. Hard: it counts how many shots each blot leaves before choosing.',
    tips: ['Making your 5-point early is strong.', 'Avoid leaving single checkers where the opponent can hit them with one die.', 'When you are far ahead in the race, stop fighting and run home.'],
  },
  achievements: [
    ['win', 'Borne Off', 'Beat the computer.', 1, '🎯', 15],
    ['hard', 'Backgammon Master', 'Beat the computer on Hard.', 1, '🏆', 40],
    ['gammon', 'Gammon!', 'Win a gammon or backgammon.', 1, '💥', 25],
    ['hits', 'Heavy Hitter', 'Hit 5 of the computer’s checkers in one game.', 5, '🥊', 15],
  ],
  load: () => import('./BackgammonGame'),
});
