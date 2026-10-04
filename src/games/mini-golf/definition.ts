import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'mini-golf',
  title: 'Mini Golf',
  category: 'sports',
  difficulty: 'easy',
  icon: '🏌️',
  tags: ['putting', 'aim', 'physics', 'course', 'sports', 'crazy golf'],
  short: 'Putt your way round nine crazy-golf holes with bumpers, sand, water and a windmill.',
  full: 'A nine-hole crazy-golf course. Bank shots off the walls, thread the ball through the turning windmill, avoid the water and climb the uphill slope. Drag back from the ball like a slingshot and let go to putt — the further you pull, the harder you hit. The cup only catches a ball that is rolling gently, so judge the pace as well as the line.',
  minutes: 6,
  hasLevels: true,
  controls: {
    keyboard: ['← → aim (hold X for fine aim)', '↑ ↓ power', 'Space putts'],
    mouse: ['Drag back from the ball and release to putt'],
    touch: ['Drag back from the ball and lift your finger to putt'],
  },
  instructions: {
    objective: 'Finish all nine holes in as few strokes as possible — par for the course is 26.',
    howToPlay: [
      'Pull back away from where you want the ball to go; the arrow shows direction and power.',
      'Walls bounce the ball; red bumpers kick it away with extra speed.',
      'Sand slows the ball sharply. Water costs a stroke and puts the ball back where it was.',
      'The windmill turns all the time — time your putt through the gap.',
    ],
    scoring:
      'Each hole scores 100 points for every stroke under par + 3 (a hole in one on a par 3 earns 500).',
    difficultyNotes:
      'Easy shows the full predicted path and allows 10 strokes per hole. Normal shows an aim arrow and allows 8. Hard shows only a short arrow, spins the windmill faster and stops you after 6 strokes.',
    tips: [
      'Aim at a wall to bank around corners.',
      'A firm putt that would roll just past the cup is ideal.',
    ],
    touchNotes: ['Start your drag anywhere — only the direction and length of the pull matter.'],
  },
  achievements: [
    ['rounds', 'Out on the Course', 'Finish a round.', 1, '⛳', 10],
    ['par', 'Par for the Course', 'Finish a round at par or better.', 1, '🏅', 25],
    ['ace', 'Hole in One', 'Sink a hole with your first putt.', 1, '🎯', 30],
    ['hard', 'Crazy Golf Pro', 'Finish under par on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./MiniGolfGame'),
});
