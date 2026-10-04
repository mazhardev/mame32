import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'avoid-obstacles',
  title: 'Avoid Obstacles',
  category: 'casual',
  difficulty: 'medium',
  icon: '🚧',
  tags: ['dodging', 'endless', 'reflex', 'survival', 'casual'],
  short: 'Dodge a growing swarm of bouncing hazards for as long as you can survive.',
  full: 'A tense survival game in a small arena. Red orbs bounce around the walls and a new one joins every few seconds. Weave between them with the keyboard, mouse or your finger. Grab green pickups for a short shield. Your score is how long you last.',
  minutes: 2,
  controls: {
    keyboard: ['Arrow keys or WASD move the orb (diagonals too)'],
    mouse: ['Move the mouse; the orb glides towards it'],
    touch: ['Drag your finger, or use the direction pad'],
  },
  instructions: {
    objective: 'Survive as long as possible without touching a red orb.',
    howToPlay: [
      'Move your blue orb around the arena.',
      'Red orbs bounce off the walls. New ones fade in every few seconds and are harmless until solid.',
      'Collect a green pickup for four seconds of shield.',
      'Touching a solid red orb without a shield ends the run.',
    ],
    scoring: '10 points per second survived.',
    difficultyNotes: 'Higher difficulty adds hazards more often and makes them faster.',
    tips: ['Keep to open space instead of hugging walls.', 'Watch where fading orbs appear and move away early.'],
    touchNotes: ['Drag anywhere; the orb follows your finger at its own speed, so you can stay ahead of it.'],
  },
  achievements: [
    ['survive-30', 'Nimble', 'Survive 30 seconds.', 30, '🛡️', 15],
    ['survive-60', 'Untouchable', 'Survive 60 seconds.', 60, '🏆', 30],
    ['shields-3', 'Shield Collector', 'Collect 3 shields in one run.', 3, '🟢', 15],
    ['total', 'Survivor', 'Survive 10 minutes in total.', 600, '🎖️', 30],
  ],
  load: () => import('./AvoidObstaclesGame'),
});
