import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'shop-simulator',
  title: 'Shop Simulator',
  category: 'strategy',
  difficulty: 'easy',
  icon: '🏪',
  tags: ['shop', 'pricing', 'stock', 'economy', 'simulation', 'save'],
  short: 'Stock the shelves, set your prices and keep customers happy for two weeks.',
  full: 'Run a corner shop for fourteen days. Each morning, check the weather, restock from the wholesaler and set your prices; then open up and watch customers come in one by one. Price too high and people walk out grumbling, run out of stock and your reputation suffers, buy too much bread and it goes stale. Heatwaves sell ice cream, rainy days sell newspapers and coffee. Reinvest in bigger shelves, a chiller, a wider range and a shop sign, and hit your takings goal.',
  minutes: 12,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab between buttons; Enter or Space to press'],
    mouse: ['Click +5 or Fill to restock, − and + to change prices'],
    touch: ['Tap +5 or Fill to restock, − and + to change prices'],
  },
  instructions: {
    objective: 'Have the goal amount of cash at the end of day 14.',
    howToPlay: [
      'In the morning, restock each item (“Fill” buys roughly what you need today) and adjust prices.',
      'Press “Open the shop” and watch customers come in with their shopping lists.',
      'Customers pay up to a little above the fair price — how much more depends on the difficulty.',
      'Fresh food spoils: bread after 2 days, milk after 3, newspapers overnight.',
      'Happy customers raise your reputation, which brings more people in.',
    ],
    scoring: 'Your score is the cash you have at the end of the fortnight.',
    difficultyNotes:
      'Easy: 100 coins to start, shoppers tolerate higher prices, goal 2,400. Normal: 80 coins, goal 2,000. Hard: 60 coins, price-sensitive shoppers, goal 1,700.',
    tips: [
      'Check tomorrow’s forecast before stocking up on ice cream or coffee.',
      'A small markup earns more per item; a big one empties the shop.',
      'The chiller pays for itself if you sell a lot of bread and milk.',
      'Weekends are busier.',
    ],
    touchNotes: ['On a phone each product row stacks so every button stays easy to tap.'],
  },
  achievements: [
    ['bumper', 'Bumper Day', 'Take 300 coins in a single day.', 1, '💰', 15],
    ['happy', 'Service with a Smile', 'Finish a day with no unhappy customers.', 1, '😊', 20],
    ['upgrades', 'Shopfitter', 'Own all four upgrades.', 4, '🛠️', 20],
    ['goal', 'Shopkeeper of the Year', 'Reach the two-week goal.', 1, '🏅', 30],
    ['hard', 'Retail Royalty', 'Reach the goal on Hard.', 1, '👑', 40],
    ['customers', 'Loyal Customers', 'Serve 1,000 customers in total.', 1000, '🛍️', 25],
  ],
  load: () => import('./ShopGame'),
});
