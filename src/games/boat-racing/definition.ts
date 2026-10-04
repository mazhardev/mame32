import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'boat-racing',
  title: 'Boat Racing',
  category: 'racing',
  difficulty: 'medium',
  icon: '🚤',
  tags: ['water', 'laps', 'ai', 'boats', 'racing'],
  short: 'Powerboat racing round a buoy-marked lagoon — slide through the turns and leave a wake.',
  full: 'Race powerboats round a lagoon course marked by orange and yellow buoys. Boats do not grip like cars: they carry their momentum and slide wide through every turn, so you must start turning early and feather the throttle. Three laps against three rival boats.',
  minutes: 4,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['↑ throttle, ↓ reverse', '← → steer'],
    mouse: ['Hold the button: the boat heads towards the pointer'],
    touch: ['Direction pad, or hold the screen to steer towards your finger'],
  },
  instructions: {
    objective: 'Win the three-lap lagoon race.',
    howToPlay: [
      'Stay between the buoys: open water outside is slow and the shore stops you.',
      'Boats slide, so begin each turn well before the buoy line bends.',
      'Bumping another boat pushes both of you off line.',
    ],
    scoring: '1st 1,000, 2nd 600, 3rd 400, 4th 200.',
    difficultyNotes: 'Higher difficulty gives rivals faster boats and tighter lines.',
    tips: ['Ease off the throttle mid-turn to let the boat swing round.', 'Use your rivals’ wakes as a guide to the racing line.'],
    touchNotes: ['Holding the screen drives towards your finger; let go to coast.'],
  },
  achievements: [
    ['podium', 'Making Waves', 'Finish in the top three.', 1, '🌊', 10],
    ['win', 'Lagoon Champion', 'Win a race.', 1, '🚤', 20],
    ['hard', 'Admiral', 'Win on Hard.', 1, '🏆', 30],
    ['races', 'Old Salt', 'Complete 20 races.', 20, '🎖️', 25],
  ],
  load: () => import('./BoatRacingGame'),
});
