import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cricket-batting',
  title: 'Cricket Batting',
  category: 'sports',
  difficulty: 'medium',
  icon: '🏏',
  tags: ['cricket', 'timing', 'batting', 'chase', 'sports', 'T20'],
  short: 'Chase a target in three overs: time your swing, pick your gaps and clear the ropes.',
  full: 'Face a computer bowler mixing pace and spin, yorkers and bouncers, and chase down a target in three overs with three wickets in hand. Timing is everything: meet the ball early and it flies to the leg side, late and it goes square on the off side. Loft it for six — but a mistimed lofted shot can be caught in the deep, and a missed straight ball crashes into the stumps.',
  minutes: 5,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: [
      'Space swings',
      'Hold ← for the leg side, → for the off side',
      'Hold ↑ to loft the ball',
    ],
    mouse: ['Click to swing: left third = leg side, right third = off side, upper half = lofted'],
    touch: ['Tap to swing: tap left or right for the side, high up to loft'],
  },
  instructions: {
    objective: 'Score the target before you run out of balls or wickets.',
    howToPlay: [
      'Watch the bowler’s hand and the bounce, and swing as the ball reaches you.',
      'Early contact pulls the ball to the leg side; late contact steers it to the off side.',
      'Ground shots that beat the fielders run to the rope for four. Lofted shots that clear it are six.',
      'Miss a ball on the stumps and you are bowled. Thin edges can be caught behind.',
      'Balls passing well wide of the stumps are wides — leave them for a free run.',
    ],
    scoring:
      '10 points per run, a bonus for every boundary, and 200 plus 10 per spare ball for a successful chase.',
    difficultyNotes:
      'Easy: target 24, slower bowling, a wider timing window and weaker fielders. Hard: target 36, fast and accurate bowling, a narrow timing window and safe hands in the field.',
    tips: [
      'Pick the length early: yorkers need quick hands, short balls give you time.',
      'Keep the ball on the ground when fielders are in the deep.',
    ],
    touchNotes: ['Your tap position chooses the shot; the moment you tap is the swing.'],
  },
  achievements: [
    ['four', 'Through the Gap', 'Hit a four.', 1, '4️⃣', 10],
    ['six', 'Maximum', 'Hit a six.', 1, '6️⃣', 15],
    ['chase', 'Chase Master', 'Chase down the target.', 1, '🏏', 20],
    ['runs', 'Half-Century', 'Score 50 runs in one chase.', 50, '🏅', 35],
    ['sixes', 'Six Machine', 'Hit 25 sixes in total.', 25, '🚀', 30],
    ['hard', 'Finisher', 'Win the chase on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./CricketBattingGame'),
});
