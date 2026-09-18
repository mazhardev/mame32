import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { useIsCoarsePointer } from '@/hooks/usePlatform';
import { formatClock } from '@/utils/format';
import { MinesweeperEngine, PRESETS } from './engine';

const NUMBER_COLOR = [
  'transparent',
  '#3b82f6',
  '#16a34a',
  '#ef4444',
  '#7c3aed',
  '#b45309',
  '#0891b2',
  '#334155',
  '#64748b',
];

export default function MinesweeperGame() {
  const shell = useGameShell();
  const coarse = useIsCoarsePointer();
  const config = PRESETS[shell.difficulty];

  const engineRef = useRef(new MinesweeperEngine(config));
  const [, forceRender] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chords, setChords] = useState(0);
  const [flagsPlaced, setFlagsPlaced] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const repaint = () => forceRender((n) => n + 1);
  const engine = engineRef.current;

  useEffect(() => {
    shell.setCapabilities({ pausable: false });
  }, [shell]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const restart = useCallback(() => {
    stopTimer();
    engineRef.current = new MinesweeperEngine(PRESETS[shell.difficulty]);
    startTimeRef.current = null;
    setElapsed(0);
    setChords(0);
    setFlagsPlaced(0);
    repaint();
  }, [shell.difficulty, stopTimer]);

  useEffect(() => {
    shell.registerRestart(restart);
  }, [shell, restart]);

  useEffect(() => {
    restart();
  }, [shell.difficulty, restart]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      if (startTimeRef.current) setElapsed(Date.now() - startTimeRef.current);
    }, 250);
  }, []);

  const finish = useCallback(
    (won: boolean) => {
      stopTimer();
      const timeMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      const cleared = engineRef.current.revealed;
      const sizeFactor = config.cols * config.rows;
      const timeBonus = won ? Math.max(0, Math.round(sizeFactor * 2 - timeMs / 250)) : 0;
      const score = won ? cleared * 5 + timeBonus : cleared * 2;

      if (won) {
        void reportProgress('mines.first-clear', 1);
        if (shell.difficulty === 'normal') void reportProgress('mines.clear-normal', 1);
        if (shell.difficulty === 'hard') void reportProgress('mines.clear-hard', 1);
        if (shell.difficulty === 'easy' && timeMs < 60_000) void reportProgress('mines.fast-easy', 1);
        if (flagsPlaced === 0) void reportProgress('mines.no-flags', 1);
      }
      void reportProgress('mines.chord', chords);

      shell.endRound({
        score,
        won,
        lost: !won,
        timeMs,
        title: won ? 'Board cleared!' : 'Boom!',
        details: [
          { label: 'Squares cleared', value: String(cleared) },
          { label: 'Board', value: `${config.cols}x${config.rows}, ${config.mines} mines` },
        ],
        mode: shell.difficulty,
      });
    },
    [chords, config, flagsPlaced, shell, stopTimer],
  );

  const handleReveal = useCallback(
    (index: number) => {
      const eng = engineRef.current;
      if (eng.status === 'won' || eng.status === 'lost') return;
      const wasReady = eng.status === 'ready';
      const cell = eng.cells[index];

      if (cell.state === 'revealed' && cell.adjacent > 0) {
        const result = eng.chord(index);
        if (result.revealed > 0 || result.exploded) {
          setChords((c) => c + 1);
          shell.play(result.exploded ? 'explosion' : 'click');
          repaint();
          if (eng.getStatus() === 'lost') finish(false);
          else if (eng.getStatus() === 'won') finish(true);
        }
        return;
      }

      const result = eng.reveal(index);
      if (wasReady && result.revealed > 0) {
        shell.startRound();
        startTimer();
      }
      if (result.exploded) {
        shell.play('explosion');
        shell.vibrate(180);
        repaint();
        finish(false);
        return;
      }
      if (result.revealed > 0) {
        shell.play('click');
        repaint();
        if (eng.getStatus() === 'won') {
          shell.play('levelComplete');
          finish(true);
        }
      }
    },
    [finish, shell, startTimer],
  );

  const handleFlag = useCallback(
    (index: number) => {
      const eng = engineRef.current;
      if (eng.status === 'ready') return;
      const next = eng.toggleFlag(index);
      if (next === null) return;
      if (next === 'flagged') setFlagsPlaced((n) => n + 1);
      shell.play('blip');
      shell.vibrate(12);
      repaint();
    },
    [shell],
  );

  const cellSize = `clamp(20px, ${Math.floor(80 / config.cols)}vw, 38px)`;

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 12, padding: 10 }}>
      <GameHud
        items={[
          { label: 'Mines left', value: engine.minesRemaining },
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Cleared', value: engine.revealed },
        ]}
        extra={
          <div className="row" style={{ gap: 8 }}>
            {coarse && (
              <button
                className={`btn btn-sm${flagMode ? ' btn-primary' : ''}`}
                onClick={() => setFlagMode((v) => !v)}
                aria-pressed={flagMode}
              >
                🚩 Flag mode
              </button>
            )}
            <select
              className="select"
              style={{ width: 'auto' }}
              value={shell.difficulty}
              aria-label="Difficulty"
              onChange={(e) => shell.setDifficulty(e.target.value as 'easy' | 'normal' | 'hard')}
            >
              <option value="easy">Easy 9x9</option>
              <option value="normal">Normal 16x16</option>
              <option value="hard">Hard 24x16</option>
            </select>
          </div>
        }
      />

      <div className="scroll-x" style={{ maxWidth: '100%' }}>
        <div
          role="grid"
          aria-label="Minesweeper board"
          onContextMenu={(e) => e.preventDefault()}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${config.cols}, ${cellSize})`,
            gap: 2,
            padding: 6,
            borderRadius: 10,
            background: 'var(--surface-2)',
            margin: '0 auto',
            width: 'fit-content',
          }}
        >
          {engine.cells.map((cell, i) => {
            const revealed = cell.state === 'revealed';
            const isMine = revealed && cell.mine;
            const exploded = engine.explodedIndex === i;
            return (
              <button
                key={i}
                role="gridcell"
                aria-label={
                  revealed
                    ? cell.mine
                      ? 'mine'
                      : `${cell.adjacent} adjacent mines`
                    : cell.state === 'flagged'
                      ? 'flagged'
                      : cell.state === 'question'
                        ? 'unsure'
                        : 'hidden'
                }
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  if (flagMode) handleFlag(i);
                  else handleReveal(i);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleFlag(i);
                }}
                onPointerDown={() => {
                  if (!coarse) return;
                  longPressRef.current = window.setTimeout(() => {
                    suppressClickRef.current = true;
                    handleFlag(i);
                  }, 420);
                }}
                onPointerUp={() => {
                  if (longPressRef.current) window.clearTimeout(longPressRef.current);
                }}
                onPointerLeave={() => {
                  if (longPressRef.current) window.clearTimeout(longPressRef.current);
                }}
                style={{
                  aspectRatio: '1',
                  borderRadius: 4,
                  border: 'none',
                  background: exploded
                    ? '#ef4444'
                    : revealed
                      ? 'var(--surface)'
                      : 'var(--surface-hover)',
                  boxShadow: revealed ? 'none' : 'inset 0 -2px 0 rgba(0,0,0,0.16)',
                  color: NUMBER_COLOR[cell.adjacent] ?? 'var(--text)',
                  fontWeight: 750,
                  fontSize: `calc(${cellSize} * 0.55)`,
                  display: 'grid',
                  placeItems: 'center',
                  lineHeight: 1,
                }}
              >
                {isMine
                  ? '💣'
                  : cell.state === 'flagged'
                    ? '🚩'
                    : cell.state === 'question'
                      ? '?'
                      : revealed && cell.adjacent > 0
                        ? cell.adjacent
                        : ''}
              </button>
            );
          })}
        </div>
      </div>

      <p className="small muted" style={{ textAlign: 'center' }}>
        {coarse
          ? 'Tap to reveal. Long-press or use Flag mode to flag a square.'
          : 'Left click reveals, right click flags. Click a satisfied number to open its neighbours.'}
      </p>
    </div>
  );
}
