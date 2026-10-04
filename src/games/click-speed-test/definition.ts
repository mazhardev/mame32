import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'click-speed-test',
  title: 'Click Speed Test',
  category: 'casual',
  difficulty: 'easy',
  icon: '👆',
  tags: ['speed', 'measurement', 'quick', 'tap', 'casual'],
  short: 'How many clicks per second can you manage? A CPS test in 5, 10 or 30 seconds.',
  full: 'The classic CPS test. Click or tap the big button as many times as you can before the timer runs out. Your clicks-per-second rate updates live and you get a rank at the end. Choose a quick 5-second sprint, the standard 10 seconds or a 30-second endurance test.',
  minutes: 1,
  controls: {
    keyboard: ['Focus the button with Tab, then press Space or Enter for each click (holding the key does not count)'],
    mouse: ['Click the big button'],
    touch: ['Tap the big button'],
  },
  instructions: {
    objective: 'Click as many times as possible before the time runs out.',
    howToPlay: [
      'Your first click starts the timer.',
      'Keep clicking the button as fast as you can.',
      'When time is up you see your total and clicks per second.',
    ],
    scoring: 'Your score is the number of clicks. CPS is clicks divided by the test length.',
    difficultyNotes: 'Easy: 5-second test. Normal: 10 seconds. Hard: 30 seconds.',
    tips: ['Use two fingers alternately on a trackpad or touch screen.', 'Relax your hand; tension slows you down over 30 seconds.'],
    touchNotes: ['Alternate two fingers for the fastest tapping.'],
  },
  achievements: [
    ['cps-6', 'Quick Clicker', 'Reach 6 clicks per second.', 1, '👆', 15],
    ['cps-9', 'Speed Demon', 'Reach 9 clicks per second.', 1, '🔥', 30],
    ['marathon', 'Endurance', 'Finish a 30-second test.', 1, '⏱️', 15],
    ['clicks', 'Ten Thousand Clicks', 'Click 10,000 times in total.', 10000, '🎖️', 30],
  ],
  load: () => import('./ClickSpeedTestGame'),
});
