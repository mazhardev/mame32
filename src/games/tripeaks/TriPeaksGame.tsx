import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { SLOTS, canPlayAny, cleared, deal, flip, isFree, play } from './engine';
import type { TPState } from './engine';

const WRAP = { easy: true, normal: true, hard: false } as const;

export default function TriPeaksGame() {
  const shell = useGameShell();
  const wrap = WRAP[shell.difficulty];
  const width = useCardWidth(10, 64, 28);
  const h = Math.round(width * 1.45);
  const [s, setS] = useState<TPState>(deal);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const history = useRef<TPState[]>([]);
  const started = useRef(false);

  const restart = useCallback(() => {
    setS(deal());
    setNote(null);
    setOver(false);
    history.current = [];
    started.current = false;
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, wrap]);

  const finish = (st: TPState) => {
    setOver(true);
    const win = cleared(st);
    const score = st.score + (win ? 1000 + st.stock.length * 50 : 0);
    shell.play(win ? 'levelComplete' : 'gameOver');
    if (win) void reportProgress('tripeaks.win', 1);
    void reportProgress('tripeaks.streak', st.bestStreak);
    shell.endRound({
      score,
      won: win,
      lost: !win,
      title: win ? 'All three peaks cleared!' : 'Out of moves',
      details: [
        { label: 'Best streak', value: String(st.bestStreak) },
        { label: 'Cards left', value: String(st.tableau.filter(Boolean).length) },
        { label: 'Stock left', value: String(st.stock.length) },
      ],
    });
  };

  const commit = (next: TPState) => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    history.current.push(s);
    setS(next);
    if (cleared(next)) return finish(next);
    if (!next.stock.length && !canPlayAny(next, wrap)) finish(next);
  };

  const onCard = (i: number) => {
    if (over || shell.paused) return;
    const r = play(s, i, wrap);
    if (!r) {
      setNote(`That card must be one higher or lower than the waste card${wrap ? ' (Kings and Aces connect)' : ''}.`);
      shell.play('failure');
      return;
    }
    shell.play(r.streak >= 5 ? 'coin' : 'card');
    setNote(r.streak >= 3 ? `Streak ×${r.streak}!` : null);
    if (SLOTS[i].y === 0) void reportProgress('tripeaks.peak', 1);
    commit(r);
  };

  const onStock = () => {
    if (over || shell.paused) return;
    const r = flip(s);
    if (!r) return;
    shell.play('card');
    setNote(null);
    commit(r);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev || over) return;
    // Undo costs the streak bonus, so streaks can't be farmed.
    setS({ ...prev, streak: 0 });
  };

  const step = width + 3;
  const top = s.waste[s.waste.length - 1];

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Score', value: s.score },
          { label: 'Streak', value: s.streak },
          { label: 'Stock', value: s.stock.length },
        ]}
      />
      <StatusBar>{note ?? 'Play cards one higher or lower than the waste card. Chain them for streak bonuses.'}</StatusBar>
      <Felt>
        <div style={{ position: 'relative', width: step * 10, height: h * 0.5 * 3 + h }} aria-label="Three peaks">
          {s.tableau.map((card, i) => {
            if (!card) return null;
            const free = isFree(s.tableau, i);
            return (
              <div key={card.id} style={{ position: 'absolute', left: SLOTS[i].x * step, top: SLOTS[i].y * h * 0.5, zIndex: SLOTS[i].y }}>
                <PlayingCard card={{ ...card, faceUp: free }} width={width} onClick={free ? () => onCard(i) : undefined} />
              </div>
            );
          })}
        </div>
        <div className="card-row" style={{ gap: 16, alignItems: 'center' }}>
          {s.stock.length ? (
            <PlayingCard card={{ ...s.stock[0], faceUp: false }} width={Math.max(width, 44)} onClick={onStock} ariaLabel={`Flip a stock card (${s.stock.length} left)`} />
          ) : (
            <div className="card-empty" style={{ width: Math.max(width, 44), height: Math.round(Math.max(width, 44) * 1.45) }} />
          )}
          {top && <PlayingCard card={top} width={Math.max(width, 44)} ariaLabel={`Waste: ${top.rank}`} />}
        </div>
      </Felt>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" onClick={undo} disabled={!history.current.length || over}>
          ↶ Undo
        </button>
        <button type="button" className="btn" onClick={() => finish(s)} disabled={over || !started.current}>
          Finish
        </button>
      </div>
    </BoardLayout>
  );
}
