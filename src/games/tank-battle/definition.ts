import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tank-battle',
  title: 'Tank Battle',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🛡️',
  tags: ['tanks', 'shooter', 'two-player', 'duel', 'ricochet', 'ai'],
  short: 'Top-down tank duels with ricochet shells — against the computer or a friend.',
  full: 'Two tanks face off across a walled arena. Blast through brick walls, bank shells off steel and the arena edge, and land the first hit to win the round. First to five rounds takes the match. Each round moves to a new arena, and every arena is perfectly balanced for both sides. Play against a local computer tank, or grab a friend and share the keyboard.',
  minutes: 5,
  multiplayer: 'local-multiplayer',
  controls: {
    keyboard: ['vs Computer: ↑/↓ or W/S drive, ←/→ or A/D turn, Space fires', 'Two players — Green: W/S/A/D and Space or Q; Blue: arrow keys and Enter or /'],
    touch: ['Pad drives and turns the tank, Fire shoots (vs Computer)'],
  },
  instructions: {
    objective: 'Hit the other tank before it hits you. First to five rounds wins.',
    howToPlay: [
      'Up and down drive forwards and backwards; left and right turn the tank.',
      'Each tank can have two shells in the air at once.',
      'Shells destroy brick walls and ricochet once off steel or the arena edge.',
      'Careful — a ricochet can hit your own tank, which gives the round to your opponent.',
      'Every round is played on the next arena.',
    ],
    scoring: 'vs Computer: 100 points per round won, plus 500 and 100 for every round the computer fell short when you win the match.',
    difficultyNotes: 'Harder computer tanks drive and turn faster, aim more accurately, react sooner, reload quicker and — on Hard — dodge your shells.',
    tips: ['Use steel walls for bank shots around corners.', 'Break the computer’s line of sight to make it come to you.', 'Back away while turning to keep your gun on target.'],
    touchNotes: ['Two-player mode needs a keyboard; on touch screens play against the computer.'],
  },
  achievements: [
    ['win', 'Tank Commander', 'Win a match against the computer.', 1, '🛡️', 20],
    ['hard', 'Iron Commander', 'Win a match against the Hard computer.', 1, '🏅', 40],
    ['flawless', 'Untouchable', 'Win a match 5–0 against the computer.', 1, '✨', 35],
    ['bank', 'Bank Shot', 'Destroy the computer tank with a ricochet.', 1, '🎱', 25],
    ['rounds', 'Veteran', 'Win 50 rounds against the computer.', 50, '🎖️', 30],
    ['duel', 'Friendly Fire', 'Finish a two-player match.', 1, '🤝', 10],
  ],
  load: () => import('./TankBattleGame'),
});
