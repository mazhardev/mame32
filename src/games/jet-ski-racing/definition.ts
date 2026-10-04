import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'jet-ski-racing',
  title: 'Jet Ski Racing',
  category: 'racing',
  difficulty: 'medium',
  icon: '🌊',
  tags: ['water', 'endless', 'slalom', 'gates', 'racing'],
  short: 'Slalom a jet ski through buoy gates on choppy water — each gate buys a little more time.',
  full: 'An endless water slalom against the clock. Steer your jet ski between each pair of buoys: every gate you make adds time, every gate you miss takes time away. Jet skis slide, so steering sets where you want to go and the ski drifts there, while a shifting current pushes you sideways. Rocks bring you to a near stop. The course speeds up and the gates narrow as you go.',
  minutes: 3,
  controls: {
    keyboard: ['← → steer', '↑ boost, ↓ ease off'],
    mouse: ['Hold the button: the jet ski steers towards the pointer'],
    touch: ['Hold your finger to the side you want to go, or use the arrows'],
  },
  instructions: {
    objective: 'Pass through as many gates as you can before the clock runs out.',
    howToPlay: [
      'Each gate is a pair of buoys. Pass between them.',
      'A gate adds 2.2 seconds; a missed gate removes 3.',
      'Hitting a rock slows you right down and costs 2 seconds.',
      'Watch the current indicator: the water pushes you left or right.',
    ],
    scoring: '100 points per gate, plus a bonus for consecutive gates.',
    difficultyNotes: 'Higher difficulty starts faster with narrower gates.',
    tips: ['Start steering for the next gate as soon as you pass one.', 'Ease off with ↓ when two gates zigzag hard.'],
    touchNotes: ['Hold your finger where you want the jet ski to go.'],
  },
  achievements: [
    ['gates-30', 'Slalom Star', 'Pass 30 gates in one run.', 30, '🌊', 20],
    ['streak-20', 'In the Groove', 'Pass 20 gates in a row.', 20, '🏆', 30],
    ['total', 'Wave Rider', 'Pass 1,000 gates in total.', 1000, '🎖️', 30],
  ],
  load: () => import('./JetSkiRacingGame'),
});
