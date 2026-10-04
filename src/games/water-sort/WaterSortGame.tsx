import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { loadProgress, saveProgress, clearProgress } from '@/storage/StorageService';
import { reportProgress } from '@/achievements/AchievementService';
import { generate, pour, solved, validSave } from './engine';
import type { Tubes } from './engine';
const COLORS = [
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#ca8a04',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#db2777',
];
export default function WaterSortGame() {
  const shell = useGameShell();
  const count = { easy: 3, normal: 5, hard: 7 }[shell.difficulty];
  const [tubes, setTubes] = useState(() => generate(count).tubes);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [candidate, setCandidate] = useState<{ tubes: Tubes; moves: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Choose a source tube, then a destination.');
  const history = useRef<Tubes[]>([]);
  const started = useRef(false);
  const finished = useRef(false);
  const reset = useCallback(() => {
    setTubes(generate(count).tubes);
    setMoves(0);
    setSelected(null);
    setCandidate(null);
    history.current = [];
    started.current = false;
    finished.current = false;
    void clearProgress('water-sort');
  }, [count]);
  useEffect(() => {
    shell.registerRestart(reset);
  }, [shell, reset]);
  useEffect(() => {
    let alive = true;
    void loadProgress('water-sort').then((v) => {
      if (!alive) return;
      if (validSave(v) && !solved(v.tubes)) setCandidate(v);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  function move(to: number) {
    if (shell.paused || loading || candidate || finished.current) return;
    if (selected === null) {
      if (tubes[to].length) setSelected(to);
      return;
    }
    if (selected === to) {
      setSelected(null);
      return;
    }
    const next = pour(tubes, selected, to);
    setSelected(null);
    if (!next) {
      setMessage('Pour only into an empty tube or onto the same color, with space available.');
      shell.play('failure');
      return;
    }
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    history.current.push(tubes);
    setTubes(next);
    setMoves(moves + 1);
    shell.play('pop');
    setMessage('Good pour. Keep matching the colors.');
    if (solved(next)) {
      finished.current = true;
      const score = Math.max(100, (next.length - 2) * 500 - (moves + 1) * 10);
      void clearProgress('water-sort');
      void reportProgress('water-sort.first-win', 1);
      void reportProgress('water-sort.score', score);
      if (next.length >= 9) void reportProgress('water-sort.hard', 1);
      shell.endRound({
        won: true,
        score,
        title: 'Colors sorted!',
        details: [{ label: 'Moves', value: String(moves + 1) }],
      });
    } else
      void saveProgress(
        'water-sort',
        { tubes: next, moves: moves + 1 },
        { label: `${moves + 1} moves · ${next.length - 2} colors` },
      );
  }
  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 16, padding: 14 }}>
      <GameHud
        items={[
          { label: 'Moves', value: moves },
          { label: 'Colors', value: tubes.length - 2 },
        ]}
      />
      {candidate && (
        <div className="card">
          <p>Saved puzzle available</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setTubes(candidate.tubes);
              setMoves(candidate.moves);
              setCandidate(null);
            }}
          >
            Continue game
          </button>{' '}
          <button className="btn" onClick={reset}>
            New puzzle
          </button>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 14,
          width: '100%',
          maxWidth: 620,
        }}
      >
        {tubes.map((tube, i) => (
          <button
            key={i}
            aria-label={`Tube ${i + 1}: ${tube.length ? tube.map((c) => c + 1).join(', ') : 'empty'}, bottom to top`}
            aria-pressed={selected === i}
            disabled={shell.paused || loading || !!candidate}
            onClick={() => move(i)}
            style={{
              display: 'flex',
              flexDirection: 'column-reverse',
              justifyContent: 'flex-start',
              width: 54,
              height: 180,
              padding: 4,
              border: `3px solid ${selected === i ? 'var(--brand)' : 'var(--border)'}`,
              borderTopStyle: 'dashed',
              borderRadius: '4px 4px 22px 22px',
              background: 'var(--surface-2)',
              overflow: 'hidden',
              transform: selected === i ? 'translateY(-7px)' : undefined,
            }}
          >
            {tube.map((color, j) => (
              <span
                key={j}
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  height: 40,
                  flexShrink: 0,
                  width: '100%',
                  background: COLORS[color],
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {color + 1}
              </span>
            ))}
          </button>
        ))}
      </div>
      <button
        className="btn"
        disabled={!history.current.length || shell.paused || finished.current}
        onClick={() => {
          const previous = history.current.pop();
          if (!previous) return;
          setTubes(previous);
          setSelected(null);
          setMoves(moves + 1);
          void saveProgress('water-sort', { tubes: previous, moves: moves + 1 });
        }}
      >
        Undo pour
      </button>
      <p role="status" className="small muted" style={{ textAlign: 'center' }}>
        {loading ? 'Loading saved puzzle…' : message}
      </p>
    </div>
  );
}
