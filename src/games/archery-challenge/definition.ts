import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'archery-challenge',
  title: 'Archery Challenge',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🏹',
  tags: ['archery', 'bow', 'aim', 'balloons', 'target', 'wind', 'timed'],
  short: 'A timed shooting gallery: pop balloons and hit the moving target before time runs out.',
  full: 'Take your bow to the shooting gallery. Balloons float up across the field and a target board glides up and down. Arrows fly in a real arc and drift with the wind, so read the wind sock and lead your shots. Hits in a row build a score multiplier, golden balloons add time to the clock, and one well-placed arrow can pop a whole line of balloons.',
  minutes: 2,
  controls: {
    keyboard: ['↑ / ↓ raise and lower the bow', 'Hold Space to draw, release to shoot'],
    mouse: ['Press anywhere, drag back and release — like a slingshot'],
    touch: ['Touch, drag back and let go'],
  },
  instructions: {
    objective: 'Score as many points as you can before the clock runs out.',
    howToPlay: [
      'The further you pull back, the harder the arrow flies.',
      'Dots show the start of the arrow’s path while you aim — the wind is not included.',
      'Balloons are worth 10 points; golden balloons are worth 30 and add 3 seconds.',
      'The target board scores 10, 20, 30 or a 50-point bullseye.',
      'Three hits in a row double your points; six in a row triple them. A miss resets the streak.',
      'The wind changes every 12 seconds.',
    ],
    scoring: 'Points per balloon or ring × your streak multiplier.',
    difficultyNotes: 'Easy: 75 seconds and light winds. Normal: 60 seconds. Hard: 50 seconds and strong gusts.',
    tips: ['Line up rising balloons so one arrow pops several.', 'Aim a little into the wind.', 'A missed shot costs your streak, so don’t spray arrows.'],
    touchNotes: ['You can start the drag anywhere on the field — the direction of the pull is what counts.'],
  },
  achievements: [
    ['score-500', 'Sharpshooter', 'Score 500 points in one round.', 500, '🎯', 20],
    ['score-1500', 'Master Archer', 'Score 1,500 points in one round.', 1500, '🏆', 40],
    ['bullseyes', 'Dead Centre', 'Hit 3 bullseyes in one round.', 3, '🎯', 25],
    ['pierce', 'Skewer', 'Pop 3 balloons with one arrow.', 3, '🎈', 30],
    ['balloons', 'Balloon Buster', 'Pop 1,000 balloons in total.', 1000, '🎈', 30],
  ],
  load: () => import('./ArcheryChallengeGame'),
});
