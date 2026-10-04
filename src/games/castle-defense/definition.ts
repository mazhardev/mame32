import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'castle-defense',
  title: 'Castle Defense',
  category: 'strategy',
  difficulty: 'medium',
  icon: '🏰',
  tags: ['defense', 'aim', 'waves', 'upgrade', 'ballista', 'strategy'],
  short: 'Man the ballista, shoot down the attackers and upgrade your castle between waves.',
  full: 'Attackers march on your castle wall: footsoldiers, shield-bearers, battering rams, swooping bats and lumbering giants. Aim the ballista on your tower and fire — bolts drop as they fly, so lead your targets. Between waves, visit the armoury to repair and thicken the wall, fit heavier bolts, reload faster, hire archers and build catapults.',
  minutes: 10,
  controls: {
    keyboard: [
      '↑ ↓ aim',
      'Space fires (hold to keep firing)',
      '1–7 buy in the armoury, Space starts the next wave',
    ],
    mouse: ['Point to aim; click or hold to fire; click armoury items to buy'],
    touch: ['Touch to aim and fire; tap armoury items to buy'],
  },
  instructions: {
    objective: 'Survive every wave with your wall still standing.',
    howToPlay: [
      'Attackers that reach the wall chip away at it. If the wall falls, you lose.',
      'Bolts arc under gravity — aim a little above distant targets.',
      'Shield-bearers take less damage from bolts; rams hit the wall very hard.',
      'Archers shoot the nearest attacker on their own; catapults hurl rocks into crowds.',
      'Every wave you repel pays gold for the armoury.',
    ],
    scoring:
      '10 points per attacker, 100 per wave, and a bonus plus your remaining wall for winning.',
    difficultyNotes:
      'Easy: 8 waves, more starting gold and an aiming guide. Normal: 10 waves with the guide. Hard: 10 tougher waves, little gold and no guide.',
    tips: ['Deal with rams first — they wreck the wall fastest.', 'Archers are great value early.'],
    touchNotes: ['Keep your finger on the battlefield to aim and fire continuously.'],
  },
  achievements: [
    ['win', 'Castle Holds', 'Survive every wave.', 1, '🏰', 25],
    ['archers', 'Garrison', 'Hire 6 archers.', 6, '🏹', 20],
    ['untouched', 'Not a Scratch', 'Win without the wall taking damage.', 1, '🛡️', 40],
    ['kills', 'Siege Breaker', 'Defeat 500 attackers in total.', 500, '⚔️', 30],
    ['hard', 'Lord of the Keep', 'Win on Hard.', 1, '👑', 40],
  ],
  load: () => import('./CastleDefenseGame'),
});
