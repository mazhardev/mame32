import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'business-simulator',
  title: 'Business Simulator',
  category: 'strategy',
  difficulty: 'medium',
  icon: '💼',
  tags: ['business', 'startup', 'economy', 'management', 'products', 'save'],
  short: 'Run a gadget start-up for three years: develop, launch, price and market your products.',
  full: 'Build a gadget company from a two-person start-up into a business worth millions. Your engineers develop products — launch early and risk being outclassed, or keep polishing while rivals improve every quarter. Pick budget, standard or premium pricing, hire sales and support staff, set a marketing budget, borrow when you must, and react to booms, slumps, glowing reviews and parts shortages. Reach the target company value by the end of year three. All the market data is simulated in your browser.',
  minutes: 15,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab between buttons; Enter or Space to press'],
    mouse: ['Click buttons to launch, price, hire and end the quarter'],
    touch: ['Tap buttons to launch, price, hire and end the quarter'],
  },
  instructions: {
    objective: 'Reach the target company value by the end of quarter 12.',
    howToPlay: [
      'Engineers add R&D points to the current project every quarter. Once it reaches its minimum you can launch it; extra points polish it into a better product.',
      'A product’s quality is fixed at launch. Rivals improve every quarter, so products age.',
      'Choose a price tier for each product: budget sells more, premium earns more per unit but only sells well when quality is far ahead.',
      'Sales staff sell more units; support staff keep older products selling; marketing builds awareness.',
      'Press End quarter to see sales, costs and profit.',
    ],
    scoring:
      'Company value = cash − debt + six times your recent average quarterly profit + the quality of your products. Your score is the final value.',
    difficultyNotes:
      'Easy: 300k to start and slow-moving rivals. Normal: 220k and faster rivals. Hard: 160k and rivals that improve quickly — but a bigger market.',
    tips: [
      'Your first launch only needs to match the best rival; later, aim to beat it clearly.',
      'Move old products to budget pricing before retiring them.',
      'Salaries are your biggest cost before you have sales — hire as revenue grows.',
      'Loans keep you afloat, but interest adds up.',
    ],
    touchNotes: ['Panels stack on a phone; every control is a button.'],
  },
  achievements: [
    ['profit', 'In the Black', 'Make a profit in a quarter.', 1, '📈', 10],
    ['revenue', 'Big Quarter', 'Earn 1,000k revenue in a quarter.', 1, '💵', 20],
    ['hit', 'Category Killer', 'Launch a product 20 quality points ahead of rivals.', 1, '🏆', 20],
    ['team', 'Growing Team', 'Employ 10 people at once.', 10, '👥', 15],
    ['launches', 'Serial Launcher', 'Launch 15 products in total.', 15, '🚀', 20],
    ['goal', 'Unicorn in the Making', 'Reach the target value.', 1, '🦄', 30],
    ['debtfree', 'Debt Free', 'Reach the target with no loan outstanding.', 1, '🏦', 25],
    ['hard', 'Tycoon', 'Reach the target on Hard.', 1, '💼', 40],
  ],
  load: () => import('./BusinessGame'),
});
