import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'dojo-duel',
  title: 'Dojo Duel',
  category: 'action',
  difficulty: 'medium',
  icon: '🥋',
  tags: ['fighting', 'martial arts', 'versus', 'two-player', 'combos', 'arcade', 'boss'],
  short: 'A one-on-one martial arts fighter: eight original fighters, special moves, supers and a final boss.',
  full: 'Step into the dojo and fight your way up the ladder. Pick one of eight original fighters, each with their own style, special moves and a screen-filling super: fireballs, whirlwind kicks, bear hugs, shadow steps, staff spins and lightning. Block high and low, chain punches into specials for combos, fill your super meter and beat seven rivals to face Master Oni at the Last Gate. Or hand a friend the other side of the keyboard for a two-player duel.',
  minutes: 10,
  multiplayer: 'local-multiplayer',
  controls: {
    keyboard: [
      'Arrow keys or WASD: walk, jump (↑) and crouch (↓)',
      'Hold away from your opponent to block; hold down-away to block low',
      'J or Z punch, K or X kick, L or C special',
      '→ + Special and ↓ + Special for other specials; → + Punch up close throws',
      'Space (or I, V) super when the meter is full',
    ],
    touch: ['D-pad to move, jump, crouch and block', 'P punch, K kick, SP special (with → or ↓ for others)', '★ super when the meter is full'],
  },
  instructions: {
    objective: 'Win two rounds to win a match. In Arcade, beat seven rivals and then Master Oni.',
    howToPlay: [
      'Knock your opponent’s health bar to zero, or have more health left when the 60-second timer runs out.',
      'Block by holding away from your opponent. Low kicks and sweeps must be blocked crouching; jumping attacks and overheads must be blocked standing. Throws cannot be blocked: walk away or hit first.',
      'Every fighter has three specials (Special, → + Special, ↓ + Special) and a super. The move list below the game shows them for your fighter.',
      'Land a punch or kick and press Special straight away to cancel it into a special for a combo. Jabs chain into each other.',
      'Hitting, blocking and getting hit fill your super meter. When it flashes SUPER!, press Space (or punch and kick together) to unleash it.',
      'Two-player mode: Player 1 uses WASD with F, G, H and T; Player 2 uses the arrows with comma, full stop, slash and semicolon (or 1, 2, 3, 0).',
    ],
    scoring: 'Arcade score: 2 points per point of damage, 1,000 per round won plus 20 per second left, 5,000 for a perfect round, 2,000 for finishing with a super, and a bonus for every opponent beaten.',
    difficultyNotes: 'Easy: the computer reacts slowly and rarely blocks or combos. Normal: a fair fight. Hard: sharp reactions, solid blocking, anti-airs and combos. Opponents later in the ladder get a little tougher.',
    tips: [
      'Rising specials (↓ + Special for most fighters) beat jump-ins.',
      'Fireballs can be jumped over, or cancelled out with your own.',
      'Specials still chip away a little health when blocked.',
      'Bruno’s grabs and Tobu’s staff reward patience; Mei and Rex love to rush in.',
    ],
    touchNotes: ['Use the d-pad to move, jump, crouch and block, and the P, K and SP buttons to attack. ★ fires your super when the meter is full.'],
  },
  achievements: [
    ['first', 'First Victory', 'Win an arcade match.', 1, '🥋', 10],
    ['perfect', 'Untouchable', 'Win a round without taking a hit.', 1, '✨', 25],
    ['super', 'Grand Finale', 'Finish a round with a super move.', 1, '💥', 20],
    ['combo', 'Combo Artist', 'Land a 5-hit combo.', 5, '🔥', 25],
    ['boss', 'Gatebreaker', 'Defeat Master Oni.', 1, '👹', 50],
    ['hard', 'Grandmaster', 'Clear the arcade ladder on Hard.', 1, '🏆', 80],
    ['versus', 'Friendly Rivals', 'Play a two-player match.', 1, '🤝', 10],
  ],
  load: () => import('./DojoDuelGame'),
});
