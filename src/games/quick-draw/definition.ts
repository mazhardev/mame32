import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'quick-draw',
  title: 'Quick Draw',
  category: 'action',
  difficulty: 'easy',
  icon: '🤠',
  tags: ['reaction', 'duel', 'two player', 'ai', 'action'],
  short: 'A western reaction duel: wait for “DRAW!”, then fire first — but never too early.',
  full: 'High noon. Two cowboys face each other. “Steady…” — then, after a random pause, “DRAW!”. The first to fire wins the round, but firing before the signal is a foul that hands the round to your opponent. First to three wins. Duel the computer, whose reflexes sharpen every round, or challenge a friend on the same keyboard or screen.',
  minutes: 2,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Space or A fires (Player 1)', 'L fires (Player 2)', 'Enter starts the next round'],
    mouse: ['Click your side of the stage to fire'],
    touch: ['Tap your side of the stage to fire; two players can share one screen'],
  },
  instructions: {
    objective: 'Win three rounds before your opponent.',
    howToPlay: [
      'Press Ready. The screen says “Steady…”.',
      'After a random pause it turns red and says “DRAW!”.',
      'Fire as fast as you can. The quicker shot wins the round.',
      'Firing during “Steady…” is a foul: your opponent wins that round.',
    ],
    scoring: 'Winning a duel against the computer scores 100, plus 50 per round it failed to win, plus a bonus for your fastest draw.',
    difficultyNotes: 'The computer reacts in about 0.5 s on Easy, 0.4 s on Normal and 0.3 s on Hard, and gets faster each round.',
    tips: ['Watch the colour change rather than the word.', 'Relax your finger on the key — tension makes you jump the gun.'],
    touchNotes: ['In two-player mode, each player taps their own half of the stage.'],
  },
  achievements: [
    ['win', 'Fastest in Town', 'Win a duel against the computer.', 1, '🤠', 10],
    ['flawless', 'Clean Sweep', 'Win a duel 3–0.', 1, '💯', 20],
    ['hard', 'Legend of the West', 'Win a duel on Hard.', 1, '🏆', 30],
    ['duels', 'Sheriff', 'Win 20 duels against the computer.', 20, '⭐', 30],
  ],
  load: () => import('./QuickDrawGame'),
});
