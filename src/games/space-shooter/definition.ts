import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'space-shooter',
  title: 'Space Shooter',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🚀',
  tags: ['shoot em up', 'shmup', 'space', 'bosses', 'power-ups'],
  short: 'A vertical shoot-’em-up: dodge, power up and blast your way to the boss.',
  full: 'Fly up through deep space in a classic vertical shooter. Your ship fires on its own, so focus on flying: weave through drones, sine-wave fighters and aimed gunship fire, grab weapon and shield power-ups, and face a heavily armoured boss every 45 seconds.',
  minutes: 5,
  controls: {
    keyboard: ['Arrow keys or WASD fly the ship (it fires automatically)'],
    mouse: ['Hold the button and drag — the ship follows just above the pointer'],
    touch: ['Drag your finger on the game, or use the direction pad'],
  },
  instructions: {
    objective: 'Survive as long as possible and rack up points.',
    howToPlay: [
      'The ship fires continuously. W power-ups upgrade the gun (up to three levels); S power-ups add shield.',
      'Each hit knocks off one shield point and one weapon level. When the shield is gone you lose a life.',
      'Every 45 seconds a boss arrives. It alternates spreads of bullets with aimed bursts.',
    ],
    scoring: 'Drone 50, weaver 80, gunship 150, boss 2,000, power-up 100.',
    difficultyNotes: 'Easy: fewer enemies and slower fire, plus an extra life. Hard: crowded skies and faster fire.',
    tips: ['Keep low and move in small steps — big moves run into bullets.', 'Gunships often drop power-ups.'],
    touchNotes: ['Drag with a finger: the ship stays above your finger so you can see it.'],
  },
  achievements: [
    ['boss', 'Boss Down', 'Defeat a boss.', 1, '👹', 20],
    ['three-bosses', 'Ace of Aces', 'Defeat three bosses in one game.', 3, '🎖️', 40],
    ['score', 'High Score Hero', 'Score 20,000 points.', 20000, '🏆', 30],
    ['kills', 'Squadron Leader', 'Down 1,000 enemies in total.', 1000, '✈️', 30],
  ],
  load: () => import('./SpaceShooterGame'),
});
