import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { CardPlaceholder, PlayingCard } from '../_shared/cards/PlayingCard';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { anyMove, cardAt, cleared, deal, draw, indexOf, isFree, remove, rowOf } from './engine';
import type { Pick, PyramidState } from './engine';

const PASSES = { easy: 3, normal: 2, hard: 1 } as const;

export default function PyramidGame() {
  const shell = useGameShell();
  const maxPasses = PASSES[shell.difficulty];
  const width = useCardWidth(7, 66);
  const h = Math.round(width * 1.45);
  const [s, setS] = useState<PyramidState>(deal);
  const [sel, setSel] = useState<Pick | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const history = useRef<PyramidState[]>([]);
  const started = useRef(false);

  const restart = useCallback(() => {
    setS(deal());
    setSel(null);
    setNote(null);
    setOver(false);
    history.current = [];
    started.current = false;
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, maxPasses]);

  const finish = (st: PyramidState) => {
    setOver(true);
    const win = cleared(st);
    shell.play(win ? 'levelComplete' : 'gameOver');
    if (win) {
      void reportProgress('pyramid-solitaire.win', 1);
      if (st.passes === 1) void reportProgress('pyramid-solitaire.onepass', 1);
    }
    void reportProgress('pyramid-solitaire.cards', st.removed);
    shell.endRound({
      score: st.removed * 10 + (win ? 500 + (maxPasses - st.passes) * 150 : 0),
      won: win,
      lost: !win,
      title: win ? 'Pyramid cleared!' : 'No more moves',
      details: [
        { label: 'Cards removed', value: `${st.removed}/52` },
        { label: 'Passes used', value: `${st.passes}/${maxPasses}` },
      ],
    });
  };

  const commit = (next: PyramidState) => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    history.current.push(s);
    setS(next);
    setSel(null);
    if (cleared(next)) return finish(next);
    const stuck = !anyMove(next) && !next.stock.length && next.passes >= maxPasses;
    if (stuck) finish(next);
  };

  const onPick = (p: Pick) => {
    if (over || shell.paused) return;
    const card = cardAt(s, p);
    if (!card) return;
    if (card.rank === 13) {
      const r = remove(s, p);
      if (r) {
        shell.play('pop');
        setNote('King removed.');
        return commit(r);
      }
    }
    if (sel) {
      const r = remove(s, sel, p);
      if (r) {
        shell.play('pop');
        setNote(null);
        return commit(r);
      }
    }
    setSel(p);
    shell.play('select');
    setNote(`${card.rank === 1 ? 'Ace' : card.rank === 11 ? 'Jack' : card.rank === 12 ? 'Queen' : card.rank} selected — find a card to make 13.`);
  };

  const onStock = () => {
    if (over || shell.paused) return;
    const r = draw(s, maxPasses);
    if (!r) {
      if (!anyMove(s)) finish(s);
      else setNote('No passes left — make the moves you can see.');
      return;
    }
    shell.play('card');
    setSel(null);
    commit(r);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev || over) return;
    setS(prev);
    setSel(null);
  };

  const wasteTop = s.waste[s.waste.length - 1];
  const step = width + 4;
  const boardW = step * 7;
  const isSel = (p: Pick) => !!sel && sel.from === p.from && (p.from !== 'pyramid' || (sel.from === 'pyramid' && sel.index === p.index));

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Pyramid left', value: s.pyramid.filter(Boolean).length },
          { label: 'Stock', value: s.stock.length },
          { label: 'Pass', value: `${s.passes}/${maxPasses}` },
        ]}
      />
      <StatusBar>{note ?? 'Remove pairs that add up to 13. Kings go alone. J = 11, Q = 12, A = 1.'}</StatusBar>
      <Felt>
        <div style={{ position: 'relative', width: boardW, height: h * 0.5 * 6 + h }} aria-label="Pyramid">
          {s.pyramid.map((card, i) => {
            if (!card) return null;
            const r = rowOf(i);
            const c = i - indexOf(r, 0);
            const free = isFree(s.pyramid, i);
            return (
              <div key={card.id} style={{ position: 'absolute', left: (c + (6 - r) / 2) * step, top: r * h * 0.5, zIndex: r }}>
                <PlayingCard card={card} width={width} dimmed={!free} selected={isSel({ from: 'pyramid', index: i })} onClick={free ? () => onPick({ from: 'pyramid', index: i }) : undefined} />
              </div>
            );
          })}
        </div>
        <div className="card-row" style={{ gap: 16 }}>
          {s.stock.length ? (
            <PlayingCard card={{ ...s.stock[s.stock.length - 1], faceUp: false }} width={width} onClick={onStock} ariaLabel={`Draw from stock (${s.stock.length} left)`} />
          ) : (
            <button type="button" className="card-empty" style={{ width, height: h }} onClick={onStock} aria-label="Recycle waste" disabled={s.passes >= maxPasses}>
              {s.passes < maxPasses ? '↺' : ''}
            </button>
          )}
          {wasteTop ? <PlayingCard card={wasteTop} width={width} selected={isSel({ from: 'waste' })} onClick={() => onPick({ from: 'waste' })} /> : <CardPlaceholder width={width} />}
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
