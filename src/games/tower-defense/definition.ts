import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tower-defense',
  title: 'Tower Defense',
  category: 'strategy',
  difficulty: 'hard',
  icon: '🗼',
  tags: ['towers', 'waves', 'strategy', 'defense', 'upgrade', 'featured'],
  short: 'Build and upgrade arrow, cannon, frost and laser towers to hold back 20 waves.',
  full: 'Classic tower defense on one of three winding maps. Spend gold on arrow towers, splash-damage cannons, slowing frost towers and armour-piercing lasers, then upgrade them twice. Runners rush, armoured tanks shrug off arrows and bosses arrive every tenth wave. Every enemy that reaches your castle costs a life — survive all the waves to win.',
  minutes: 15,
  controls: {
    keyboard: [
      '1–4 choose a tower',
      'Arrows move the cursor, Enter builds or selects',
      'U upgrade, X sell, N next wave',
    ],
    mouse: ['Choose a tower at the bottom, click grass to build, click a tower to upgrade or sell'],
    touch: ['Tap a tower button, tap grass to build, tap a tower to upgrade or sell'],
  },
  instructions: {
    objective: 'Stop enemies reaching the castle until every wave is beaten.',
    howToPlay: [
      'Towers can only go on grass, never on the path.',
      'Arrow: cheap and quick. Cannon: hits a group. Frost: slows enemies. Laser: long range and ignores armour.',
      'Tanks have armour that takes a chunk off every hit — cannons and lasers deal with them best.',
      'Each wave you clear pays bonus gold. Start the next wave when you are ready.',
      'Bosses take 5 lives if they get through.',
    ],
    scoring: '5 points per enemy defeated, 100 per wave, 25 per life left, plus a victory bonus.',
    difficultyNotes:
      'Easy: 15 waves, more starting gold and enemies that toughen slowly. Normal: 20 waves. Hard: 20 waves, less gold and enemies whose health grows quickly.',
    tips: [
      'Put frost towers before your damage towers.',
      'Corners of the path are covered from two sides — build there.',
    ],
    touchNotes: ['Tap the same tower button again to cancel building.'],
  },
  achievements: [
    ['wave10', 'Holding the Line', 'Survive 10 waves.', 10, '🛡️', 15],
    ['win', 'Defender', 'Win a game.', 1, '🗼', 25],
    ['max', 'Fully Armed', 'Upgrade a tower to level 3.', 1, '⭐', 15],
    ['flawless', 'Flawless', 'Win without losing a life.', 1, '💎', 40],
    ['kills', 'Monster Hunter', 'Defeat 1,000 enemies in total.', 1000, '⚔️', 30],
    ['hard', 'Iron Fortress', 'Win on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./TowerDefenseGame'),
});
