import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'turf-painter',
  title: 'Turf Painter',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🎨',
  tags: ['territory', 'io', 'snake', 'paint', 'vs computer', 'arcade'],
  short: 'Leave your land, draw a loop and come home to claim it, while computer rivals do the same.',
  full: 'A territory-grabbing arcade game in the style of the hit .io games, played offline against computer rivals. You start with a small patch of blue land. Head out and you leave a trail behind you; get back to your land and everything the trail encloses becomes yours. The catch: while you are out, your trail is your weak spot. If a rival runs across it, you are out, and the same goes for them, so cut across a rival’s trail to knock them out. Running off the edge of the map or across your own trail also ends your run. Paint a quarter of the map on Easy, a third on Normal or two fifths on Hard to win. For more snake-style action try [Snake](game:snake), or see all [games against the computer](hub:games-against-computer).',
  minutes: 4,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Arrow keys or WASD to turn', 'P to pause, R to restart'],
    mouse: ['Drag on the map in the direction you want to go'],
    touch: ['Swipe on the map to turn, or use the d-pad'],
  },
  instructions: {
    objective: 'Claim the share of the map shown as the goal before you are knocked out.',
    howToPlay: [
      'You keep moving; you choose when to turn. You cannot turn straight back on yourself.',
      'Outside your land you leave a trail. Get back to your land to turn the trail, and everything it encloses, into land.',
      'If anyone touches your trail while you are out, you are knocked out. Cross a rival’s trail to knock them out.',
      'Running into the edge of the map, or across your own trail, also ends your run.',
      'Knocked-out rivals lose their land and come back a few seconds later.',
    ],
    scoring: '10 points per 1% of the map at your best, plus 150 per rival you knock out.',
    difficultyNotes:
      'Easy: two slow rivals that never chase you; goal 25%. Normal: three rivals that sometimes go for your trail; goal 33%. Hard: four quicker, bolder rivals; goal 40%.',
    tips: [
      'Short, quick loops are safer than big ones.',
      'Watch the rivals before heading out, and go home early if one turns towards your trail.',
      'Rivals are weak while they are out too: cut through their trail for a knockout.',
    ],
    touchNotes: ['Swipe anywhere on the map in the direction you want to turn. The d-pad works as well.'],
  },
  achievements: [
    ['share', 'Landowner', 'Own 20% of the map.', 20, '🗺️', 20],
    ['ko', 'Trail Cutter', 'Knock out a rival.', 1, '✂️', 20],
    ['win', 'Painted the Town', 'Reach the goal on any difficulty.', 1, '🎨', 30],
    ['hard', 'Master Painter', 'Reach the goal on Hard.', 1, '🏆', 50],
  ],
  load: () => import('./TurfPainterGame'),
});
