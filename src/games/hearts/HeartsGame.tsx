import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { Card } from '../_shared/cards/deck';
import { cardLabel } from '../_shared/cards/deck';
import { Felt, Hand, useCardWidth } from '../_shared/cards/table';
import { TrickTable } from '../_shared/cards/TrickTable';
import type { Play } from '../_shared/cards/tricks';
import { applyPass, chooseCard, choosePass, handScores, isQueenSpades, legal, newHand, passOffset, playCard, startPlay, turnOf } from './engine';
import type { HeartsState } from './engine';

const TARGET = 50;
const NAMES = ['You', 'West', 'North', 'East'];
const PASS_NAME = ['', 'left (to West)', 'across (to North)', 'right (to East)'];
type Phase = 'pass' | 'play' | 'trick' | 'handEnd' | 'over';

export default function HeartsGame() {
  const shell = useGameShell();
  const width = useCardWidth(9, 70, 40);
  const [handNo, setHandNo] = useState(1);
  const [s, setS] = useState<HeartsState>(() => newHand());
  const [phase, setPhase] = useState<Phase>('pass');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<Play[]>([]);
  const [totals, setTotals] = useState([0, 0, 0, 0]);
  const [note, setNote] = useState<string | null>(null);
  const started = useRef(false);
  const generation = useRef(0);

  const beginHand = useCallback((n: number) => {
    const fresh = newHand();
    setS(passOffset(n) ? fresh : startPlay(fresh));
    setPhase(passOffset(n) ? 'pass' : 'play');
    setPicked(new Set());
    setShown([]);
    setNote(passOffset(n) ? null : 'No passing this hand.');
  }, []);

  const restart = useCallback(() => {
    setHandNo(1);
    setTotals([0, 0, 0, 0]);
    started.current = false;
    generation.current++;
    beginHand(1);
  }, [beginHand]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const begin = () => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
  };

  const doPass = () => {
    if (phase !== 'pass' || picked.size !== 3) return;
    begin();
    const offset = passOffset(handNo);
    const picks = s.hands.map((h, seat) => (seat === 0 ? h.filter((c) => picked.has(c.id)) : choosePass(h, shell.difficulty)));
    const received = picks[(4 - offset) % 4];
    setS(startPlay({ ...s, hands: applyPass(s.hands, picks, offset) }));
    setPicked(new Set());
    setPhase('play');
    setNote(`You received ${received.map(cardLabel).join(', ')}.`);
    shell.play('card');
  };

  const endHand = (st: HeartsState) => {
    const { add, moon } = handScores(st.taken);
    const t = totals.map((v, i) => v + add[i]);
    setTotals(t);
    if (moon === 0) void reportProgress('hearts.moon', 1);
    if (st.taken[0] === 0) void reportProgress('hearts.clean', 1);
    const text = moon !== null ? `${NAMES[moon]} shot the moon!` : `This hand: ${st.taken.map((p, i) => `${NAMES[i]} ${p}`).join(', ')}.`;
    if (t.some((v) => v >= TARGET)) {
      setPhase('over');
      const best = Math.min(...t);
      const won = t[0] === best;
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) {
        void reportProgress('hearts.win', 1);
        if (shell.difficulty === 'hard') void reportProgress('hearts.hard', 1);
      }
      setNote(`${text} Game over.`);
      shell.endRound({
        score: won ? Math.max(100, (TARGET - t[0]) * 20 + 200) : Math.max(0, (TARGET - t[0]) * 5),
        won,
        lost: !won,
        title: won ? 'You win with the lowest score!' : `${NAMES[t.indexOf(best)]} wins.`,
        details: t.map((v, i) => ({ label: NAMES[i], value: String(v) })),
      });
      return;
    }
    setNote(text);
    setPhase('handEnd');
  };

  const play = useCallback(
    (card: Card) => {
      begin();
      const seat = turnOf(s);
      const r = playCard(s, card);
      shell.play(isQueenSpades(card) ? 'hit' : 'card');
      if (r.winner === null) {
        setS(r.state);
        return;
      }
      // Show the finished trick for a moment before clearing it.
      setShown([...s.trick, { seat, card }]);
      setS(r.state);
      setPhase('trick');
      const pts = r.state.taken[r.winner] - s.taken[r.winner];
      setNote(`${NAMES[r.winner]} ${r.winner === 0 ? 'take' : 'takes'} the trick${pts ? ` (${pts} point${pts > 1 ? 's' : ''})` : ''}.`);
      const gen = generation.current;
      window.setTimeout(() => {
        if (gen !== generation.current) return;
        setShown([]);
        if (r.state.tricks === 13) endHand(r.state);
        else setPhase('play');
      }, 1000);
    },
    // endHand/begin read the latest totals through this render's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, shell],
  );

  useComputerTurn(phase === 'play' && turnOf(s) !== 0 && !shell.paused, () => chooseCard(s, shell.difficulty), play, `${s.tricks}-${s.trick.length}-${phase}`, 500);

  const myTurn = phase === 'play' && turnOf(s) === 0;
  const legalIds = myTurn ? new Set(legal(s, 0).map((c) => c.id)) : new Set<string>();

  const onCard = (c: Card) => {
    if (shell.paused) return;
    if (phase === 'pass') {
      const next = new Set(picked);
      if (next.has(c.id)) next.delete(c.id);
      else if (next.size < 3) next.add(c.id);
      setPicked(next);
      return;
    }
    if (myTurn && legalIds.has(c.id)) {
      setNote(null);
      play(c);
    }
  };

  const nextHand = () => {
    const n = handNo + 1;
    setHandNo(n);
    beginHand(n);
  };

  const status =
    phase === 'pass'
      ? `Choose 3 cards to pass ${PASS_NAME[passOffset(handNo)]}.`
      : phase === 'play'
        ? myTurn
          ? `${note ? note + ' ' : ''}Your turn — play a highlighted card.`
          : `${note ? note + ' ' : ''}${NAMES[turnOf(s)]} is playing…`
        : (note ?? '');

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Hand', value: handNo },
          { label: 'Your score', value: totals[0] },
          { label: 'Points this hand', value: s.taken[0] },
          { label: 'Game to', value: TARGET },
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
          info={(seat) => `${totals[seat]} pts${s.taken[seat] ? ` (+${s.taken[seat]})` : ''}`}
        />
        <Hand
          cards={s.hands[0]}
          width={width}
          selected={(c) => picked.has(c.id)}
          playable={phase === 'pass' ? () => true : (c) => legalIds.has(c.id)}
          onPick={onCard}
          label="Your hand"
        />
      </Felt>
      <div style={{ display: 'flex', gap: 8 }}>
        {phase === 'pass' && (
          <button type="button" className="btn btn-primary" onClick={doPass} disabled={picked.size !== 3}>
            Pass {picked.size}/3
          </button>
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
