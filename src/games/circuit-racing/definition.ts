import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'circuit-racing',
  title: 'Circuit Racing',
  category: 'racing',
  difficulty: 'hard',
  icon: '🏁',
  tags: ['laps', 'ai', 'track', 'circuits', 'racing'],
  short: 'Sports-car racing on three technical circuits — hairpins, esses and a mountain pass.',
  full: 'Four-lap sports-car races against three skilled computer drivers on one of three technical circuits: tight Harbour Hairpins, flowing Forest Esses or the twisting Mountain Pass. Each race picks a circuit at random, so you need to learn them all. Brake points matter more than top speed here.',
  minutes: 5,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['↑ accelerate, ↓ brake', '← → steer', 'Space or X: handbrake slide'],
    mouse: ['Hold the button: the car drives towards the pointer'],
    touch: ['Direction pad and Drift button, or hold the screen to drive towards your finger'],
  },
  instructions: {
    objective: 'Win four-lap races on all three circuits.',
    howToPlay: [
      'A circuit is chosen at random for each race; its name appears on the result screen.',
      'Learn where each hairpin is from the minimap.',
      'The handbrake helps the car rotate in the tightest bends.',
    ],
    scoring: '1st 1,200, 2nd 800, 3rd 500, 4th 250.',
    difficultyNotes: 'Higher difficulty gives rivals faster cars and smarter lines.',
    tips: ['Slow in, fast out: brake in a straight line, then accelerate as you unwind the steering.', 'On the Harbour circuit, the double hairpin rewards patience.'],
    touchNotes: ['Holding the screen drives towards your finger; let go to coast.'],
  },
  achievements: [
    ['podium', 'Podium Regular', 'Finish in the top three.', 1, '🥉', 10],
    ['win', 'Circuit Winner', 'Win a race.', 1, '🏁', 20],
    ['hard', 'Circuit Master', 'Win on Hard.', 1, '🏆', 30],
    ['races', 'Track Day', 'Complete 25 races.', 25, '🎖️', 25],
  ],
  load: () => import('./CircuitRacingGame'),
});
