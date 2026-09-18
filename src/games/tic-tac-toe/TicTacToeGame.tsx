import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import {
  chooseMove,
  emptyBoard,
  isDraw,
  other,
  winner,
  winningLine,
} from './engine';
import type { Board, Mark } from './engine';

type Mode = 'ai' | 'two-player';

const SCORE_MULTIPLIER = { easy: 1, normal: 2, hard: 3 } as const;

export default function TicTacToeGame() {
  const shell = useGameShell();
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState<Mark>('X');
  const [mode, setMode] = useState<Mode>('ai');
  const [finished, setFinished] = useState(false);
  const [streak, setStreak] = useState(0);
  const [tally, setTally] = useState({ wins: 0, losses: 0, draws: 0 });
  const aiTimer = useRef<number | null>(null);
  const startedRef = useRef(false);

  const human: Mark = 'X';
  const line = winningLine(board);

  useEffect(() => {
    shell.setCapabilities({ pausable: false });
  }, [shell]);

  const restart = useCallback(() => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    setBoard(emptyBoard());
    setTurn('X');
    setFinished(false);
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
    (next: Board, winnerMark: Mark | null) => {
      setFinished(true);
      const drew = !winnerMark;
      const playerWon = mode === 'two-player' ? true : winnerMark === human;
      const score = drew
        ? 25 * SCORE_MULTIPLIER[shell.difficulty]
        : playerWon
          ? 100 * SCORE_MULTIPLIER[shell.difficulty]
          : 0;

      if (mode === 'ai') {
        setTally((t) => ({
          wins: t.wins + (winnerMark === human ? 1 : 0),
          losses: t.losses + (winnerMark && winnerMark !== human ? 1 : 0),
          draws: t.draws + (drew ? 1 : 0),
        }));
        const nextStreak = winnerMark === human ? streak + 1 : 0;
        setStreak(nextStreak);
        if (winnerMark === human) {
          void reportProgress('ttt.first-win', 1);
          void reportProgress('ttt.streak-3', nextStreak);
          if (shell.difficulty === 'hard') void reportProgress('ttt.beat-hard', 1);
        }
        if (drew && shell.difficulty === 'hard') void reportProgress('ttt.draw-hard', 1);
      } else {
        void reportProgress('ttt.two-player', 1);
      }

      shell.endRound({
        score,
        won: mode === 'ai' ? winnerMark === human : !!winnerMark,
        lost: mode === 'ai' && !!winnerMark && winnerMark !== human,
        draw: drew,
        title: drew ? 'Draw' : mode === 'two-player' ? `${winnerMark} wins!` : playerWon ? 'You win!' : 'Computer wins',
        details: [
          { label: 'Mode', value: mode === 'ai' ? `vs Computer (${shell.difficulty})` : 'Two players' },
        ],
        mode,
      });
      void next;
    },
    [mode, shell, streak],
  );

  const place = useCallback(
    (index: number) => {
      if (finished || board[index] !== null) return;
      if (mode === 'ai' && turn !== human) return;

      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }

      const next = board.slice();
      next[index] = turn;
      setBoard(next);
      shell.play('click');

      const w = winner(next);
      if (w || isDraw(next)) {
        finish(next, w);
        return;
      }
      setTurn(other(turn));
    },
    [board, finished, finish, mode, shell, turn],
  );

  // The computer replies on a short delay so its move is visible.
  useEffect(() => {
    if (mode !== 'ai' || finished || turn === human) return;
    aiTimer.current = window.setTimeout(() => {
      const move = chooseMove(board.slice(), turn, shell.difficulty);
      if (move === null) return;
      const next = board.slice();
      next[move] = turn;
      setBoard(next);
      shell.play('blip');
      const w = winner(next);
      if (w || isDraw(next)) finish(next, w);
      else setTurn(other(turn));
    }, 380);
    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
  }, [board, finished, mode, shell, turn, finish]);

  const statusText = finished
    ? line
      ? `${board[line[0]]} wins`
      : 'Draw'
    : mode === 'two-player'
      ? `${turn} to play`
      : turn === human
        ? 'Your turn'
        : 'Computer thinking…';

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 14, padding: 12 }}>
      <GameHud
        items={[
          { label: 'Status', value: statusText },
          { label: 'W / L / D', value: `${tally.wins} / ${tally.losses} / ${tally.draws}` },
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
        aria-label="Tic-Tac-Toe board"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          width: 'min(100%, 380px)',
          aspectRatio: '1',
        }}
      >
        {board.map((cell, i) => {
          const inLine = line?.includes(i);
          return (
            <button
              key={i}
              role="gridcell"
              aria-label={`Square ${i + 1}${cell ? `, ${cell}` : ', empty'}`}
              disabled={finished || cell !== null || (mode === 'ai' && turn !== human)}
              onClick={() => place(i)}
              style={{
                borderRadius: 14,
                border: `2px solid ${inLine ? 'var(--brand)' : 'var(--border)'}`,
                background: inLine ? 'var(--brand-soft)' : 'var(--surface-2)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 'clamp(2rem, 9vw, 3.2rem)',
                fontWeight: 700,
                color: cell === 'X' ? 'var(--brand)' : 'var(--warning)',
                transition: 'background 140ms ease, border-color 140ms ease',
                cursor: cell || finished ? 'default' : 'pointer',
              }}
            >
              {cell}
            </button>
          );
        })}
      </div>

      <p className="small muted" style={{ textAlign: 'center', maxWidth: 380 }}>
        {mode === 'two-player'
          ? 'Two players on one device — pass it back and forth.'
          : 'The computer opponent runs entirely in your browser.'}
      </p>
    </div>
  );
}
