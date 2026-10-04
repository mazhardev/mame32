import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'bowling',
  title: 'Bowling',
  category: 'sports',
  difficulty: 'easy',
  icon: '🎳',
  tags: ['ten pin', 'aim', 'power', 'physics', 'sports', 'strike'],
  short: 'Bowl a full ten-frame game: hook the ball into the pocket for strikes.',
  full: 'Ten-pin bowling with real pin action. Pick your spot on the lane, choose how much the ball hooks, then stop the aim and power meters — or simply swipe the ball up the lane. Pins scatter and knock each other down, and the score sheet counts strikes and spares exactly like a bowling alley, including bonus balls in the tenth frame.',
  minutes: 6,
  controls: {
    keyboard: ['← → choose your start position', '↑ ↓ set the hook', 'Space stops the aim meter, then the power meter'],
    mouse: ['Drag sideways to position; swipe up the lane to bowl (a curved swipe adds hook)'],
    touch: ['Drag sideways to position, then swipe up the lane to bowl'],
  },
  instructions: {
    objective: 'Score as many points as possible over ten frames (300 is perfect).',
    howToPlay: [
      'Each frame you get two balls to knock down all ten pins.',
      'The ball travels straight on the oily front of the lane and hooks on the dry back end.',
      'Aim for the pocket — just beside the head pin — and let the hook carry the ball in at an angle.',
      'Hitting the head pin full on often leaves a split.',
    ],
    scoring: 'A strike scores 10 plus your next two balls; a spare scores 10 plus your next ball. Strike or spare in the tenth frame earns bonus balls.',
    difficultyNotes: 'Easy shows the full ball path and slow meters. Normal shows the first part of the path. Hard has fast meters, no guide, and lane oil that changes how much the ball hooks from game to game.',
    tips: ['Start right of centre with a little left hook to find the 1–3 pocket.', 'For a spare, aim at the pin nearest to you.'],
    touchNotes: ['Swipe further and faster for more power; bow the swipe to the right to hook left.'],
  },
  achievements: [
    ['strike', 'Strike!', 'Bowl a strike.', 1, '🎳', 10],
    ['spare', 'Spare Change', 'Convert a spare.', 1, '🔁', 10],
    ['turkey', 'Turkey', 'Bowl three strikes in a row.', 3, '🦃', 30],
    ['s150', 'League Bowler', 'Score 150 in a game.', 150, '🏅', 30],
    ['games', 'Lane Regular', 'Bowl 10 games.', 10, '🎖️', 20],
  ],
  load: () => import('./BowlingGame'),
});
