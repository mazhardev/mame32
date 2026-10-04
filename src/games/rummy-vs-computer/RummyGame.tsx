import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import { CardPlaceholder, PlayingCard } from '../_shared/cards/PlayingCard';
import { cardLabel } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { arrange, bestDiscard, deal, discardCard, drawFrom, settle, shouldKnock, wantsDiscard } from './engine';
import type { KnockResult, RummyState } from './engine';

const TARGET = 60;
type Phase = 'play' | 'handEnd' | 'over';

export default function RummyGame() {
  const shell = useGameShell();
  const width = useCardWidth(11, 64, 34);
  const [handNo, setHandNo] = useState(1);
  const [s, setS] = useState<RummyState>(() => deal(0));
  const [phase, setPhase] = useState<Phase>('play');
  const [sel, setSel] = useState<string | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [note, setNote] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [justTook, setJustTook] = useState<string | null>(null);
  const started = useRef(false);
  const taken = useRef<Card[]>([]);

  const restart = useCallback(() => {
    setHandNo(1);
    setS(deal(0));
    setPhase('play');
    setSel(null);
    setScores([0, 0]);
    setNote(null);
    setReveal(false);
    started.current = false;
    taken.current = [];
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const begin = () => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
  };

  const conclude = (r: KnockResult | null, finalState: RummyState) => {
    setS(finalState);
    setReveal(true);
    const next: [number, number] = [...scores];
    let text: string;
    if (!r) text = 'The stock ran out — this hand is a draw.';
    else {
      next[r.winner] += r.points;
      const who = r.knocker === 0 ? 'You' : 'The computer';
      text = r.gin
        ? `${who} ${r.knocker === 0 ? 'go' : 'goes'} gin! +${r.points}.`
        : r.undercut
          ? `Undercut! ${r.winner === 0 ? 'You score' : 'The computer scores'} ${r.points}.`
          : `${who} knocked with ${r.deadwood[r.knocker]} and ${r.winner === 0 ? 'you score' : 'scores'} ${r.points}.`;
      if (r.winner === 0 && r.gin) void reportProgress('rummy-vs-computer.gin', 1);
      if (r.winner === 0 && r.undercut) void reportProgress('rummy-vs-computer.undercut', 1);
    }
    setScores(next);
    shell.play(r && r.winner === 0 ? 'success' : 'failure');
    if (next[0] >= TARGET || next[1] >= TARGET) {
      setPhase('over');
      const won = next[0] > next[1];
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) {
        void reportProgress('rummy-vs-computer.win', 1);
        if (shell.difficulty === 'hard') void reportProgress('rummy-vs-computer.hard', 1);
      }
      setNote(`${text} Game over.`);
      shell.endRound({
        score: next[0] * 10 + (won ? 300 : 0),
        won,
        lost: !won,
        title: won ? `You win ${next[0]}–${next[1]}!` : `The computer wins ${next[1]}–${next[0]}.`,
        details: [{ label: 'Hands', value: String(handNo) }],
      });
      return;
    }
    setNote(text);
    setPhase('handEnd');
  };

  const onStock = () => {
    if (phase !== 'play' || s.turn !== 0 || s.step !== 'draw' || shell.paused) return;
    begin();
    if (s.stock.length <= 2) return conclude(null, s);
    const next = drawFrom(s, 'stock');
    setS(next);
    setSel(next.hands[0][next.hands[0].length - 1].id);
    setNote(`You drew ${cardLabel(next.hands[0][next.hands[0].length - 1])}. Now discard a card.`);
    shell.play('card');
  };

  const onDiscardPile = () => {
    if (phase !== 'play' || s.turn !== 0 || s.step !== 'draw' || !s.discard.length || shell.paused) return;
    begin();
    const next = drawFrom(s, 'discard');
    setJustTook(s.discard[s.discard.length - 1].id);
    setS(next);
    setSel(null);
    setNote('Now discard a different card.');
    shell.play('card');
  };

  const finishTurn = (knock: boolean) => {
    const card = s.hands[0].find((c) => c.id === sel);
    if (!card || s.step !== 'discard') return;
    if (card.id === justTook) {
      setNote('You can’t throw back the card you just picked up.');
      return;
    }
    setJustTook(null);
    const next = discardCard(s, card);
    setSel(null);
    shell.play('card');
    if (knock) {
      const r = settle(next.hands[0], next.hands[1], 0);
      return conclude(r, next);
    }
    setS(next);
    setNote(null);
  };

  useComputerTurn(
    phase === 'play' && s.turn === 1 && !shell.paused,
    () => true,
    () => {
      if (s.stock.length <= 2) return conclude(null, s);
      const up = s.discard[s.discard.length - 1];
      const take = up && wantsDiscard(s.hands[1], up, shell.difficulty);
      const drawn = drawFrom(s, take ? 'discard' : 'stock');
      const choice = bestDiscard(drawn.hands[1], shell.difficulty === 'hard' ? taken.current : []);
      const after = discardCard(drawn, choice.card);
      const dead = arrange(after.hands[1]).points;
      const knock = shouldKnock(dead, after.stock.length, shell.difficulty);
      setNote(`Computer ${take ? `took ${cardLabel(up)}` : 'drew from the stock'} and discarded ${cardLabel(choice.card)}.${knock ? ' It knocks!' : ''}`);
      shell.play('card');
      if (knock) return conclude(settle(after.hands[1], after.hands[0], 1), after);
      setS(after);
    },
    `${s.turn}-${s.discard.length}-${s.stock.length}-${phase}`,
    800,
  );

  // Track discards you pick up, so Hard avoids feeding you.
  useEffect(() => {
    if (s.turn === 1 && s.step === 'draw') taken.current = s.hands[0].slice(-1);
  }, [s]);

  const nextHand = () => {
    const n = handNo + 1;
    setHandNo(n);
    setS(deal((n % 2 === 1 ? 0 : 1) as 0 | 1));
    setPhase('play');
    setSel(null);
    setReveal(false);
    setNote(n % 2 === 0 ? 'The computer starts this hand.' : null);
  };

  const mine = arrange(s.hands[0]);
  const ordered = [...mine.melds.flat(), ...mine.deadwood.sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank)];
  const inMeld = new Set(mine.melds.flat().map((c) => c.id));
  const selected = s.hands[0].find((c) => c.id === sel);
  const deadAfter = selected ? arrange(s.hands[0].filter((c) => c.id !== selected.id)).points : null;
  const theirs = arrange(s.hands[1]);
  const up = s.discard[s.discard.length - 1];
  const myDraw = phase === 'play' && s.turn === 0 && s.step === 'draw';
  const myDiscard = phase === 'play' && s.turn === 0 && s.step === 'discard';

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'You', value: scores[0] },
          { label: 'Computer', value: scores[1] },
          { label: 'Your deadwood', value: mine.points },
          { label: 'Game to', value: TARGET },
        ]}
      />
      <StatusBar>{note ?? (myDraw ? 'Draw from the stock or take the top discard.' : myDiscard ? 'Choose a card to discard.' : phase === 'play' ? 'Computer is thinking…' : '')}</StatusBar>
      <Felt>
        <div className="card-row" style={{ gap: 3 }} aria-label="Computer's hand">
          {(reveal ? [...theirs.melds.flat(), ...theirs.deadwood] : s.hands[1]).map((c) => (
            <PlayingCard key={c.id} card={{ ...c, faceUp: reveal }} width={Math.round(width * 0.7)} dimmed={reveal && theirs.deadwood.includes(c)} />
          ))}
        </div>
        <div className="card-row" style={{ gap: 18 }}>
          <PlayingCard card={{ id: 'stock', suit: 'spades', rank: 1, faceUp: false }} width={Math.max(width, 48)} onClick={myDraw ? onStock : undefined} ariaLabel={`Stock (${s.stock.length} cards) — draw`} />
          {up ? <PlayingCard card={up} width={Math.max(width, 48)} onClick={myDraw ? onDiscardPile : undefined} ariaLabel={`Discard pile: ${cardLabel(up)} — take it`} /> : <CardPlaceholder width={Math.max(width, 48)} />}
        </div>
        <div className="card-row" style={{ gap: 3, paddingTop: 10 }} aria-label="Your hand (melds first)">
          {ordered.map((c) => (
            <div key={c.id} style={{ borderBottom: inMeld.has(c.id) ? '3px solid #facc15' : '3px solid transparent', paddingBottom: 2 }}>
              <PlayingCard card={c} width={width} selected={sel === c.id} onClick={myDiscard ? () => setSel(c.id) : undefined} />
            </div>
          ))}
        </div>
        <div className="muted-on-felt">Cards underlined in gold are in melds. Deadwood: {mine.points}</div>
      </Felt>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {myDiscard && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => finishTurn(false)} disabled={!selected}>
              Discard {selected ? cardLabel(selected) : ''}
            </button>
            <button type="button" className="btn" onClick={() => finishTurn(true)} disabled={deadAfter === null || deadAfter > 10}>
              {deadAfter === 0 ? 'Gin!' : `Knock${deadAfter !== null && deadAfter <= 10 ? ` (${deadAfter})` : ''}`}
            </button>
          </>
        )}
        {phase === 'handEnd' && (
          <button type="button" className="btn btn-primary" onClick={nextHand}>
            Next hand
          </button>
        )}
      </div>
    </BoardLayout>
  );
}
