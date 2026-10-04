import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import {
  COLS,
  ROWS,
  chooseColumn,
  drop,
  emptyGrid,
  isFull,
  legalColumns,
  opponent,
  winner,
  winningCells,
} from './engine';
import type { Disc, Grid } from './engine';

type Mode = 'ai' | 'two-player';

const DISC_COLOR: Record<Disc, string> = { 1: '#ef4444', 2: '#facc15' };
const SCORE_MULTIPLIER = { easy: 1, normal: 2, hard: 3 } as const;

export default function ConnectFourGame() {
  const shell = useGameShell();
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [turn, setTurn] = useState<Disc>(1);
  const [mode, setMode] = useState<Mode>('ai');
  const [finished, setFinished] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const aiTimer = useRef<number | null>(null);
  const startedRef = useRef(false);

  const human: Disc = 1;
  const win = winningCells(grid);

  useEffect(() => {
    shell.setCapabilities({ pausable: false });
  }, [shell]);

  const restart = useCallback(() => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    setGrid(emptyGrid());
    setTurn(1);
    setFinished(false);
    setMoves(0);
    startedRef.current = false;
  }, []);

  useEffect(() => {
    shell.registerRestart(restart);
  }, [shell, restart]);

  useEffect(
    () => () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    },
    [],
  );

  const finish = useCallback(
    (nextGrid: Grid, winnerDisc: Disc | null, totalMoves: number) => {
      setFinished(true);
      const drew = !winnerDisc;
      const playerWon = mode === 'two-player' ? true : winnerDisc === human;
      const speedBonus = winnerDisc ? Math.max(0, 42 - totalMoves) * 3 : 0;
      const score = drew
        ? 25 * SCORE_MULTIPLIER[shell.difficulty]
        : playerWon
          ? (100 + speedBonus) * SCORE_MULTIPLIER[shell.difficulty]
          : 0;

      if (mode === 'ai') {
        const nextStreak = winnerDisc === human ? streak + 1 : 0;
        setStreak(nextStreak);
        if (winnerDisc === human) {
          void reportProgress('c4.first-win', 1);
          void reportProgress('c4.streak-3', nextStreak);
          if (shell.difficulty === 'hard') void reportProgress('c4.beat-hard', 1);
          if (totalMoves <= 15) void reportProgress('c4.fast-win', 1);
          const cells = winningCells(nextGrid);
          if (cells) {
            const rows = cells.map((c) => Math.floor(c / COLS));
            const cols = cells.map((c) => c % COLS);
            const diagonal = new Set(rows).size > 1 && new Set(cols).size > 1;
            if (diagonal) void reportProgress('c4.diagonal', 1);
          }
        }
      } else {
        void reportProgress('c4.two-player', 1);
      }

      shell.endRound({
        score,
        won: mode === 'ai' ? winnerDisc === human : !!winnerDisc,
        lost: mode === 'ai' && !!winnerDisc && winnerDisc !== human,
        draw: drew,
        title: drew
          ? 'Draw — board full'
          : mode === 'two-player'
            ? `${winnerDisc === 1 ? 'Red' : 'Yellow'} wins!`
            : playerWon
              ? 'You win!'
              : 'Computer wins',
        details: [
          { label: 'Discs played', value: String(totalMoves) },
          {
            label: 'Mode',
            value: mode === 'ai' ? `vs Computer (${shell.difficulty})` : 'Two players',
          },
        ],
        mode,
      });
    },
    [mode, shell, streak],
  );

  const playColumn = useCallback(
    (col: number) => {
      if (finished) return;
      if (mode === 'ai' && turn !== human) return;
      if (!legalColumns(grid).includes(col)) return;

      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }

      const next = grid.slice();
      drop(next, col, turn);
      const total = moves + 1;
      setGrid(next);
      setMoves(total);
      shell.play('pop');

      const w = winner(next);
      if (w || isFull(next)) {
        finish(next, w, total);
        return;
      }
      setTurn(opponent(turn));
    },
    [finished, finish, grid, mode, moves, shell, turn],
  );

  useEffect(() => {
    if (mode !== 'ai' || finished || turn === human) return;
    aiTimer.current = window.setTimeout(() => {
      const col = chooseColumn(grid.slice(), turn, shell.difficulty);
      if (col === null) return;
      const next = grid.slice();
      drop(next, col, turn);
      const total = moves + 1;
      setGrid(next);
      setMoves(total);
      shell.play('blip');
      const w = winner(next);
      if (w || isFull(next)) finish(next, w, total);
      else setTurn(opponent(turn));
    }, 420);
    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
  }, [finished, grid, mode, moves, shell, turn, finish]);

  const status = finished
    ? win
      ? `${grid[win[0]] === 1 ? 'Red' : 'Yellow'} wins`
      : 'Draw'
    : mode === 'two-player'
      ? `${turn === 1 ? 'Red' : 'Yellow'} to play`
      : turn === human
        ? 'Your turn'
        : 'Computer thinking…';

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 12, padding: 10 }}>
      <GameHud
        items={[
          { label: 'Status', value: status },
          { label: 'Discs', value: moves },
          { label: 'Streak', value: streak },
        ]}
        extra={
          <div className="row" style={{ gap: 8 }}>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={mode}
              aria-label="Game mode"
              onChange={(e) => {
                setMode(e.target.value as Mode);
                restart();
              }}
            >
              <option value="ai">vs Computer</option>
              <option value="two-player">Two Players</option>
            </select>
            {mode === 'ai' && (
              <select
                className="select"
                style={{ width: 'auto' }}
                value={shell.difficulty}
                aria-label="Difficulty"
                onChange={(e) => {
                  shell.setDifficulty(e.target.value as 'easy' | 'normal' | 'hard');
                  restart();
                }}
              >
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            )}
          </div>
        }
      />

      <div
        role="grid"
        aria-label="Connect Four board"
        onMouseLeave={() => setHover(null)}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 'clamp(3px, 1vw, 7px)',
          padding: 'clamp(5px, 1.4vw, 11px)',
          borderRadius: 16,
          background: 'linear-gradient(160deg, #1e3a8a, #1e40af)',
          width: 'min(100%, 520px)',
          aspectRatio: `${COLS} / ${ROWS}`,
        }}
      >
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const col = i % COLS;
          const slot = grid[i];
          const highlighted = win?.includes(i);
          const columnFull = !legalColumns(grid).includes(col);
          return (
            <button
              key={i}
              role="gridcell"
              aria-label={`Column ${col + 1}, row ${Math.floor(i / COLS) + 1}: ${
                slot === 0 ? 'empty' : slot === 1 ? 'red' : 'yellow'
              }`}
              disabled={finished || columnFull || (mode === 'ai' && turn !== human)}
              onMouseEnter={() => setHover(col)}
              onFocus={() => setHover(col)}
              onClick={() => playColumn(col)}
              style={{
                borderRadius: '50%',
                aspectRatio: '1',
                background:
                  slot === 0
                    ? hover === col && !finished
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(8,12,28,0.55)'
                    : DISC_COLOR[slot],
                boxShadow: highlighted
                  ? '0 0 0 3px #fff, 0 0 14px rgba(255,255,255,0.6)'
                  : 'inset 0 2px 5px rgba(0,0,0,0.35)',
                transition: 'background 120ms ease, box-shadow 160ms ease',
                cursor: finished || columnFull ? 'default' : 'pointer',
              }}
            />
          );
        })}
      </div>

      <p className="small muted" style={{ textAlign: 'center' }}>
        Red plays first. Line up four in any direction to win.
      </p>
    </div>
  );
}
