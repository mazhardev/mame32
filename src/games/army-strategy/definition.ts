import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'army-strategy',
  title: 'Army Strategy',
  category: 'strategy',
  difficulty: 'hard',
  icon: '⚔️',
  tags: ['tactics', 'turn-based', 'war game', 'units', 'ai', 'missions'],
  short:
    'Turn-based tactics: outmanoeuvre the computer’s army with spearmen, archers, riders and catapults.',
  full: 'Command a small army across three missions against a computer general. Each turn every unit can move and then attack. Spearmen stop cavalry, riders run down archers and catapults, and archers pick off spearmen from a distance — while forests and hills give cover. Catapults hit hardest of all but cannot fire after moving. Defeat every enemy, or plant a unit on the enemy banner and hold it for a whole turn. The computer opponent runs entirely in your browser.',
  minutes: 15,
  multiplayer: 'vs-ai',
  hasSaveState: true,
  hasLevels: true,
  keyboard: false,
  controls: {
    mouse: ['Click a unit, then a blue tile to move or a red enemy to attack'],
    touch: ['Tap a unit, then a blue tile to move or a red enemy to attack'],
  },
  instructions: {
    objective: 'Defeat every enemy unit, or hold the enemy banner 🏴 for a full turn.',
    howToPlay: [
      'Tap one of your (blue) units: blue tiles show where it can move, red outlines show enemies it can attack.',
      'Move first, then attack — each unit gets one move and one attack per turn.',
      'Melee attacks draw a counter-attack if the defender survives; ranged attacks do not.',
      'Press End turn when you are done; the computer then moves its army.',
      'Win a mission to unlock the next one.',
    ],
    scoring:
      'Winning scores 1,000, minus 30 per round taken, plus 60 for each unit still standing.',
    difficultyNotes:
      'Easy: one fewer enemy, and the computer often makes mistakes. Normal: a full enemy army that plays sensibly. Hard: an extra enemy unit and a careful opponent that focuses its fire.',
    tips: [
      'Wounded units hit for less — finish off weakened enemies.',
      'Park archers on hills and in forests, behind your spearmen.',
      'Riders are perfect for chasing down catapults.',
      'Watch your own banner: the computer will try to grab it.',
    ],
    touchNotes: [
      'The battlefield scales to fit the screen; the damage preview appears on any enemy you can hit.',
    ],
  },
  achievements: [
    ['win', 'First Victory', 'Win a mission.', 1, '⚔️', 10],
    ['flawless', 'Flawless', 'Win a mission without losing a unit.', 1, '🛡️', 25],
    ['banner', 'Capture the Flag', 'Win by holding the enemy banner.', 1, '🏴', 20],
    ['campaign', 'Campaign Complete', 'Win all three missions on one difficulty.', 3, '🗺️', 30],
    ['hard', 'Grand Marshal', 'Win all three missions on Hard.', 3, '🏆', 50],
    ['kills', 'Veteran', 'Defeat 100 enemy units in total.', 100, '🎖️', 25],
  ],
  load: () => import('./ArmyGame'),
});
