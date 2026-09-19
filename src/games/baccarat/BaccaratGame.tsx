import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import type { Card } from '../_shared/cards/deck';
import { BetControls, VirtualPointsNote } from '../_shared/cards/Bets';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { payout, play, shoe, total } from './engine';
import type { Coup, Side } from './engine';

const START = { easy: 2000, normal: 1000, hard: 500 } as const;
const HANDS = 20;
const LABEL: Record<Side, string> = { player: 'Player', banker: 'Banker', tie: 'Tie' };

export default function BaccaratGame() {
  const shell = useGameShell();
  const start = START[shell.difficulty];
  const width = useCardWidth(7, 70);
  const [cards, setCards] = useState<Card[]>(() => shoe());
  const [bank, setBank] = useState<number>(start);
  const [bet, setBet] = useState(25);
  const [side, setSide] = useState<Side>('player');
  const [coup, setCoup] = useState<Coup | null>(null);
  const [hand, setHand] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const peak = useRef<number>(start);

  const restart = useCallback(() => {
    setCards(shoe());
    setBank(start);
    setCoup(null);
    setHand(0);
    setNote(null);
    setOver(false);
    peak.current = start;
  }, [start]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const finish = (final: number, hands: number) => {
    setOver(true);
    const won = final > start;
    shell.play(won ? 'levelComplete' : 'gameOver');
    if (won) void reportProgress('baccarat.profit', 1);
    void reportProgress('baccarat.double', final >= start * 2 ? 1 : 0);
    shell.endRound({
      score: final,
      won,
      lost: final < start,
      title: final <= 0 ? 'Out of points!' : won ? `You finished up ${final - start} points.` : `You finished with ${final} points.`,
      details: [
        { label: 'Hands played', value: String(hands) },
        { label: 'Peak', value: String(peak.current) },
      ],
    });
  };

  const deal = () => {
    if (over || shell.paused || bet > bank) return;
    if (hand === 0) shell.startRound();
    const src = cards.length < 10 ? shoe() : cards;
    const c = play(src);
    setCards(c.rest);
    setCoup(c);
    const delta = payout(side, bet, c.winner);
    const nb = bank + delta;
    setBank(nb);
    peak.current = Math.max(peak.current, nb);
    const n = hand + 1;
    setHand(n);
    const p = total(c.player);
    const b = total(c.banker);
    setNote(`${LABEL[c.winner]} ${c.winner === 'tie' ? `${p}–${b}` : `wins ${Math.max(p, b)} to ${Math.min(p, b)}`}. ${delta > 0 ? `You win ${delta}.` : delta < 0 ? `You lose ${-delta}.` : 'Your stake is returned.'}`);
    shell.play(delta > 0 ? 'coin' : delta < 0 ? 'failure' : 'card');
    if (side === 'tie' && c.winner === 'tie') void reportProgress('baccarat.tie', 1);
    if ((p >= 8 && c.player.length === 2) || (b >= 8 && c.banker.length === 2)) void reportProgress('baccarat.natural', 1);
    if (nb <= 0 || n >= HANDS) finish(nb, n);
    else if (bet > nb) setBet([100, 50, 25, 10].find((s) => s <= nb) ?? 10);
  };

  const row = (who: 'player' | 'banker', list: Card[]) => (
    <div style={{ textAlign: 'center' }}>
      <div className="muted-on-felt">
        {who === 'player' ? 'Player' : 'Banker'} {list.length ? `— ${total(list)}` : ''}
      </div>
      <div className="card-row" style={{ minHeight: Math.round(width * 1.45) }}>
        {list.map((c) => (
          <PlayingCard key={c.id} card={c} width={width} />
        ))}
      </div>
    </div>
  );

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Points', value: bank },
          { label: 'Hand', value: `${hand}/${HANDS}` },
          { label: 'Stake', value: bet },
        ]}
      />
      <StatusBar>{note ?? 'Choose Player, Banker or Tie, pick a stake and deal.'}</StatusBar>
      <Felt>
        <div className="card-row" style={{ gap: 28 }}>
          {row('player', coup?.player ?? [])}
          {row('banker', coup?.banker ?? [])}
        </div>
      </Felt>
      <div className="seg" role="radiogroup" aria-label="Bet on">
        {(['player', 'banker', 'tie'] as Side[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={side === s} className={side === s ? 'on' : ''} onClick={() => setSide(s)} disabled={over}>
            {LABEL[s]} {s === 'tie' ? '(8:1)' : s === 'banker' ? '(0.95:1)' : '(1:1)'}
          </button>
        ))}
      </div>
      <BetControls bank={bank} bet={bet} onBet={setBet} disabled={over} />
      <button type="button" className="btn btn-primary" onClick={deal} disabled={over || shell.paused || bet > bank}>
        Deal
      </button>
      <VirtualPointsNote />
    </BoardLayout>
  );
}
