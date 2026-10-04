import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { crossStyle, starPoints } from '../_shared/board/grid';
import { SIZE, chooseMove, winningLine } from './engine';
import type { Stone } from './engine';

const STARS = starPoints(SIZE);
const empty = (): Stone[] => Array(SIZE * SIZE).fill(0);

export default function GomokuGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const [board, setBoard] = useState<Stone[]>(empty);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [last, setLast] = useState<number | null>(null);
  const [line, setLine] = useState<number[]>([]);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const restart = useCallback(() => {
    setBoard(empty());
    setTurn(1);
    setLast(null);
    setLine([]);
    setOver(false);
    setStarted(false);
    setMessage(null);
  }, []);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const moveCount = useMemo(() => board.filter(Boolean).length, [board]);
  const aiTurn = mode === 'ai' && turn === 2 && !over;

  const apply = useCallback(
    (i: number) => {
      if (board[i] || over) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const next = [...board];
      next[i] = turn;
      setBoard(next);
      setLast(i);
      shell.play('click');
      const win = winningLine(next, i);
      const stones = next.filter((s) => s === turn).length;
      if (win || next.every(Boolean)) {
        setOver(true);
        setLine(win ?? []);
        const youWon = mode === 'ai' && win && turn === 1;
        const text = !win
          ? 'The board is full — a draw.'
          : mode === 'ai'
            ? turn === 1
              ? 'Five in a row — you win!'
              : 'The computer made five in a row.'
            : `${turn === 1 ? 'Black' : 'White'} wins with five in a row!`;
        setMessage(text);
        shell.play(mode === 'ai' && !youWon ? 'gameOver' : 'levelComplete');
        if (youWon) {
          void reportProgress('gomoku.win', 1);
          if (shell.difficulty === 'hard') void reportProgress('gomoku.hard', 1);
          if (stones <= 12) void reportProgress('gomoku.quick', 1);
        }
        shell.endRound({
          score: youWon ? Math.max(100, 1000 - stones * 20) : 0,
          won: mode === 'ai' ? Boolean(youWon) : undefined,
          lost: mode === 'ai' ? Boolean(win) && turn === 2 : undefined,
          draw: !win,
          title: text,
          details: [{ label: 'Stones placed', value: String(next.filter(Boolean).length) }],
        });
        return;
      }
      setTurn(turn === 1 ? 2 : 1);
    },
    [board, mode, over, shell, started, turn],
  );

  useComputerTurn(aiTurn && !shell.paused, () => chooseMove(board, 2, shell.difficulty), apply, board, 350);

  const onPoint = (i: number) => {
    if (over || shell.paused || aiTurn || board[i]) return;
    apply(i);
  };

  const status =
    message ?? (mode === 'ai' ? (turn === 1 ? 'Your move (black)' : 'Computer is thinking…') : `${turn === 1 ? 'Black' : 'White'} to move`);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Moves', value: moveCount },
          { label: 'To play', value: over ? '—' : turn === 1 ? '⚫' : '⚪' },
        ]}
      />
      <ModePicker mode={mode} onChange={setMode} disabled={started && !over} />
      <StatusBar>{status}</StatusBar>
      <div className="sq-board" style={{ ['--cells' as string]: SIZE, borderRadius: 4 }} role="grid" aria-label="Gomoku board">
        {board.map((s, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          return (
            <button
              key={i}
              type="button"
              className={`sq cross ${last === i ? 'last' : ''} ${line.includes(i) ? 'win-cell' : ''}`}
              style={crossStyle(r, c, SIZE)}
              onClick={() => onPoint(i)}
              aria-label={`Row ${r + 1}, column ${c + 1}${s ? (s === 1 ? ', black' : ', white') : ''}`}
            >
              {s ? <span className={`piece ${s === 1 ? 'stone-black' : 'stone-white'}`} /> : STARS.has(i) ? <span className="star" /> : null}
            </button>
          );
        })}
      </div>
    </BoardLayout>
  );
}
