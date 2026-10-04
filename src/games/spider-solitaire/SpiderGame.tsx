import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { clearProgress, loadProgress, saveProgress } from '@/storage/StorageService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import { Cascade, Felt, useCardWidth } from '../_shared/cards/table';
import { canMove, deal, dealRow, hint, isRun, move, won } from './engine';
import type { SpiderState } from './engine';

const GAME_ID = 'spider-solitaire';
const SUITS = { easy: 1, normal: 2, hard: 4 } as const;

function validSave(v: unknown): v is SpiderState & { suits: number } {
  const s = v as SpiderState & { suits: number };
  return !!s && Array.isArray(s.columns) && s.columns.length === 10 && Array.isArray(s.stock) && Array.isArray(s.done) && typeof s.moves === 'number';
}

export default function SpiderGame() {
  const shell = useGameShell();
  const suits = SUITS[shell.difficulty];
  const width = useCardWidth(10, 70, 26);
  const [s, setS] = useState<SpiderState>(() => deal(suits));
  const [sel, setSel] = useState<{ col: number; index: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hl, setHl] = useState<{ from: number; to: number } | null>(null);
  const history = useRef<SpiderState[]>([]);
  const started = useRef(false);
  const over = useRef(false);

  const restart = useCallback(() => {
    void clearProgress(GAME_ID);
    setS(deal(suits));
    setSel(null);
    setNote(null);
    setHl(null);
    history.current = [];
    started.current = false;
    over.current = false;
  }, [suits]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  // Resume a saved deal of the same suit count, otherwise deal fresh.
  useEffect(() => {
    let alive = true;
    void loadProgress<SpiderState & { suits: number }>(GAME_ID).then((v) => {
      if (!alive) return;
      if (validSave(v) && v.suits === suits && !won(v)) {
        setS({ columns: v.columns, stock: v.stock, done: v.done, moves: v.moves });
        setNote('Welcome back — your game was restored. Restart for a new deal.');
      } else setS(deal(suits));
      setSel(null);
      history.current = [];
      started.current = false;
      over.current = false;
    });
    return () => {
      alive = false;
    };
  }, [suits]);

  const commit = (r: { state: SpiderState; completed: number }) => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    history.current.push(s);
    setS(r.state);
    setSel(null);
    setHl(null);
    setNote(r.completed ? 'A full suit is complete!' : null);
    shell.play(r.completed ? 'success' : 'card');
    if (r.completed) void reportProgress('spider-solitaire.run', 1);
    if (won(r.state)) {
      over.current = true;
      void clearProgress(GAME_ID);
      shell.play('levelComplete');
      void reportProgress('spider-solitaire.win', 1);
      if (suits === 2) void reportProgress('spider-solitaire.two', 1);
      if (suits === 4) void reportProgress('spider-solitaire.four', 1);
      shell.endRound({
        score: Math.max(100, 500 + 100 * 8 - r.state.moves) * suits,
        won: true,
        title: 'Spider solved!',
        details: [
          { label: 'Suits', value: String(suits) },
          { label: 'Moves', value: String(r.state.moves) },
        ],
      });
    } else {
      void saveProgress(GAME_ID, { ...r.state, suits }, { percent: Math.round((r.state.done.length / 8) * 100), label: `${r.state.done.length}/8 suits · ${suits}-suit` });
    }
  };

  const bestTarget = (col: number, index: number): number | null => {
    const card = s.columns[col][index];
    let any: number | null = null;
    let empty: number | null = null;
    for (let to = 0; to < 10; to++) {
      if (!canMove(s, col, index, to)) continue;
      const t = s.columns[to];
      if (!t.length) {
        if (empty === null) empty = to;
        continue;
      }
      if (t[t.length - 1].suit === card.suit) return to;
      if (any === null) any = to;
    }
    return any ?? (index > 0 ? empty : null);
  };

  const onCard = (col: number, index: number) => {
    if (over.current || shell.paused) return;
    if (sel) {
      if (sel.col === col && sel.index === index) {
        const to = bestTarget(col, index);
        if (to !== null) commit(move(s, col, index, to)!);
        else {
          setSel(null);
          setNote('No place for that run.');
        }
        return;
      }
      if (sel.col !== col) {
        const r = move(s, sel.col, sel.index, col);
        if (r) return commit(r);
      }
    }
    if (isRun(s.columns[col], index)) {
      setSel({ col, index });
      setNote(null);
    } else {
      setSel(null);
      setNote(s.columns[col][index].faceUp ? 'Only a run of one suit in descending order can move.' : 'That card is face down.');
    }
  };

  const onEmpty = (col: number) => {
    if (!sel) return;
    const r = move(s, sel.col, sel.index, col);
    if (r) commit(r);
  };

  const onStock = () => {
    if (over.current || shell.paused) return;
    const r = dealRow(s);
    if (r) commit(r);
    else setNote(s.stock.length ? 'Fill every empty column before dealing a new row.' : 'The stock is empty.');
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev || over.current) return;
    setS(prev);
    setSel(null);
    setHl(null);
  };

  const showHint = () => {
    const h = hint(s);
    setHl(h ? { from: h.from, to: h.to } : null);
    setNote(h ? 'Hint: move from the highlighted column to the other highlighted column.' : s.stock.length ? 'No useful moves — deal a new row.' : 'No useful moves left. Try undoing.');
  };

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Suits done', value: `${s.done.length}/8` },
          { label: 'Moves', value: s.moves },
          { label: 'Deals left', value: s.stock.length / 10 },
        ]}
      />
      <StatusBar>{note ?? `${suits}-suit Spider: build same-suit runs from King down to Ace.`}</StatusBar>
      <Felt>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2 }} aria-label="Completed suits">
            {s.done.map((suit, i) => (
              <PlayingCard key={i} card={{ id: `done${i}`, suit, rank: 13, faceUp: true }} width={Math.round(width * 0.6)} />
            ))}
          </div>
          <div style={{ display: 'flex' }}>
            {Array.from({ length: s.stock.length / 10 }, (_, i) => (
              <div key={i} style={{ marginLeft: i ? -width * 0.75 : 0 }}>
                <PlayingCard card={{ id: `stock${i}`, suit: 'spades', rank: 1, faceUp: false }} width={width} onClick={onStock} ariaLabel={`Deal a new row (${s.stock.length / 10} left)`} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, justifyContent: 'center', width: '100%' }}>
          {s.columns.map((col, i) => (
            <Cascade
              key={i}
              cards={col}
              width={width}
              maxHeight={Math.max(300, window.innerHeight - 300)}
              isSelected={(k) => !!sel && sel.col === i && k >= sel.index}
              onPick={(k) => onCard(i, k)}
              onEmpty={() => onEmpty(i)}
              emptyLabel={`Empty column ${i + 1}`}
              highlight={!!hl && (hl.from === i || hl.to === i)}
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
        <button type="button" className="btn btn-primary" onClick={onStock} disabled={!s.stock.length}>
          Deal row
        </button>
      </div>
    </BoardLayout>
  );
}
