import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cricket-super-over',
  title: 'Cricket Super Over',
  category: 'sports',
  difficulty: 'hard',
  icon: '🏆',
  tags: ['cricket', 'super over', 'batting', 'bowling', 'ai', 'sports'],
  short: 'Six balls to bat, six to bowl: win the super over against the computer.',
  full: 'The match is tied and it all comes down to a super over. First you bat: one over, two wickets, swing for the ropes. Then you take the ball and bowl one over while the computer chases your score, swinging hard from the first ball. If the scores finish level, the side with more boundaries wins.',
  minutes: 4,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: [
      'Batting: Space swings; hold ← / → for the side and ↑ to loft',
      'Bowling: arrows move the target, X pace/spin, Space to run in and release',
    ],
    mouse: [
      'Batting: click to swing (left/right/top of the screen picks the shot)',
      'Bowling: click the pitch to aim, click the target to run in, click to release',
    ],
    touch: ['Batting: tap to swing', 'Bowling: tap the pitch, tap the target, then tap to release'],
  },
  instructions: {
    objective: 'Score more runs than the computer in a one-over shoot-out.',
    howToPlay: [
      'Bat first: six legal balls, and two wickets end the innings early.',
      'Then bowl one over; the computer needs one run more than you scored.',
      'If the scores are level, the side that hit more fours and sixes wins.',
      'The computer bats aggressively — full, straight bowling is your best defence.',
    ],
    scoring: '10 points per run you score, 60 per wicket you take, and 400 for winning.',
    difficultyNotes:
      'On Hard the computer bowls faster and straighter, bats with more skill, and your timing window and accuracy meter are tighter.',
    tips: [
      'Two wickets go quickly — do not slog every ball.',
      'Yorkers on the stumps are hard to hit for six.',
    ],
    touchNotes: ['When bowling, tap the yellow target again to start your run-up.'],
  },
  achievements: [
    ['played', 'Pressure Cooker', 'Play a super over.', 1, '🏏', 10],
    ['win', 'Super Over Hero', 'Win a super over.', 1, '🏆', 25],
    ['sixes', 'Big Hitter', 'Hit two sixes in one super over.', 1, '6️⃣', 25],
    ['defend', 'Nerves of Steel', 'Win after scoring 8 or fewer.', 1, '🧊', 35],
    ['hard', 'World Champion', 'Win a super over on Hard.', 1, '🌍', 40],
  ],
  load: () => import('./CricketSuperOverGame'),
});
