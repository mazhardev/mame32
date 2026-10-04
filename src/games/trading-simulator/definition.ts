import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'trading-simulator',
  title: 'Trading Simulator',
  category: 'strategy',
  difficulty: 'medium',
  icon: '💹',
  tags: ['simulation', 'trading', 'economy', 'fictional data', 'save', 'ships'],
  short: 'Buy low, sail far, sell high: trade goods between five ports in one season.',
  full: 'Captain a merchant ship among five invented ports. Each port makes some goods cheaply and pays well for others — grain from Saltmere, silk from Brightharbour, spice from Ambercove — and festivals, droughts and gluts shake the markets. Your own trades move prices too, so the biggest cargo is not always the best. Pay your crew, enlarge your hold and reach the gold target before the season ends.',
  minutes: 12,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to ports and market buttons; Enter to choose'],
    mouse: ['Click market buttons to trade; click a port on the chart to sail'],
    touch: ['Tap market buttons to trade; tap a port to sail'],
  },
  instructions: {
    objective: 'Have the target amount of gold when the season ends.',
    howToPlay: [
      'Buy a good where it is cheap (green buy price) and sell it where it is wanted.',
      'Voyages take days; every day costs wages for your crew.',
      'Every unit you buy nudges the price up, and every unit you sell nudges it down.',
      'News of festivals and gluts appears in the log — use it.',
      'A bigger hold lets you carry more on each voyage.',
    ],
    scoring: 'Your score is your final gold plus unsold cargo at 80% of its usual value.',
    difficultyNotes:
      'Easy: 70 days, a 2,500g goal, gentle markets, calm seas and live prices for every port. Normal: 60 days, 2,400g, and you only know prices you have seen. Hard: 60 days, 2,000g, but markets react sharply and storms are frequent.',
    tips: [
      'Short hops with a good margin beat long voyages.',
      'Do not flood one market — split a big cargo between two ports.',
    ],
    touchNotes: ['The chart and market are side by side on wide screens and stacked on phones.'],
  },
  achievements: [
    ['sale', 'Profitable Sale', 'Make a single sale worth 500g.', 500, '💰', 15],
    ['hold', 'Bigger Boat', 'Enlarge your hold to 150.', 1, '⛵', 20],
    ['goal', 'Merchant Prince', 'Reach the season goal.', 1, '👑', 25],
    ['double', 'Trade Empire', 'Finish with twice the goal.', 1, '🏛️', 40],
    ['voyages', 'Old Salt', 'Finish 5 seasons.', 5, '⚓', 20],
    ['hard', 'Storm Rider', 'Reach the goal on Hard.', 1, '🌊', 40],
  ],
  load: () => import('./TradingGame'),
});
