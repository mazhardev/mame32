import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';
import { VirtualPointsNote } from '../_shared/cards/Bets';
import { compareHands, evaluate5, pokerRank } from '../_shared/cards/poker';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { cpuBets, cpuCalls, discards } from './engine';

const START = 500;
const ANTE = 10;
const BET = { 1: 20, 2: 40 } as const;
const HANDS = 20;
type Phase = 'idle' | 'bet' | 'facing' | 'draw' | 'done' | 'over';

export default function PokerGame() {
  const shell = useGameShell();
  const width = useCardWidth(6, 82);
  const [chips, setChips] = useState({ you: START, cpu: START });
  const [pot, setPot] = useState(0);
  const [deck, setDeck] = useState<Card[]>([]);
  const [you, setYou] = useState<Card[]>([]);
  const [cpu, setCpu] = useState<Card[]>([]);
  const [round, setRound] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [hands, setHands] = useState(0);
  const stats = useRef({ won: 0, bluffWins: 0 });

  const restart = useCallback(() => {
    setChips({ you: START, cpu: START });
    setPot(0);
    setYou([]);
    setCpu([]);
    setPhase('idle');
    setPicked(new Set());
    setNote(null);
    setHands(0);
    stats.current = { won: 0, bluffWins: 0 };
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const endSession = (c: { you: number; cpu: number }, n: number) => {
    setPhase('over');
    const won = c.you > START;
    shell.play(won ? 'levelComplete' : 'gameOver');
    if (c.cpu < ANTE) void reportProgress('poker-vs-computer.bust', 1);
    if (won) void reportProgress('poker-vs-computer.profit', 1);
    shell.endRound({
      score: c.you,
      won,
      lost: c.you < START,
      title: c.cpu < ANTE ? 'You took all the computer’s chips!' : c.you < ANTE ? 'You’re out of chips.' : won ? `Up ${c.you - START} chips after ${n} hands.` : `Finished with ${c.you} chips.`,
      details: [
        { label: 'Hands played', value: String(n) },
        { label: 'Hands won', value: String(stats.current.won) },
      ],
    });
  };

  const settle = (winner: 'you' | 'cpu' | 'split', c: { you: number; cpu: number }, amount: number, text: string) => {
    const next = { ...c };
    if (winner === 'split') {
      next.you += Math.floor(amount / 2);
      next.cpu += amount - Math.floor(amount / 2);
    } else next[winner] += amount;
    setChips(next);
    setPot(0);
    setNote(text);
    const n = hands + 1;
    setHands(n);
    if (winner === 'you') {
      stats.current.won++;
      shell.play('coin');
      void reportProgress('poker-vs-computer.win', stats.current.won);
    } else shell.play(winner === 'cpu' ? 'failure' : 'card');
    if (next.you < ANTE || next.cpu < ANTE || n >= HANDS) endSession(next, n);
    else setPhase('done');
  };

  const deal = () => {
    if ((phase !== 'idle' && phase !== 'done') || shell.paused) return;
    if (hands === 0 && phase === 'idle') shell.startRound();
    const d = shuffleDeck(buildDeck(1, true));
    setYou(d.slice(0, 5));
    setCpu(d.slice(5, 10).map((c) => ({ ...c, faceUp: false })));
    setDeck(d.slice(10));
    const c = { you: chips.you - ANTE, cpu: chips.cpu - ANTE };
    setChips(c);
    setPot(ANTE * 2);
    setRound(1);
    setPicked(new Set());
    setPhase('bet');
    setNote(`You hold ${evaluate5(d.slice(0, 5)).name.toLowerCase()}. Check or bet ${BET[1]}.`);
    shell.play('card');
  };

  const afterBetting = (r: 1 | 2, potNow: number, c: { you: number; cpu: number }) => {
    if (r === 1) {
      setPhase('draw');
      setNote('Choose up to three cards to replace (four if you keep an ace), then Draw.');
      return;
    }
    // Showdown.
    const shown = cpu.map((x) => ({ ...x, faceUp: true }));
    setCpu(shown);
    const a = evaluate5(you);
    const b = evaluate5(shown);
    const cmp = compareHands(a, b);
    if (cmp > 0) {
      if (a.category >= 6) void reportProgress('poker-vs-computer.monster', 1);
      settle('you', c, potNow, `Your ${a.name.toLowerCase()} beats ${b.name.toLowerCase()}! You win ${potNow}.`);
    } else if (cmp < 0) settle('cpu', c, potNow, `Computer’s ${b.name.toLowerCase()} beats your ${a.name.toLowerCase()}.`);
    else settle('split', c, potNow, `Both have ${a.name.toLowerCase()} — the pot is split.`);
  };

  const humanBet = () => {
    if (phase !== 'bet') return;
    const amt = Math.min(BET[round], chips.you, chips.cpu);
    const c = { you: chips.you - amt, cpu: chips.cpu };
    if (cpuCalls(cpu, shell.difficulty)) {
      c.cpu -= amt;
      setChips(c);
      setPot(pot + amt * 2);
      setNote(`Computer calls ${amt}.`);
      shell.play('coin');
      if (round === 1) afterBetting(1, pot + amt * 2, c);
      else afterBetting(2, pot + amt * 2, c);
    } else {
      const weak = evaluate5(you).category === 0;
      if (weak) stats.current.bluffWins++;
      if (weak) void reportProgress('poker-vs-computer.bluff', 1);
      settle('you', c, pot + amt, 'Computer folds. You take the pot.');
    }
  };

  const humanCheck = () => {
    if (phase !== 'bet') return;
    if (cpuBets(cpu, shell.difficulty) && chips.cpu > 0 && chips.you > 0) {
      const amt = Math.min(BET[round], chips.you, chips.cpu);
      setChips({ ...chips, cpu: chips.cpu - amt });
      setPot(pot + amt);
      setPhase('facing');
      setNote(`Computer bets ${amt}. Call or fold?`);
      shell.play('coin');
    } else {
      setNote('Computer checks.');
      afterBetting(round, pot, chips);
    }
  };

  const call = () => {
    if (phase !== 'facing') return;
    const amt = Math.min(BET[round], chips.you);
    const c = { ...chips, you: chips.you - amt };
    setChips(c);
    setPot(pot + amt);
    afterBetting(round, pot + amt, c);
  };

  const fold = () => {
    if (phase !== 'facing') return;
    settle('cpu', chips, pot, 'You fold. The computer takes the pot.');
  };

  const toggle = (i: number) => {
    if (phase !== 'draw') return;
    const next = new Set(picked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    const keepsAce = you.some((c, k) => !next.has(k) && pokerRank(c) === 14);
    if (next.size > (keepsAce ? 4 : 3)) return;
    setPicked(next);
  };

  const drawCards = () => {
    if (phase !== 'draw') return;
    const d = [...deck];
    const mine = you.map((c, i) => (picked.has(i) ? (d.shift() as Card) : c));
    const theirDiscards = discards(cpu.map((c) => ({ ...c, faceUp: true })));
    const theirs = cpu.map((c, i) => (theirDiscards.includes(i) ? { ...(d.shift() as Card), faceUp: false } : c));
    setYou(mine);
    setCpu(theirs);
    setDeck(d);
    setPicked(new Set());
    setRound(2);
    setPhase('bet');
    setNote(`You drew ${picked.size}; the computer drew ${theirDiscards.length}. You have ${evaluate5(mine).name.toLowerCase()}. Check or bet ${BET[2]}.`);
    shell.play('card');
  };

  const suggestion = phase === 'draw' && shell.difficulty === 'easy' ? discards(you) : [];

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Your chips', value: chips.you },
          { label: 'Computer', value: chips.cpu },
          { label: 'Pot', value: pot },
          { label: 'Hand', value: `${hands}/${HANDS}` },
        ]}
      />
      <StatusBar>{note ?? 'Five-card draw. Deal to start — each hand costs a 10-chip ante.'}</StatusBar>
      <Felt>
        <div className="muted-on-felt">Computer</div>
        <div className="card-row" style={{ minHeight: Math.round(width * 1.45) }}>
          {cpu.map((c) => (
            <PlayingCard key={c.id} card={c} width={width} />
          ))}
        </div>
        <div className="card-row" style={{ minHeight: Math.round(width * 1.45) + 10, paddingTop: 10 }}>
          {you.map((c, i) => (
            <PlayingCard
              key={c.id}
              card={c}
              width={width}
              selected={picked.has(i)}
              dimmed={picked.has(i)}
              onClick={phase === 'draw' ? () => toggle(i) : undefined}
              ariaLabel={phase === 'draw' ? `${c.rank} of ${c.suit}${picked.has(i) ? ', will be replaced' : ''}${suggestion.includes(i) ? ', suggested discard' : ''}` : undefined}
              style={suggestion.includes(i) && !picked.has(i) ? { outline: '2px dashed #facc15', outlineOffset: 2 } : undefined}
            />
          ))}
        </div>
        <div className="muted-on-felt">You {you.length ? `— ${evaluate5(you).name}` : ''}</div>
      </Felt>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {(phase === 'idle' || phase === 'done') && (
          <button type="button" className="btn btn-primary" onClick={deal} disabled={shell.paused}>
            Deal
          </button>
        )}
        {phase === 'bet' && (
          <>
            <button type="button" className="btn" onClick={humanCheck}>
              Check
            </button>
            <button type="button" className="btn btn-primary" onClick={humanBet}>
              Bet {Math.min(BET[round], chips.you, chips.cpu)}
            </button>
          </>
        )}
        {phase === 'facing' && (
          <>
            <button type="button" className="btn btn-primary" onClick={call}>
              Call
            </button>
            <button type="button" className="btn" onClick={fold}>
              Fold
            </button>
          </>
        )}
        {phase === 'draw' && (
          <button type="button" className="btn btn-primary" onClick={drawCards}>
            {picked.size ? `Draw ${picked.size}` : 'Stand pat'}
          </button>
        )}
      </div>
      <VirtualPointsNote />
    </BoardLayout>
  );
}
