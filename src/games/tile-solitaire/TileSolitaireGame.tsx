import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { FACES, deal, findPair, isFree, reshuffle } from './engine';
import type { LayoutName, TileSlot } from './engine';
import './tiles.css';

const LAYOUT: Record<'easy' | 'normal' | 'hard', LayoutName> = { easy: 'pyramid', normal: 'fortress', hard: 'tower' };
const LAYOUT_LABEL: Record<LayoutName, string> = { pyramid: 'Pyramid', fortress: 'Fortress', tower: 'Tower' };
const CLEAR_BONUS: Record<LayoutName, number> = { pyramid: 500, fortress: 1000, tower: 1500 };
// Tints make matching faces easier to spot.
const TINT = ['#fff7ed', '#fef9c3', '#ecfccb', '#e0f2fe', '#f3e8ff', '#ffe4e6'];

export default function TileSolitaireGame() {
  const shell = useGameShell();
  const layout = LAYOUT[shell.difficulty];
  const [tiles, setTiles] = useState<TileSlot[]>(() => deal(layout).tiles);
  const [history, setHistory] = useState<TileSlot[][]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [hint, setHint] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const counters = useRef({ hints: 0, shuffles: 0, total: 0 });
  const started = useRef(false);

  const restart = useCallback(() => {
    const d = deal(layout).tiles;
    setTiles(d);
    setHistory([]);
    setSel(null);
    setHint([]);
    setNote(null);
    setOver(false);
    setElapsed(0);
    counters.current = { hints: 0, shuffles: 0, total: d.length };
    started.current = false;
  }, [layout]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  useEffect(() => {
    if (!started.current || over || shell.paused) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [over, shell.paused, history.length]);

  const free = useMemo(() => new Set(tiles.filter((t) => isFree(tiles, t)).map((t) => t.id)), [tiles]);
  const bounds = useMemo(() => {
    const all = deal(layout).tiles;
    const xs = all.map((t) => t.x);
    const ys = all.map((t) => t.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs) + 2, minY: Math.min(...ys), maxY: Math.max(...ys) + 2 };
  }, [layout]);

  const finish = (left: TileSlot[]) => {
    setOver(true);
    const { hints, shuffles, total } = counters.current;
    const pairs = (total - left.length) / 2;
    const cleared = left.length === 0;
    const score = pairs * 10 + (cleared ? CLEAR_BONUS[layout] + Math.max(0, 600 - elapsed) : 0) - hints * 20 - shuffles * 50;
    shell.play(cleared ? 'levelComplete' : 'gameOver');
    if (cleared) {
      void reportProgress('tile-solitaire.clear', 1);
      if (layout === 'tower') void reportProgress('tile-solitaire.tower', 1);
      if (!hints && !shuffles) void reportProgress('tile-solitaire.pure', 1);
    }
    shell.endRound({
      score: Math.max(0, score),
      won: cleared,
      lost: !cleared,
      title: cleared ? 'Board cleared!' : 'No more matches',
      details: [
        { label: 'Layout', value: LAYOUT_LABEL[layout] },
        { label: 'Pairs', value: String(pairs) },
        { label: 'Time', value: `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` },
      ],
    });
  };

  const onTile = (t: TileSlot) => {
    if (over || shell.paused) return;
    if (!free.has(t.id)) {
      setNote('That tile is blocked — it must have nothing on top and a free left or right side.');
      shell.play('failure');
      return;
    }
    if (!started.current) {
      started.current = true;
      shell.startRound();
      setElapsed(0);
    }
    if (sel === null || sel === t.id) {
      setSel(sel === t.id ? null : t.id);
      setNote(null);
      shell.play('select');
      return;
    }
    const other = tiles.find((o) => o.id === sel);
    if (!other || other.face !== t.face) {
      setSel(t.id);
      shell.play('blip');
      return;
    }
    const left = tiles.filter((o) => o.id !== t.id && o.id !== other.id);
    setHistory([...history, tiles]);
    setTiles(left);
    setSel(null);
    setHint([]);
    setNote(null);
    shell.play('pop');
    if (!left.length) return finish(left);
    if (!findPair(left)) setNote('No matching free pairs left — shuffle the remaining tiles or undo.');
  };

  const undo = () => {
    if (!history.length || over) return;
    setTiles(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setSel(null);
    setHint([]);
    setNote(null);
  };

  const showHint = () => {
    if (over) return;
    const p = findPair(tiles);
    counters.current.hints++;
    if (p) setHint([p[0].id, p[1].id]);
    else setNote('No pairs available — try Shuffle.');
  };

  const shuffle = () => {
    if (over) return;
    counters.current.shuffles++;
    setTiles(reshuffle(tiles));
    setSel(null);
    setHint([]);
    setNote('Tiles shuffled (−50 points).');
    shell.play('whoosh');
  };

  const giveUp = () => {
    if (over || !started.current) return;
    finish(tiles);
  };

  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const ordered = [...tiles].sort((a, b) => a.z - b.z || a.y - b.y || b.x - a.x);
  const stuck = !over && !findPair(tiles);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Tiles', value: tiles.length },
          { label: 'Free pairs', value: countPairs(tiles, free) },
          { label: 'Time', value: `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` },
        ]}
      />
      <StatusBar>{note ?? `${LAYOUT_LABEL[layout]} — match pairs of free tiles`}</StatusBar>
      <div className="ts-board" style={{ ['--span-x' as string]: spanX, ['--span-y' as string]: spanY }}>
        {ordered.map((t) => {
          const isFreeTile = free.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`ts-tile ${isFreeTile ? 'free' : ''} ${sel === t.id ? 'sel' : ''} ${hint.includes(t.id) ? 'hint' : ''}`}
              style={{
                ['--x' as string]: t.x - bounds.minX,
                ['--y' as string]: t.y - bounds.minY,
                ['--z' as string]: t.z,
                background: TINT[t.face % TINT.length],
                zIndex: t.z * 100 + t.y * 2 + (20 - t.x),
              }}
              onClick={() => onTile(t)}
              aria-label={`${FACES[t.face]} tile${isFreeTile ? ', free' : ', blocked'}`}
            >
              <span aria-hidden="true">{FACES[t.face]}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <button type="button" className="btn" onClick={undo} disabled={!history.length || over}>
          ↶ Undo
        </button>
        <button type="button" className="btn" onClick={showHint} disabled={over}>
          💡 Hint
        </button>
        <button type="button" className={`btn ${stuck ? 'btn-primary' : ''}`} onClick={shuffle} disabled={over}>
          🔀 Shuffle
        </button>
        <button type="button" className="btn" onClick={giveUp} disabled={over || !started.current}>
          Finish
        </button>
      </div>
    </BoardLayout>
  );
}

function countPairs(tiles: TileSlot[], free: Set<number>): number {
  const counts = new Map<number, number>();
  for (const t of tiles) if (free.has(t.id)) counts.set(t.face, (counts.get(t.face) ?? 0) + 1);
  let n = 0;
  for (const c of counts.values()) n += Math.floor(c / 2);
  return n;
}
