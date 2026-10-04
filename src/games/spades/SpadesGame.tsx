import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { Card } from '../_shared/cards/deck';
import { Felt, Hand, useCardWidth } from '../_shared/cards/table';
import { TrickTable } from '../_shared/cards/TrickTable';
import type { Play } from '../_shared/cards/tricks';
import { applyBags, chooseCard, legal, newHand, playCard, scoreHand, suggestBid, turnOf } from './engine';
import type { SpadesState } from './engine';

const TARGET = 250;
const NAMES = ['You', 'West', 'North (partner)', 'East'];
type Phase = 'bid' | 'play' | 'trick' | 'handEnd' | 'over';

export default function SpadesGame() {
  const shell = useGameShell();
  const width = useCardWidth(9, 70, 40);
  const [handNo, setHandNo] = useState(1);
  const [s, setS] = useState<SpadesState>(() => newHand(1));
  const [phase, setPhase] = useState<Phase>('bid');
  const [bid, setBid] = useState(3);
  const [shown, setShown] = useState<Play[]>([]);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [bags, setBags] = useState<[number, number]>([0, 0]);
  const [note, setNote] = useState<string | null>(null);
  const started = useRef(false);
  const generation = useRef(0);

  const beginHand = useCallback((n: number) => {
    // The lead passes clockwise each hand, starting with West.
    const h = newHand(n % 4);
    setS(h);
    setBid(suggestBid(h.hands[0]));
    setPhase('bid');
    setShown([]);
    setNote(null);
  }, []);

  const restart = useCallback(() => {
    setHandNo(1);
    setScores([0, 0]);
    setBags([0, 0]);
    started.current = false;
    generation.current++;
    beginHand(1);
  }, [beginHand]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const placeBid = () => {
    if (phase !== 'bid') return;
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    const bids = s.hands.map((h, i) => (i === 0 ? bid : suggestBid(h)));
    setS({ ...s, bids });
    setPhase('play');
    setNote(`Bids — You ${bids[0]}, West ${bids[1]}, North ${bids[2]}, East ${bids[3]}. Your team needs ${bids[0] + bids[2]}.`);
    shell.play('click');
  };

  const endHand = (st: SpadesState) => {
    const bids = st.bids as number[];
    const r = scoreHand(bids, st.tricksWon);
    const next: [number, number] = [0, 0];
    const nextBags: [number, number] = [0, 0];
    for (const t of [0, 1] as const) {
      const a = applyBags(scores[t] + r.team[t], bags[t], r.bags[t]);
      next[t] = a.score;
      nextBags[t] = a.bags;
    }
    setScores(next);
    setBags(nextBags);
    if (r.made[0]) void reportProgress('spades.contract', 1);
    if (r.made[0] && st.tricksWon[0] >= 5) void reportProgress('spades.big', 1);
    const text = `Your team ${r.made[0] ? 'made' : 'missed'} its bid (${r.team[0] >= 0 ? '+' : ''}${r.team[0]}); theirs ${r.made[1] ? 'made' : 'missed'} (${r.team[1] >= 0 ? '+' : ''}${r.team[1]}).`;
    const done = next.some((v) => v >= TARGET) || next.some((v) => v <= -200);
    if (done && next[0] !== next[1]) {
      setPhase('over');
      const won = next[0] > next[1];
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) {
        void reportProgress('spades.win', 1);
        if (shell.difficulty === 'hard') void reportProgress('spades.hard', 1);
      }
      setNote(`${text} Game over.`);
      shell.endRound({
        score: Math.max(0, next[0]) + (won ? 500 : 0),
        won,
        lost: !won,
        title: won ? 'Your team wins!' : 'The other team wins.',
        details: [
          { label: 'Your team', value: String(next[0]) },
          { label: 'Opponents', value: String(next[1]) },
        ],
      });
      return;
    }
    setNote(text);
    setPhase('handEnd');
  };

  const play = useCallback(
    (card: Card) => {
      const seat = turnOf(s);
      const r = playCard(s, card);
      shell.play(card.suit === 'spades' && s.trick.length && s.trick[0].card.suit !== 'spades' ? 'hit' : 'card');
      if (r.winner === null) {
        setS(r.state);
        return;
      }
      setShown([...s.trick, { seat, card }]);
      setS(r.state);
      setPhase('trick');
      setNote(`${NAMES[r.winner]} ${r.winner === 0 ? 'win' : 'wins'} the trick.`);
      const gen = generation.current;
      window.setTimeout(() => {
        if (gen !== generation.current) return;
        setShown([]);
        if (r.state.tricks === 13) endHand(r.state);
        else setPhase('play');
      }, 1000);
    },
    // endHand reads the running totals from this render's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, shell],
  );

  useComputerTurn(phase === 'play' && turnOf(s) !== 0 && !shell.paused, () => chooseCard(s, shell.difficulty), play, `${s.tricks}-${s.trick.length}-${phase}`, 500);

  const myTurn = phase === 'play' && turnOf(s) === 0;
  const legalIds = myTurn ? new Set(legal(s, 0).map((c) => c.id)) : new Set<string>();
  const teamBid = (s.bids[0] ?? 0) + (s.bids[2] ?? 0);
  const teamTook = s.tricksWon[0] + s.tricksWon[2];

  const status =
    phase === 'bid'
      ? `How many tricks will you take?${shell.difficulty === 'easy' ? ` Suggested: ${suggestBid(s.hands[0])}.` : ''} Your partner bids too.`
      : phase === 'play'
        ? `${note ? note + ' ' : ''}${myTurn ? 'Your turn.' : `${NAMES[turnOf(s)]} is playing…`}`
        : (note ?? '');

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Us', value: scores[0] },
          { label: 'Them', value: scores[1] },
          { label: 'Our tricks', value: phase === 'bid' ? '—' : `${teamTook}/${teamBid}` },
          { label: 'Bags', value: bags[0] },
        ]}
      />
      <StatusBar>{status}</StatusBar>
      <Felt>
        <TrickTable
          names={NAMES}
          counts={s.hands.map((h) => h.length)}
          trick={shown.length ? shown : s.trick}
          width={Math.min(width, 58)}
          turn={phase === 'play' ? turnOf(s) : null}
          info={(seat) => (s.bids[seat] === null ? '' : `bid ${s.bids[seat]} · won ${s.tricksWon[seat]}`)}
        />
        <Hand cards={s.hands[0]} width={width} playable={phase === 'bid' ? () => true : (c) => legalIds.has(c.id)} onPick={(c) => myTurn && legalIds.has(c.id) && !shell.paused && play(c)} label="Your hand" />
      </Felt>
      {phase === 'bid' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <label htmlFor="spades-bid">Your bid</label>
          <button type="button" className="btn" onClick={() => setBid(Math.max(1, bid - 1))} aria-label="Lower bid">
            −
          </button>
          <strong id="spades-bid" style={{ minWidth: 28, textAlign: 'center', fontSize: '1.2rem' }}>
            {bid}
          </strong>
          <button type="button" className="btn" onClick={() => setBid(Math.min(13, bid + 1))} aria-label="Raise bid">
            +
          </button>
          <button type="button" className="btn btn-primary" onClick={placeBid}>
            Bid {bid}
          </button>
        </div>
      )}
      {phase === 'handEnd' && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const n = handNo + 1;
            setHandNo(n);
            beginHand(n);
          }}
        >
          Next hand
        </button>
      )}
    </BoardLayout>
  );
}
