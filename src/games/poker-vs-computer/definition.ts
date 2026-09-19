import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'poker-vs-computer',
  title: 'Poker vs Computer',
  category: 'card',
  difficulty: 'hard',
  icon: '♠️',
  tags: ['cards', 'poker', 'five card draw', 'bluff', 'casino style', 'virtual points', 'ai'],
  short: 'Heads-up five-card draw against a computer that bets, calls and bluffs.',
  full: 'Classic five-card draw poker, one on one against a computer opponent, played with virtual chips only. Bet or check, swap up to three cards, bet again and show down. The computer judges its hand, calls your bets and sometimes bluffs. Take all its chips or finish twenty hands ahead.',
  minutes: 10,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to the action buttons and press Enter; during the draw, Enter on a card marks it for replacement'],
    mouse: ['Click actions; click cards to mark them for the draw'],
    touch: ['Tap actions; tap cards to mark them for the draw'],
  },
  instructions: {
    objective: 'Win the computer’s chips — or finish 20 hands with more than your starting 500.',
    howToPlay: [
      'Each hand costs a 10-chip ante. You and the computer get five cards.',
      'First betting round: check, or bet 20. If you check, the computer may bet — then call or fold.',
      'The draw: mark up to three cards to replace (four if you keep an ace) and draw.',
      'Second betting round with 40-chip bets, then the best poker hand wins the pot.',
      'Hands rank: straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, pair, high card.',
    ],
    scoring: 'Your score is the chips you hold when the session ends.',
    difficultyNotes: 'Easy: the computer plays loosely and suggested discards are shown. Normal: it plays solid hands. Hard: it calls lighter and bluffs more often.',
    tips: ['Don’t draw to inside straights.', 'Standing pat can look like a strong hand — useful for bluffing.', 'Fold weak hands when the computer bets after the draw.'],
  },
  achievements: [
    ['win', 'Pot Winner', 'Win 5 pots in one session.', 5, '♠️', 10],
    ['profit', 'In the Money', 'Finish a session with more chips than you started.', 1, '📈', 15],
    ['bluff', 'Poker Face', 'Make the computer fold while holding only high card.', 1, '😐', 15],
    ['monster', 'Monster Hand', 'Win a showdown with a full house or better.', 1, '💎', 20],
    ['bust', 'Cleaned Out', 'Win all of the computer’s chips.', 1, '🏆', 30],
  ],
  load: () => import('./PokerGame'),
});
