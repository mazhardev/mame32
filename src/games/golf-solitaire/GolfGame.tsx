import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import { Cascade, Felt, useCardWidth } from '../_shared/cards/table';
import { canPlay, deal, flip, play, remaining, stuck } from './engine';
import type { GolfState } from './engine';

// Easy: wrap K–A and allow plays on Kings. Normal: plays on Kings. Hard: traditional.
const RULES = { easy: { wrap: true, king: false }, normal: { wrap: false, king: false }, hard: { wrap: false, king: true } } as const;

export default function GolfGame() {
  const shell = useGameShell();
  const { wrap, king } = RULES[shell.difficulty];
  const width = useCardWidth(7, 72);
  const [s, setS] = useState<GolfState>(deal);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const history = useRef<GolfState[]>([]);
  const started = useRef(false);

  const restart = useCallback(() => {
    setS(deal());
    setNote(null);
    setOver(false);
    history.current = [];
    started.current = false;
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, wrap, king]);

  const finish = (st: GolfState) => {
    setOver(true);
    const left = remaining(st);
    const win = left === 0;
    shell.play(win ? 'levelComplete' : 'gameOver');
    if (win) void reportProgress('golf-solitaire.win', 1);
    if (left <= 5) void reportProgress('golf-solitaire.close', 1);
    if (win && shell.difficulty === 'hard') void reportProgress('golf-solitaire.hard', 1);
    shell.endRound({
      // Like golf, fewer is better — but the site stores higher-is-better, so invert.
      score: (35 - left) * 20 + st.stock.length * 30,
      won: win,
      lost: !win,
      title: win ? 'Hole in one — every column cleared!' : `${left} card${left === 1 ? '' : 's'} left`,
      details: [
        { label: 'Cards left (your “strokes”)', value: String(left) },
        { label: 'Stock unused', value: String(st.stock.length) },
      ],
    });
  };

  const commit = (next: GolfState) => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    history.current.push(s);
    setS(next);
    if (!remaining(next) || stuck(next, wrap, king)) finish(next);
  };

  const onColumn = (i: number) => {
    if (over || shell.paused) return;
    const r = play(s, i, wrap, king);
    if (!r) {
      setNote(king && s.waste[s.waste.length - 1]?.rank === 13 ? 'Nothing can go on a King — flip from the stock.' : 'Play a card one higher or lower than the waste card.');
      shell.play('failure');
      return;
    }
    setNote(null);
    shell.play('card');
    commit(r);
  };

  const onStock = () => {
    if (over || shell.paused) return;
    const r = flip(s);
    if (r) {
      shell.play('card');
      setNote(null);
      commit(r);
    }
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev || over) return;
    setS(prev);
  };

  const top = s.waste[s.waste.length - 1];

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Cards left', value: remaining(s) },
          { label: 'Stock', value: s.stock.length },
        ]}
      />
      <StatusBar>{note ?? 'Play the bottom card of any column if it is one higher or lower than the waste card.'}</StatusBar>
      <Felt>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {s.columns.map((col, i) => (
            <Cascade
              key={i}
              cards={col}
              width={width}
              onPick={(k) => (k === col.length - 1 ? onColumn(i) : undefined)}
              highlight={!over && canPlay(s, i, wrap, king) && shell.difficulty === 'easy'}
            />
          ))}
        </div>
        <div className="card-row" style={{ gap: 16 }}>
          {s.stock.length ? (
            <PlayingCard card={{ ...s.stock[0], faceUp: false }} width={width} onClick={onStock} ariaLabel={`Flip a stock card (${s.stock.length} left)`} />
          ) : (
            <div className="card-empty" style={{ width, height: Math.round(width * 1.45) }} />
          )}
          {top && <PlayingCard card={top} width={width} />}
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
