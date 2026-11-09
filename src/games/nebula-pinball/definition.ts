import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'nebula-pinball',
  title: 'Nebula Pinball',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🪐',
  tags: ['pinball', 'flippers', 'multiball', 'space', 'arcade', 'high score', 'retro'],
  short: 'A space-themed pinball table with planet bumpers, a black-hole lock and three-ball multiball.',
  full: 'Launch into the nebula! Keep the ball alive with the flippers and send it around a deep-space table: bounce it off planet bumpers, light the three star lanes to raise your bonus multiplier, knock down the drop targets to light the black-hole lock, and lock two balls to start multiball. During multiball every shot into the black hole is a jackpot, and each one is worth more than the last. Nudge the table to save a ball, but shake it too hard and it tilts. For more bouncing-ball classics, try [Brick Breaker](game:brick-breaker) or [Pong](game:pong).',
  minutes: 8,
  controls: {
    keyboard: ['← or Z: left flipper', '→ or / (or M): right flipper', 'Hold ↓ or Space to pull the plunger, release to launch', '↑ or X nudges the table'],
    touch: ['Tap and hold the left or right half of the table to flip', 'With a ball in the launch lane, hold the right half and let go to launch'],
  },
  instructions: {
    objective: 'Score as many points as you can before your last ball drains.',
    howToPlay: [
      'Pull the plunger back (hold ↓ or Space) and release to launch the ball. The longer you hold, the harder it goes.',
      'Flip to keep the ball in play. If it drains between the flippers or down an outer lane, the ball is over.',
      'Roll through all three star lanes at the top to raise the bonus multiplier (up to ×6). Flipping shifts which lanes are lit.',
      'Knock down all three drop targets on the right to light LOCK at the black hole, then shoot the ball into it. Lock two balls to start multiball.',
      'In multiball every ball in the black hole scores a jackpot: 25,000, then 50,000, then 75,000 and so on.',
      'Ball save gives a drained ball straight back for a few seconds after each launch, shown by the SAVE light.',
      'Nudge (↑ or X) to jolt a ball away from danger. Nudge too often and the table tilts: the flippers go dead and you lose your end-of-ball bonus.',
    ],
    scoring: 'Bumpers 100 (more with Super Bumpers after every 25 hits), slingshots 50, star lanes 1,000, drop targets 750 (+7,500 for the set), black hole 2,500, jackpots 25,000 and up. End-of-ball bonus counts your lanes, targets and bumpers, times the multiplier. Extra ball at 250,000 (400,000 on Hard).',
    difficultyNotes: 'Easy: 5 balls, a long ball save and a gentler slope. Normal: 3 balls. Hard: 3 balls, a short ball save, a faster table and a touchier tilt.',
    tips: [
      'Hold a flipper up to catch the ball (a cradle), then let it roll down the flipper to aim your shot.',
      'Shots from the tip of the flipper go across the table; from near the base they go up the same side.',
      'The black hole is on the upper left: aim with the right flipper.',
    ],
    touchNotes: ['Touch and hold the left half of the table for the left flipper and the right half for the right flipper; both work at once. Hold the right half to pull the plunger when a ball is waiting.'],
  },
  achievements: [
    ['score100k', 'Liftoff', 'Score 100,000 points in a game.', 1, '🚀', 10],
    ['multiball', 'Event Horizon', 'Start multiball.', 1, '🕳️', 25],
    ['jackpot', 'Jackpot Hunter', 'Score 3 jackpots in one game.', 3, '💰', 40],
    ['mult', 'Star Power', 'Reach a ×5 bonus multiplier.', 5, '⭐', 30],
    ['score1m', 'Supernova', 'Score 1,000,000 points in a game.', 1, '🌌', 80],
  ],
  load: () => import('./NebulaPinballGame'),
});
