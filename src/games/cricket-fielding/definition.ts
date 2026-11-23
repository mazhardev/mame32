import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cricket-fielding',
  title: 'Cricket Fielding',
  category: 'sports',
  difficulty: 'medium',
  icon: '🧤',
  tags: ['cricket', 'fielding', 'catch', 'run out', 'throw', 'sports'],
  short: 'The computer bats, you field: take catches, stop boundaries and throw down the stumps.',
  full: 'Two overs, three wickets and a small total to defend, and this time the bat belongs to the computer. Every ball it plays a shot, and you take charge of whichever fielder can get there first. Run under a skier and hold the catch, cut off a drive before it reaches the rope, then throw to the right end while the batters scamper through for a run. Misjudge a single and they are run out; dawdle and they will steal a second. Want the bat in your hands? Chase a target in [Cricket Batting](game:cricket-batting), take the new ball in [Cricket Bowling](game:cricket-bowling), or see all [cricket games](hub:cricket-games).',
  minutes: 3,
  multiplayer: 'vs-ai',
  hasLevels: false,
  controls: {
    keyboard: [
      'Arrows or WASD run with the fielder in the yellow ring',
      'Space dives',
      'B (or 2) throws to the bowler’s end, K (or 1) to the keeper’s end',
    ],
    mouse: ['Press and drag on the field to send your fielder there', 'Click a set of stumps (or a throw button) to throw'],
    touch: [
      'Drag on the field to run, or use the d-pad',
      'Dive button dives',
      'Tap a set of stumps or a throw button to throw',
    ],
  },
  instructions: {
    objective: 'Stop the computer reaching the target before its 12 balls or three wickets run out.',
    howToPlay: [
      'After each shot you control the fielder best placed to reach the ball, shown with a yellow ring. Control switches if another fielder becomes much closer.',
      'A yellow cross marks where a ball in the air will land. Get there before it does to take the catch. Catches at full stretch or on the dive are sometimes dropped.',
      'A ball that crosses the rope along the ground is four; over it on the full is six. Reach it first to stop the boundary.',
      'The batters run whenever they think the ball will come back slower than they can run 22 yards. Once you have the ball, throw it to either end: if a batter is still short of the crease when it gets there, they are run out.',
      'Close throws often hit the stumps directly. A throw from the deep needs gathering first, which gives the batters a moment longer.',
    ],
    scoring:
      'You score 100 points per wicket, 50 more for each catch or run-out, 10 per dot ball, and 500 for defending the total plus 25 for every run to spare.',
    difficultyNotes:
      'Easy: quicker fielders with a bigger reach, gentler shots and batters who misjudge runs; target 13. Normal: target 15 and a sharper batter. Hard: the batter finds the gaps, hits harder and judges runs well, your fielders are slower and catches at full stretch are dropped more often; target 17.',
    tips: [
      'Run to where the ball is going, not where it is: head for the yellow cross or cut across the ball’s line.',
      'If the batters are already halfway down the pitch, throw to the nearer end at once.',
      'A dive gives you extra reach for one burst, but you lie on the ground for a moment afterwards.',
    ],
    touchNotes: [
      'Press and drag on the field and your fielder runs toward your finger; the d-pad under the game works too.',
      'When you have the ball, tap the bowler’s end or keeper’s end button (or the stumps themselves) to throw.',
    ],
  },
  achievements: [
    ['catch', 'Safe Hands', 'Take a catch.', 1, '🧤', 10],
    ['direct', 'Direct Hit', 'Run a batter out with a direct hit on the stumps.', 1, '🎯', 20],
    ['win', 'Defended', 'Defend the target on any difficulty.', 1, '🛡️', 20],
    ['dots', 'Dot-Ball Pressure', 'Keep the batter scoreless for 6 balls in one innings.', 6, '⏺️', 20],
    ['allout', 'Bowled Them Out', 'Take all three wickets in an innings.', 1, '🏏', 30],
    ['hard', 'Gun Fielder', 'Defend the target on Hard.', 1, '🏆', 50],
  ],
  load: () => import('./CricketFieldingGame'),
});
