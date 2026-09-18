import { buildDeck, shuffleDeck, blackjackValue } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';
export function outcome(player: Card[], dealer: Card[]): 'win' | 'loss' | 'push' {
  const p = blackjackValue(player).total,
    d = blackjackValue(dealer).total;
  if (p > 21) return 'loss';
  if (d > 21) return 'win';
  if (p === 21 && player.length === 2 && !(d === 21 && dealer.length === 2)) return 'win';
  if (d === 21 && dealer.length === 2 && !(p === 21 && player.length === 2)) return 'loss';
  return p > d ? 'win' : p < d ? 'loss' : 'push';
}
export class BlackjackHand {
  player: Card[] = [];
  dealer: Card[] = [];
  finished = false;
  result: 'win' | 'loss' | 'push' | null = null;
  constructor(private deck = shuffleDeck(buildDeck(1, true))) {
    this.player = [this.draw(), this.draw()];
    this.dealer = [this.draw(), this.draw()];
    if (blackjackValue(this.player).total === 21 || blackjackValue(this.dealer).total === 21)
      this.settle();
  }
  private draw() {
    return this.deck.pop()!;
  }
  hit() {
    if (this.finished) return;
    this.player.push(this.draw());
    if (blackjackValue(this.player).total >= 21) this.stand();
  }
  stand() {
    if (this.finished) return;
    if (blackjackValue(this.player).total <= 21)
      while (blackjackValue(this.dealer).total < 17) this.dealer.push(this.draw());
    this.settle();
  }
  private settle() {
    this.result = outcome(this.player, this.dealer);
    this.finished = true;
  }
  get points() {
    return this.result === 'push'
      ? 50
      : this.result === 'win'
        ? this.player.length === 2 && blackjackValue(this.player).total === 21
          ? 150
          : 100
        : 0;
  }
}
