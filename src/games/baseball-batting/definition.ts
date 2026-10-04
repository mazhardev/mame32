import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'baseball-batting',
  title: 'Baseball Batting',
  category: 'sports',
  difficulty: 'medium',
  icon: '⚾',
  tags: ['home run derby', 'timing', 'batting', 'sports', 'pitch'],
  short: 'A home run derby: read fastballs, curves and sliders and send them over the fence.',
  full: 'Step into the box for a home run derby. The computer pitcher mixes fastballs, changeups, curveballs and sliders. Put the bat marker where the pitch will cross the plate and swing as it arrives — get just under the ball for lift, pull it with an early swing or go the other way with a late one. Every swing that is not a home run is an out, and so is a called strike. Ten outs and you are done.',
  minutes: 4,
  controls: {
    keyboard: ['Arrow keys move the bat marker', 'Space swings'],
    mouse: ['Move the mouse to place the bat; click to swing'],
    touch: ['Tap where the pitch will cross the plate — the tap swings the bat there'],
  },
  instructions: {
    objective: 'Hit as many home runs as you can before you make ten outs.',
    howToPlay: [
      'The rectangle is the strike zone. Pitches outside it can be left alone at no cost.',
      'Taking a pitch in the zone is a called strike — that is an out.',
      'Swing when the ball reaches the plate. Too early pulls it foul; too late pushes it foul.',
      'Aim the marker slightly under the ball to lift it; on top of the ball you hit a grounder.',
      'Curveballs drop late and sliders break sideways — watch the pitch name and speed.',
    ],
    scoring: '100 points per home run plus one point per metre it travelled.',
    difficultyNotes:
      'Easy: slower fastballs and changeups, mostly in the zone, a wider timing window and a marker that shows where the pitch will cross. Hard: fast pitches with lots of breaking balls, more pitches off the plate and a tight timing window.',
    tips: [
      'Lay off pitches outside the zone — they cost nothing.',
      'Against curves, start the marker lower than the ball looks.',
    ],
    touchNotes: [
      'Tapping both places the bat and swings, so tap where the ball is going, not where it is.',
    ],
  },
  achievements: [
    ['homer', 'Going, Going, Gone', 'Hit a home run.', 1, '⚾', 10],
    ['streak', 'Back to Back to Back', 'Hit 3 home runs in a row.', 3, '🔥', 25],
    ['five', 'Derby Contender', 'Hit 5 home runs in one derby.', 5, '🏅', 25],
    ['long', 'Moonshot', 'Hit a home run of 135 m or more.', 135, '🚀', 30],
    ['hard', 'Derby Champion', 'Hit 5 home runs on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./BaseballBattingGame'),
});
