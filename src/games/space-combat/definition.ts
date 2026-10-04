import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'space-combat',
  title: 'Space Combat',
  category: 'action',
  difficulty: 'medium',
  icon: '🛸',
  tags: ['shooter', 'space', 'dogfight', 'physics', 'action'],
  short: 'Dogfight enemy fighters in zero gravity — master momentum, then out-turn them.',
  full: 'A space dogfight with real momentum. Turning and thrusting are separate: your ship keeps drifting the way it was going, just like in space. Enemy fighters chase you, lead their shots and open fire when they line up. Your shield recharges slowly; your hull does not. The arena wraps around at the edges, so there is nowhere to hide.',
  minutes: 5,
  controls: {
    keyboard: ['← → or A / D turn', '↑ or W thrusts', 'Space fires'],
    mouse: ['Hold the button to fly towards the pointer; you fire automatically at enemies ahead'],
    touch: ['Direction pad turns and thrusts, Fire button shoots — or hold the play area to fly towards your finger'],
  },
  instructions: {
    objective: 'Destroy wave after wave of enemy fighters.',
    howToPlay: [
      'Your ship drifts with its momentum; thrust to change speed and direction.',
      'Enemy lasers hit your shield first (blue ring), then your hull.',
      'The shield recharges slowly. Each cleared wave repairs one hull point.',
      'Flying off one edge brings you back on the opposite side.',
    ],
    scoring: '100 points per fighter plus a bonus for each wave.',
    difficultyNotes: 'Higher difficulty makes enemy pilots aim more accurately.',
    tips: ['Turn to face a chasing enemy without thrusting — momentum keeps you moving.', 'Short bursts of thrust keep you in control.'],
    touchNotes: ['Holding the play area is the easiest way to fly on a phone.'],
  },
  achievements: [
    ['ace', 'Ace Pilot', 'Destroy 5 fighters in one game.', 5, '🛸', 15],
    ['wave-5', 'Squadron Breaker', 'Reach wave 5.', 5, '🏆', 30],
    ['total', 'Space Legend', 'Destroy 200 fighters in total.', 200, '🎖️', 30],
  ],
  load: () => import('./SpaceCombatGame'),
});
