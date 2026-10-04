import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'boxing',
  title: 'Boxing',
  category: 'sports',
  difficulty: 'medium',
  icon: '🥊',
  tags: ['timing', 'reflex', 'ai', 'fighting', 'sports', 'counter'],
  short: 'Slip, block and counter a computer boxer over three cartoon rounds.',
  full: 'A cartoon boxing bout seen from your corner. Your opponent telegraphs every punch — the glowing glove shows a jab, a hook from either side or an uppercut — so slip the right way or cover up, then punish the opening with jabs and hooks. Land four in a row and your opponent is dazed. Three knockdowns end it; otherwise the judges score the rounds.',
  minutes: 4,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: [
      '← → slip left or right',
      '↓ hold to block',
      'Space jab, X hook',
      'When knocked down, mash Space',
    ],
    mouse: ['Click the upper left to jab, upper right to hook; click the lower corners to slip'],
    touch: [
      'Tap upper left to jab, upper right to hook, lower corners to slip; or use the buttons',
    ],
  },
  instructions: {
    objective: 'Knock your opponent down three times, or win more rounds on the judges’ cards.',
    howToPlay: [
      'A glowing glove means a punch is coming. Straight jab: slip either way or block.',
      'A hook from your left: slip right. A hook from your right: slip left. Blocking also works but costs stamina.',
      'An uppercut (low glove) cannot be blocked — slip it.',
      'Your opponent is open just after punching. Punching during the wind-up is a counter that does extra damage.',
      'Punches tire you; the blue bar must refill before you can throw more.',
    ],
    scoring:
      'Points for damage dealt, 150 per knockdown, and a bonus for winning (more for a knockout).',
    difficultyNotes:
      'Harder opponents wind up faster, recover quicker, block more of your punches, sometimes feint, and take more button presses to get up from.',
    tips: [
      'Slip, then throw two jabs and a hook while they recover.',
      'Block only when you cannot read the punch.',
    ],
    touchNotes: ['The on-screen pad slips (← →) and blocks (↓).'],
  },
  achievements: [
    ['knockdown', 'Down Goes the Opponent', 'Score a knockdown.', 1, '🥊', 15],
    ['win', 'Winner', 'Win a bout.', 1, '🏆', 20],
    ['ko', 'Knockout Artist', 'Win by knockout.', 1, '💫', 30],
    ['combo', 'Combination', 'Land a 6-punch combo.', 6, '⚡', 25],
    ['counters', 'Counter Puncher', 'Land 30 counter punches in total.', 30, '🎯', 25],
    ['hard', 'Undisputed', 'Win on Hard.', 1, '👑', 40],
  ],
  load: () => import('./BoxingGame'),
});
