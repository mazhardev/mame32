import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'stock-market-sim',
  title: 'Stock Market Simulator',
  category: 'strategy',
  difficulty: 'medium',
  icon: '📈',
  tags: ['simulation', 'investing', 'fictional data', 'economy', 'save', 'news'],
  short: 'Trade shares in eight invented companies, read the news, and beat the market target.',
  full: 'A stock market simulation with eight fictional companies across tech, food, energy, health and travel. Prices move every trading day with the market’s mood, sector swings and each company’s own story — and news headlines give you a hint of what comes next. Start with $10,000, buy and sell (every trade pays a small fee), and try to grow your portfolio past the target before the final day. All companies and prices are invented and generated in your browser.',
  minutes: 10,
  hasSaveState: true,
  controls: {
    keyboard: ['↑ ↓ choose a company', 'B buy, S sell', 'Enter next day'],
    mouse: [
      'Click a company, set the number of shares, then Buy or Sell; Next day advances the market',
    ],
    touch: ['Tap a company, choose an amount, tap Buy or Sell, then Next day'],
  },
  instructions: {
    objective: 'Finish the last trading day with a net worth above the target return.',
    howToPlay: [
      'Each day, prices move. Green means up since yesterday, red means down.',
      'Headlines affect a company for a few days — good news tends to push the price up.',
      'Every trade costs $5 plus 0.1%, so trading too often eats your profit.',
      'Your net worth is your cash plus the value of the shares you own.',
    ],
    scoring: 'Your score is your final net worth in dollars.',
    difficultyNotes:
      'Easy: 40 days, calmer prices and news you can trust; target +10%. Normal: 60 days, some rumours; target +20%. Hard: 60 days, wild prices and many rumours; target +35%.',
    tips: [
      'Spread your money across sectors to soften bad days.',
      'Act on news early — the move happens over the next few days.',
    ],
    touchNotes: ['Use the Max button to put all your cash into one company.'],
  },
  achievements: [
    ['profit', 'In the Green', 'Finish with a profit.', 1, '📈', 10],
    ['target', 'Beat the Market', 'Reach the target return.', 1, '🎯', 25],
    ['diversified', 'Diversified', 'Hold shares in 5 companies at once.', 1, '🧺', 15],
    ['fifty', 'Wolf of Main Street', 'Finish 50% up.', 1, '🐺', 35],
    ['trades', 'Active Trader', 'Make 100 trades in total.', 100, '🔁', 20],
    ['hard', 'Market Master', 'Reach the target on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./StockMarketGame'),
});
