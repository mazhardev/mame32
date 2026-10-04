import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'soccer-free-kick',
  title: 'Soccer Free Kick',
  category: 'sports',
  difficulty: 'medium',
  icon: '🥅',
  tags: ['football', 'soccer', 'curve', 'aim', 'swipe', 'sports'],
  short: 'Curl ten free kicks around the wall and past the keeper.',
  full: 'Ten free kicks from different distances and angles. A wall of defenders guards the near post and a keeper waits for anything on target. Swipe towards the goal to shoot: swipe faster for more power and bow your swipe to bend the ball. Top-corner goals score extra.',
  minutes: 4,
  controls: {
    keyboard: [
      '← → aim, ↑ ↓ height',
      'X changes the curl',
      'Hold Space to build power and release to shoot',
    ],
    mouse: [
      'Swipe from the ball to the spot in the goal you are aiming for; curve the swipe to curl the shot',
    ],
    touch: ['Swipe towards the goal; a curved swipe curls the ball'],
  },
  instructions: {
    objective: 'Score as many of the ten free kicks as you can.',
    howToPlay: [
      'Where your swipe ends is where you are aiming in the goal.',
      'A fast swipe hits the ball harder; a hard, high shot can fly over the bar.',
      'Curl bends the ball sideways — aim outside the wall and let it swing back in.',
      'The wall jumps as you shoot, and the keeper dives once the ball is past the wall.',
    ],
    scoring: '100 points per goal, +50 into a corner near a post, +50 high in the net.',
    difficultyNotes:
      'Easy shows the full flight path and a slow keeper. Normal shows the first part of the path and adds a breeze. Hard has a taller jumping wall, a sharp keeper, stronger wind and only an aiming mark.',
    tips: [
      'The keeper shades towards the far post — the near top corner over the wall is the dream.',
      'Curl away from the keeper rather than smashing it at him.',
    ],
    touchNotes: ['Start your swipe near the ball and finish it on your target.'],
  },
  achievements: [
    ['goal', 'Back of the Net', 'Score a free kick.', 1, '⚽', 10],
    ['corner', 'Top Bins', 'Score in a top corner.', 1, '🎯', 20],
    ['curler', 'Bend It', 'Score with curl.', 1, '🌀', 20],
    ['five', 'Set-Piece Expert', 'Score 5 free kicks in one session.', 5, '🏅', 30],
    ['hard', 'Free-Kick Legend', 'Score 6 or more on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./SoccerFreeKickGame'),
});
