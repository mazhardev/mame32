import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'clicker-empire',
  title: 'Clicker Empire',
  category: 'strategy',
  difficulty: 'easy',
  icon: '👆',
  tags: ['idle', 'clicker', 'incremental', 'prestige', 'save', 'empire'],
  short: 'Grow a village into an empire of castles and wonders — then start over for crowns.',
  full: 'An incremental empire builder. Collect taxes by hand, then fund peasants, farmsteads, quarries, market towns, guild halls, harbours, castles and grand wonders that fill your treasury every second. When growth slows, start a new dynasty: you keep your Crowns, and every Crown makes everything you earn 50% bigger. Progress saves automatically.',
  minutes: 25,
  hasSaveState: true,
  controls: {
    keyboard: ['Space collects taxes', '1–8 buy buildings'],
    mouse: ['Click the crown; click shop items to buy'],
    touch: ['Tap the crown; tap shop items to buy'],
  },
  instructions: {
    objective: 'Amass the target amount of gold over all your dynasties.',
    howToPlay: [
      'Tap the crown to collect taxes.',
      'Buildings earn gold every second and get pricier as you buy more.',
      'Upgrades unlock as your empire grows and double what buildings earn.',
      'The Crowns tab lets you start over: crowns come from all the gold you have ever earned, and each adds 50% to all income.',
    ],
    scoring: 'Reaching the goal faster scores more.',
    difficultyNotes:
      'Easy: 30 million gold and cheaper buildings. Normal: 300 million. Hard: 3 billion with steeper prices — you will want crowns.',
    tips: [
      'Start over when a reset would at least double your crowns.',
      'Early on, the cheapest building that pays back fastest is best.',
    ],
    touchNotes: ['Rapid taps on the crown speed up the first minutes.'],
  },
  achievements: [
    ['first', 'Village Treasury', 'Earn 1,000 gold.', 1, '🪙', 5],
    ['m', 'Millionaire Monarch', 'Earn 1 million gold.', 1, '💰', 20],
    ['crown', 'New Dynasty', 'Start over for crowns.', 1, '👑', 20],
    ['crowns', 'Crown Collector', 'Hold 10 crowns.', 10, '💎', 30],
    ['castle', 'Castle Builder', 'Own 10 castles.', 10, '🏰', 30],
  ],
  load: () => import('./ClickerEmpireGame'),
});
