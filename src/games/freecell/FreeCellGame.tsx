import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { CardPlaceholder, PlayingCard } from '../_shared/cards/PlayingCard';
import { SUITS, SUIT_SYMBOL } from '../_shared/cards/deck';
import { Cascade, Felt, useCardWidth } from '../_shared/cards/table';
import { autoPlay, deal, hint, isRun, move, won } from './engine';
import type { Dest, FCState, Source } from './engine';

const CELLS = { easy: 4, normal: 4, hard: 3 } as const;

export default function FreeCellGame() {
  const shell = useGameShell();
  const cells = CELLS[shell.difficulty];
  const width = useCardWidth(8, 78, 34);
  const [s, setS] = useState<FCState>(() => deal(cells));
  const [sel, setSel] = useState<Source | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hl, setHl] = useState<{ src: Source; dest: Dest } | null>(null);
  const history = useRef<FCState[]>([]);
  const started = useRef(false);
  const over = useRef(false);
  const usedUndo = useRef(false);
  const seconds = useRef(0);

  const restart = useCallback(() => {
    setS(autoPlay(deal(cells)).state);
    setSel(null);
    setNote(null);
    setHl(null);
    history.current = [];
    started.current = false;
    over.current = false;
    usedUndo.current = false;
    seconds.current = 0;
  }, [cells]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (started.current && !over.current && !shell.paused) seconds.current++;
    }, 1000);
    return () => window.clearInterval(id);
  }, [shell.paused]);

  const commit = (next: FCState) => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    history.current.push(s);
    const auto = shell.difficulty === 'hard' ? { state: next, moved: 0 } : autoPlay(next);
    setS(auto.state);
    setSel(null);
    setHl(null);
    setNote(null);
    shell.play('card');
    if (won(auto.state)) {
      over.current = true;
      shell.play('levelComplete');
      void reportProgress('freecell.win', 1);
      if (!usedUndo.current) void reportProgress('freecell.clean', 1);
      if (cells === 3) void reportProgress('freecell.three', 1);
      const score = Math.max(200, 2500 - auto.state.moves * 10 - seconds.current);
      shell.endRound({
        score,
        won: true,
        title: 'All cards home!',
        details: [
          { label: 'Moves', value: String(auto.state.moves) },
          { label: 'Time', value: `${Math.floor(seconds.current / 60)}:${String(seconds.current % 60).padStart(2, '0')}` },
        ],
      });
    }
  };

  const tryMove = (dest: Dest) => {
    if (!sel || shell.paused || over.current) return false;
    const next = move(s, sel, dest);
    if (next) {
      commit(next);
      return true;
    }
    return false;
  };

  const onCascadeCard = (pile: number, index: number) => {
    if (over.current || shell.paused) return;
    if (sel) {
      if (sel.kind === 'cascade' && sel.pile === pile && sel.index === index) {
        // Clicking the selection again sends it home or to a free cell.
        const card = s.cascades[pile][index];
        if (index === s.cascades[pile].length - 1) {
          if (tryMove({ kind: 'foundation', pile: card.suit })) return;
          const free = s.cells.findIndex((x) => !x);
          if (free >= 0 && tryMove({ kind: 'cell', pile: free })) return;
        }
        setSel(null);
        return;
      }
      if (tryMove({ kind: 'cascade', pile })) return;
    }
    if (isRun(s.cascades[pile], index)) {
      setSel({ kind: 'cascade', pile, index });
      setNote(null);
    } else {
      setSel(null);
      setNote('Only a run of alternating colours in descending order can move together.');
    }
  };

  const onEmptyCascade = (pile: number) => {
    if (!tryMove({ kind: 'cascade', pile }) && sel) setNote('That run is too long for the free space available.');
  };

  const onCell = (pile: number) => {
    if (over.current || shell.paused) return;
    const card = s.cells[pile];
    if (sel) {
      if (sel.kind === 'cell' && sel.pile === pile) {
        if (card && tryMove({ kind: 'foundation', pile: card.suit })) return;
        setSel(null);
        return;
      }
      if (!card && tryMove({ kind: 'cell', pile })) return;
    }
    if (card) setSel({ kind: 'cell', pile });
  };

  const onFoundation = (suit: (typeof SUITS)[number]) => {
    if (!tryMove({ kind: 'foundation', pile: suit }) && sel) setNote('That card can’t go home yet.');
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev || over.current) return;
    usedUndo.current = true;
    setS(prev);
    setSel(null);
    setHl(null);
  };

  const showHint = () => {
    const h = hint(s);
    setHl(h);
    setNote(h ? 'Hint: the highlighted move is available.' : 'No obvious moves — try using a free cell, or undo.');
  };

  const selectedCascade = sel?.kind === 'cascade' ? sel : null;
  const cellW = Math.min(width, 70);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Home', value: `${SUITS.reduce((n, x) => n + s.foundations[x].length, 0)}/52` },
          { label: 'Moves', value: s.moves },
          { label: 'Free cells', value: `${s.cells.filter((x) => !x).length}/${cells}` },
        ]}
      />
      <StatusBar>{note ?? 'Select a card (or run), then its destination. Click a selected card again to send it home.'}</StatusBar>
      <Felt>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }} aria-label="Free cells">
            {s.cells.map((c, i) => (
              <div key={i} style={{ outline: hl?.src.kind === 'cell' && hl.src.pile === i ? '3px solid #facc15' : undefined, borderRadius: 6 }}>
                {c ? (
                  <PlayingCard card={c} width={cellW} selected={sel?.kind === 'cell' && sel.pile === i} onClick={() => onCell(i)} />
                ) : (
                  <button type="button" className="card-empty" style={{ width: cellW, height: Math.round(cellW * 1.45) }} onClick={() => onCell(i)} aria-label={`Free cell ${i + 1}`} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }} aria-label="Foundations">
            {SUITS.map((suit) => {
              const pile = s.foundations[suit];
              const top = pile[pile.length - 1];
              return (
                <div key={suit} onClick={() => onFoundation(suit)} style={{ cursor: sel ? 'pointer' : 'default', outline: hl?.dest.kind === 'foundation' && hl.dest.pile === suit ? '3px solid #facc15' : undefined, borderRadius: 6 }}>
                  {top ? <PlayingCard card={top} width={cellW} ariaLabel={`${suit} foundation`} /> : <CardPlaceholder width={cellW} label={SUIT_SYMBOL[suit]} />}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', width: '100%' }}>
          {s.cascades.map((col, i) => (
            <Cascade
              key={i}
              cards={col}
              width={width}
              maxHeight={Math.max(260, window.innerHeight - 330)}
              isSelected={(k) => !!selectedCascade && selectedCascade.pile === i && k >= selectedCascade.index}
              onPick={(k) => onCascadeCard(i, k)}
              onEmpty={() => onEmptyCascade(i)}
              emptyLabel={`Empty column ${i + 1}`}
              highlight={!!hl && ((hl.src.kind === 'cascade' && hl.src.pile === i) || (hl.dest.kind === 'cascade' && hl.dest.pile === i))}
            />
          ))}
        </div>
      </Felt>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" onClick={undo} disabled={!history.current.length}>
          ↶ Undo
        </button>
        <button type="button" className="btn" onClick={showHint}>
          💡 Hint
        </button>
      </div>
    </BoardLayout>
  );
}
