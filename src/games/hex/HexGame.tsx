import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { chooseMove, winningChain } from './engine';
import type { Cell } from './engine';

const SIZES = { easy: 7, normal: 9, hard: 11 } as const;
const SQ3 = Math.sqrt(3);
const RED = '#e5484d';
const BLUE = '#3b82f6';
const HEX_POINTS = [-90, -30, 30, 90, 150, 210]
  .map((a) => `${(Math.cos((a * Math.PI) / 180) * 0.97).toFixed(3)},${(Math.sin((a * Math.PI) / 180) * 0.97).toFixed(3)}`)
  .join(' ');

export default function HexGame() {
  const shell = useGameShell();
  const n = SIZES[shell.difficulty];
  const [mode, setMode] = useState<PlayMode>('ai');
  const [board, setBoard] = useState<Cell[]>(() => Array(n * n).fill(0));
  const [turn, setTurn] = useState<1 | 2>(1);
  const [chain, setChain] = useState<number[]>([]);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [last, setLast] = useState<number | null>(null);

  const restart = useCallback(() => {
    setBoard(Array(n * n).fill(0));
    setTurn(1);
    setChain([]);
    setOver(false);
    setStarted(false);
    setLast(null);
  }, [n]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const aiTurn = mode === 'ai' && turn === 2 && !over;
  const placed = useMemo(() => board.filter((c) => c === 1).length, [board]);

  const apply = useCallback(
    (i: number) => {
      if (board[i] || over || board.length !== n * n) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const next = [...board];
      next[i] = turn;
      setBoard(next);
      setLast(i);
      shell.play('click');
      const win = winningChain(next, n, turn);
      if (!win) {
        setTurn(turn === 1 ? 2 : 1);
        return;
      }
      setOver(true);
      setChain(win);
      const youWon = mode === 'ai' && turn === 1;
      const stones = next.filter((c) => c === turn).length;
      const title = mode === 'ai' ? (youWon ? 'You connected your edges!' : 'The computer connected first.') : `${turn === 1 ? 'Red' : 'Blue'} wins!`;
      shell.play(mode === 'ai' && !youWon ? 'gameOver' : 'levelComplete');
      if (youWon) {
        void reportProgress('hex.win', 1);
        if (shell.difficulty === 'hard') void reportProgress('hex.hard', 1);
        if (stones <= n + 2) void reportProgress('hex.direct', 1);
      }
      shell.endRound({
        score: youWon ? Math.max(100, n * 150 - stones * 10) : 0,
        won: mode === 'ai' ? youWon : undefined,
        lost: mode === 'ai' ? !youWon : undefined,
        title,
        details: [
          { label: 'Board', value: `${n}×${n}` },
          { label: 'Stones used', value: String(stones) },
        ],
      });
    },
    [board, mode, n, over, shell, started, turn],
  );

  useComputerTurn(aiTurn && !shell.paused, () => chooseMove(board, n, 2, shell.difficulty), apply, board, 400);

  const onCell = (i: number) => {
    if (over || shell.paused || aiTurn || board[i]) return;
    apply(i);
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCell(i);
    }
  };

  const pos = (r: number, c: number) => [SQ3 * (c + r / 2) + 1.8, 1.5 * r + 1.8] as const;
  const [x0] = pos(0, 0);
  const [x1] = pos(0, n - 1);
  const [xl, yb] = pos(n - 1, 0);
  const [xr] = pos(n - 1, n - 1);
  const width = xr + 1.8;
  const height = yb + 1.8;
  const top = 1.8 - 1.25;
  const bottom = yb + 1.25;

  const status = over
    ? mode === 'ai'
      ? turn === 1
        ? 'You win!'
        : 'Computer wins.'
      : `${turn === 1 ? 'Red' : 'Blue'} wins!`
    : mode === 'ai'
      ? turn === 1
        ? 'Your move — connect red top to bottom'
        : 'Computer is thinking…'
      : `${turn === 1 ? 'Red (top–bottom)' : 'Blue (left–right)'} to move`;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Board', value: `${n}×${n}` },
          { label: 'Red stones', value: placed },
        ]}
      />
      <ModePicker mode={mode} onChange={setMode} disabled={started && !over} />
      <StatusBar>{status}</StatusBar>
      <svg
        viewBox={`0 0 ${width.toFixed(2)} ${height.toFixed(2)}`}
        style={{ width: '100%', maxWidth: 720, touchAction: 'manipulation', userSelect: 'none' }}
        role="grid"
        aria-label={`Hex board, ${n} by ${n}`}
      >
        <g strokeWidth={0.45} strokeLinecap="round">
          <line x1={x0 - 0.9} y1={top} x2={x1 + 0.9} y2={top} stroke={RED} />
          <line x1={xl - 0.9} y1={bottom} x2={xr + 0.9} y2={bottom} stroke={RED} />
          <line x1={x0 - 1.3} y1={top + 0.4} x2={xl - 1.3} y2={bottom - 0.4} stroke={BLUE} />
          <line x1={x1 + 1.3} y1={top + 0.4} x2={xr + 1.3} y2={bottom - 0.4} stroke={BLUE} />
        </g>
        {board.map((cell, i) => {
          const r = Math.floor(i / n);
          const c = i % n;
          const [x, y] = pos(r, c);
          const inChain = chain.includes(i);
          return (
            <g
              key={i}
              transform={`translate(${x.toFixed(3)} ${y.toFixed(3)})`}
              role="button"
              tabIndex={cell || over ? -1 : 0}
              aria-label={`Row ${r + 1}, column ${c + 1}${cell ? (cell === 1 ? ', red' : ', blue') : ''}`}
              onClick={() => onCell(i)}
              onKeyDown={(e) => onKey(e, i)}
              style={{ cursor: cell || over ? 'default' : 'pointer', outline: 'none' }}
            >
              <polygon
                points={HEX_POINTS}
                fill={cell === 1 ? RED : cell === 2 ? BLUE : 'var(--surface-2)'}
                stroke={inChain ? '#ffd84d' : 'var(--border)'}
                strokeWidth={inChain ? 0.16 : 0.06}
              />
              {last === i && !over && <circle r={0.22} fill="rgba(255,255,255,0.85)" />}
            </g>
          );
        })}
      </svg>
    </BoardLayout>
  );
}
