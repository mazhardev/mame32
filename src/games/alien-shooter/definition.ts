import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'alien-shooter',
  title: 'Alien Shooter',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🛸',
  tags: ['shooter', 'space', 'retro', 'formation', 'stages'],
  short: 'Aliens swoop into formation, then dive-bomb your ship. Shoot them down stage by stage.',
  full: 'A swooping space shooter. Squadrons of aliens loop in on graceful flight paths and settle into a shimmering formation — then peel off one or two at a time to dive at your ship, firing as they come. Picking off divers mid-swoop is worth double. Clear every alien to reach the next, more aggressive stage.',
  minutes: 5,
  controls: {
    keyboard: ['← / → move', 'Space or ↑ fires'],
    mouse: ['Hold on the game to move towards the pointer; click to fire'],
    touch: ['◀ ▶ move', 'Fire button'],
  },
  instructions: {
    objective: 'Clear as many stages as you can.',
    howToPlay: [
      'Aliens fly in along curved paths before joining the formation.',
      'From the formation they dive towards you and fire. A diver that reaches the bottom returns to its place.',
      'Getting hit by a shot or a diving alien costs a life.',
      'You can have two shots in the air at once.',
    ],
    scoring: 'Green 50, gold 80, pink 150 — double while diving. 500 for each stage cleared.',
    difficultyNotes: 'Easy: rare dives and an extra life. Hard: frequent dives.',
    tips: ['Shoot aliens while they fly in — they can’t fire yet.', 'Stay moving when a diver comes at you.'],
    touchNotes: ['Move with the pad; tap Fire on the right.'],
  },
  achievements: [
    ['stage-2', 'Wing Clipper', 'Clear the first stage.', 2, '🛸', 15],
    ['stage-5', 'Squadron Buster', 'Reach stage 5.', 5, '🎖️', 35],
    ['score', 'Sky Marshal', 'Score 15,000 points.', 15000, '🏆', 30],
    ['kills', 'Alien Hunter', 'Shoot down 1,000 aliens in total.', 1000, '🌟', 30],
  ],
  load: () => import('./AlienShooterGame'),
});
