import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'dungeon-shooter',
  title: 'Dungeon Shooter',
  category: 'action',
  difficulty: 'hard',
  icon: '🗝️',
  tags: ['rooms', 'shooter', 'roguelite', 'top-down', 'action'],
  short: 'Fight room by room through randomly built dungeon floors and find the stairs down.',
  full: 'A bite-sized roguelite shooter. Every floor is a freshly generated set of rooms. Step into a room and the doors lock until every monster inside is defeated. Explore with the minimap, grab the occasional potion, and find the stairs in the deepest room to descend. Your health carries over between floors, so each run gets more tense the deeper you go.',
  minutes: 8,
  controls: {
    keyboard: ['WASD or arrows move', 'Space shoots in the direction you move'],
    mouse: ['Aim with the mouse, hold the button to shoot'],
    touch: ['Direction pad moves', 'Touch and hold the play area to aim and shoot'],
  },
  instructions: {
    objective: 'Descend as many floors as you can.',
    howToPlay: [
      'Walk through an open doorway to enter the next room.',
      'Rooms with monsters lock their doors (orange) until you clear them.',
      'Skeletons chase you, bats swoop around, and mages throw spreads of magic from a distance.',
      'The stairs ⬇ are in the room furthest from the start. Stand on them once the room is clear.',
      'Health carries over; potions dropped by monsters restore two hearts.',
    ],
    scoring: 'Points for each monster and room cleared, plus 200 for every floor descended.',
    difficultyNotes: 'Higher difficulty gives monsters more health. Every floor makes them tougher.',
    tips: ['Fight from the doorway so monsters come to you one side at a time.', 'Use pillars to block magic.'],
    touchNotes: ['Move with your left thumb and hold your right finger where you want to shoot.'],
  },
  achievements: [
    ['floor-3', 'Delver', 'Reach floor 3.', 3, '🗝️', 15],
    ['floor-6', 'Deep Diver', 'Reach floor 6.', 6, '🏆', 30],
    ['rooms-20', 'Room Raider', 'Clear 20 rooms in one run.', 20, '🚪', 20],
    ['total', 'Dungeon Legend', 'Defeat 500 monsters in total.', 500, '🎖️', 30],
  ],
  load: () => import('./DungeonShooterGame'),
});
