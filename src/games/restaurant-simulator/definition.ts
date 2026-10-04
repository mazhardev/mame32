import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'restaurant-simulator',
  title: 'Restaurant Simulator',
  category: 'strategy',
  difficulty: 'medium',
  icon: '🍽️',
  tags: ['restaurant', 'cooking', 'time management', 'serving', 'simulation', 'upgrades'],
  short: 'Cook, juggle and serve hungry customers before they walk out — five busy days.',
  full: 'Run a little restaurant for a busy week. Customers sit down with an order; start each dish at its station — grill, blender, prep board, soup pot, pizza oven — pick it up when it is ready, and carry it to the table. You only have two hands, hot food burns if you leave it, and every customer’s patience is running out. Tips reward quick service. Spend your takings on faster stoves, comfy chairs, an extra table or a second grill, and hit each day’s goal to stay open.',
  minutes: 10,
  hasSaveState: true,
  hasLevels: true,
  controls: {
    keyboard: ['1–6 tap a station', 'A, S, D, F, G serve a table', 'X empties your hands'],
    mouse: ['Click stations to cook and pick up, click tables to serve'],
    touch: ['Tap stations to cook and pick up, tap tables to serve'],
  },
  instructions: {
    objective: 'Earn each day’s goal for five days in a row.',
    howToPlay: [
      'A customer’s order appears above their table, with a patience bar underneath.',
      'Tap a station to start cooking its dish. When it glows, tap it again to pick the dish up.',
      'Tap a table to serve everything you are holding that it ordered.',
      'Grilled, boiled and baked food burns if left on the station too long — tap a burnt station to clear it.',
      'When a table has all its food, the customer eats, pays and tips, and the table frees up.',
      'Between days, buy upgrades with your cash.',
    ],
    scoring:
      'Each order pays its menu price plus a tip of up to 50%, depending on how much patience the customer had left. Your score is your total takings.',
    difficultyNotes:
      'Easy: patient customers and modest goals. Normal: less patience, higher goals. Hard: four tables, orders of up to three dishes, impatient customers and steep goals.',
    tips: [
      'Start long dishes (pizza, soup) as soon as they are ordered.',
      'Carry two dishes at once to save trips.',
      'A green outline on a table means you are holding something it wants.',
      'Faster stoves and comfy chairs pay for themselves quickly.',
    ],
    touchNotes: ['Tables and stations are large tap targets; there is no dragging.'],
  },
  achievements: [
    ['first', 'Order Up', 'Serve your first customer.', 1, '🍔', 5],
    ['tip', 'Big Tipper', 'Receive a tip of 10 coins or more.', 1, '💰', 15],
    ['perfect', 'Nobody Left Hungry', 'Hit a day’s goal without losing a customer.', 1, '😋', 20],
    ['upgrades', 'Fully Equipped', 'Own all four upgrades.', 4, '🛠️', 20],
    ['win', 'Five-Star Week', 'Survive all five days.', 1, '⭐', 30],
    ['hard', 'Head Chef', 'Survive all five days on Hard.', 1, '👨‍🍳', 40],
    ['served', 'Regulars', 'Serve 200 customers in total.', 200, '🧑‍🤝‍🧑', 25],
  ],
  load: () => import('./RestaurantGame'),
});
