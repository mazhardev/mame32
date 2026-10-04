import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';
import { BetControls, VirtualPointsNote } from '../_shared/cards/Bets';
import { evaluate3 } from '../_shared/cards/poker';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { qualifies, settle, shouldPlay } from './engine';

const START = { easy: 1000, normal: 1000, hard: 500 } as const;
const HANDS = 20;
type Phase = 'bet' | 'decide' | 'shown' | 'over';

export default function ThreeCardGame() {
  const shell = useGameShell();
  const start = START[shell.difficulty];
  const width = useCardWidth(7, 80);
  const [bank, setBank] = useState<number>(start);
  const [ante, setAnte] = useState(25);
  const [you, setYou] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>('bet');
  const [hand, setHand] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const wins = useRef(0);

  const restart = useCallback(() => {
    setBank(start);
    setYou([]);
    setDealer([]);
    setPhase('bet');
    setHand(0);
    setNote(null);
    wins.current = 0;
  }, [start]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const deal = () => {
    if ((phase !== 'bet' && phase !== 'shown') || shell.paused || ante * 2 > bank) return;
    if (hand === 0) shell.startRound();
    const d = shuffleDeck(buildDeck(1, true));
    setYou(d.slice(0, 3));
    setDealer(d.slice(3, 6).map((c) => ({ ...c, faceUp: false })));
    setPhase('decide');
    const v = evaluate3(d.slice(0, 3));
    setNote(`You hold ${v.name.toLowerCase()}. Play (bet ${ante} more) or fold?${shell.difficulty === 'easy' ? ` Tip: ${shouldPlay(d.slice(0, 3)) ? 'playing is the better choice.' : 'folding is the better choice.'}` : ''}`);
    shell.play('card');
  };

  const decide = (fold: boolean) => {
    if (phase !== 'decide') return;
    const shown = dealer.map((c) => ({ ...c, faceUp: true }));
    setDealer(shown);
    const r = settle(you, shown, ante, fold);
    const nb = bank + r.net;
    setBank(nb);
    const n = hand + 1;
    setHand(n);
    const dv = evaluate3(shown).name.toLowerCase();
    const text =
      r.outcome === 'fold'
        ? `You folded and lose ${ante}. Dealer had ${dv}.`
        : r.outcome === 'no-qualify'
          ? `Dealer doesn’t qualify (${dv}). Ante pays ${ante}${r.bonus ? ` plus a ${r.bonus} bonus` : ''}.`
          : r.outcome === 'win'
            ? `You beat the dealer’s ${dv}! +${r.net}.`
            : r.outcome === 'lose'
              ? `Dealer’s ${dv} wins. ${r.net}.`
              : `It’s a tie — stakes returned${r.bonus ? `, plus a ${r.bonus} bonus` : ''}.`;
    setNote(text);
    shell.play(r.net > 0 ? 'coin' : r.net < 0 ? 'failure' : 'card');
    if (r.outcome === 'win') {
      wins.current++;
      void reportProgress('three-card-game.wins', wins.current);
    }
    if (r.bonus) void reportProgress('three-card-game.bonus', 1);
    if (evaluate3(you).category >= 4) void reportProgress('three-card-game.trips', 1);
    if (nb < 20 || n >= HANDS) {
      setPhase('over');
      const won = nb > start;
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) void reportProgress('three-card-game.profit', 1);
      shell.endRound({
        score: Math.max(0, nb),
        won,
        lost: nb < start,
        title: nb < 20 ? 'Out of points!' : won ? `Up ${nb - start} points after ${n} hands!` : `Finished with ${nb} points.`,
        details: [
          { label: 'Hands', value: String(n) },
          { label: 'Hands won', value: String(wins.current) },
        ],
      });
    } else {
      setPhase('shown');
      if (ante * 2 > nb) setAnte([100, 50, 25, 10].find((s) => s * 2 <= nb) ?? 10);
    }
  };

  const qualified = phase === 'shown' || phase === 'over' ? qualifies(dealer) : null;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Points', value: bank },
          { label: 'Hand', value: `${hand}/${HANDS}` },
          { label: 'Ante', value: ante },
        ]}
      />
      <StatusBar>{note ?? 'Place an ante and deal. Beat the dealer’s three cards.'}</StatusBar>
      <Felt>
        <div className="muted-on-felt">Dealer {qualified === null ? '' : qualified ? '(qualifies)' : '(does not qualify)'}</div>
        <div className="card-row" style={{ minHeight: Math.round(width * 1.45) }}>
          {dealer.map((c) => (
            <PlayingCard key={c.id} card={c} width={width} />
          ))}
        </div>
        <div className="card-row" style={{ minHeight: Math.round(width * 1.45) }}>
          {you.map((c) => (
            <PlayingCard key={c.id} card={c} width={width} />
          ))}
        </div>
        <div className="muted-on-felt">You {you.length ? `— ${evaluate3(you).name}` : ''}</div>
      </Felt>
      {phase === 'decide' ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={() => decide(false)}>
            Play ({ante})
          </button>
          <button type="button" className="btn" onClick={() => decide(true)}>
            Fold
          </button>
        </div>
      ) : (
        <>
          <BetControls bank={Math.floor(bank / 2)} bet={ante} onBet={setAnte} disabled={phase === 'over'} />
          <button type="button" className="btn btn-primary" onClick={deal} disabled={phase === 'over' || shell.paused || ante * 2 > bank}>
            Deal
          </button>
        </>
      )}
      <VirtualPointsNote />
    </BoardLayout>
  );
}
