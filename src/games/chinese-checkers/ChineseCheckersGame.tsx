import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { maybeRandom, searchBest } from '../_shared/board/search';
import { CELLS, TARGET, apply, ccGame, initial, legalMoves, movesFrom, winner } from './engine';
import type { CCMove, CCState } from './engine';

const DEPTH = { easy: 1, normal: 2, hard: 3 } as const;
const RANDOM = { easy: 0.3, normal: 0.05, hard: 0 } as const;
const COLORS = { 1: '#ef4444', 2: '#3b82f6' } as const;
const SQ3 = Math.sqrt(3);
const POS = CELLS.map((c) => ({ x: SQ3 * (c.x + c.z / 2), y: 1.5 * c.z }));
const MIN_X = Math.min(...POS.map((p) => p.x)) - 1.2;
const MIN_Y = Math.min(...POS.map((p) => p.y)) - 1.2;
const W = Math.max(...POS.map((p) => p.x)) - MIN_X + 1.2;
const H = Math.max(...POS.map((p) => p.y)) - MIN_Y + 1.2;
const TARGET_SET = { 1: new Set(TARGET[1]), 2: new Set(TARGET[2]) };

export default function ChineseCheckersGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const [state, setState] = useState<CCState>(initial);
  const [sel, setSel] = useState<number | null>(null);
  const [last, setLast] = useState<CCMove | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const restart = useCallback(() => {
    setState(initial());
    setSel(null);
    setLast(null);
    setOver(null);
    setStarted(false);
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const aiTurn = mode === 'ai' && state.turn === 2 && !over;
  const targets = useMemo(() => (sel === null ? [] : movesFrom(state.board, sel)), [sel, state]);

  const play = useCallback(
    (m: CCMove) => {
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const next = apply(state, m);
      setState(next);
      setLast(m);
      setSel(null);
      const a = CELLS[m.from];
      const b = CELLS[m.path[1]];
      shell.play(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z)) === 2 ? 'jump' : 'click');
      if (mode === 'ai' && state.turn === 1 && m.path.length - 1 >= 4) void reportProgress('chinese-checkers.chain', 1);
      const w = winner(next.board);
      if (w || next.plies >= 400) {
        const youWon = mode === 'ai' && w === 1;
        const text = !w
          ? 'Move limit reached — draw.'
          : mode === 'ai'
            ? youWon
              ? 'You filled the far point — you win!'
              : 'The computer got home first.'
            : `${w === 1 ? 'Red' : 'Blue'} wins!`;
        setOver(text);
        shell.play(mode === 'ai' && !youWon ? 'gameOver' : 'levelComplete');
        const yourMoves = Math.ceil(next.plies / 2);
        if (youWon) {
          void reportProgress('chinese-checkers.win', 1);
          if (shell.difficulty === 'hard') void reportProgress('chinese-checkers.hard', 1);
        }
        shell.endRound({
          score: youWon ? Math.max(200, 2000 - yourMoves * 15) : 0,
          won: mode === 'ai' ? youWon : undefined,
          lost: mode === 'ai' ? w === 2 : undefined,
          draw: !w,
          title: text,
          details: [{ label: 'Moves', value: String(yourMoves) }],
        });
      }
    },
    [mode, shell, started, state],
  );

  useComputerTurn(
    aiTurn && !shell.paused,
    () => maybeRandom(legalMoves(state), searchBest(ccGame, state, DEPTH[shell.difficulty], 800), RANDOM[shell.difficulty]),
    play,
    state,
    500,
  );

  const human = mode === 'local' ? state.turn : 1;
  const onCell = (i: number) => {
    if (over || shell.paused || aiTurn) return;
    const m = targets.find((t) => t.to === i);
    if (m) return play(m);
    setSel(state.board[i] === human && sel !== i ? i : null);
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCell(i);
    }
  };

  const inTarget = (p: 1 | 2) => TARGET[p].filter((i) => state.board[i] === p).length;
  const status = over ?? (aiTurn ? 'Computer is thinking…' : mode === 'ai' ? 'Your move (red) — race to the top point' : `${state.turn === 1 ? 'Red' : 'Blue'} to move`);
  const px = (i: number) => POS[i].x - MIN_X;
  const py = (i: number) => POS[i].y - MIN_Y;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: mode === 'ai' ? 'You home' : 'Red home', value: `${inTarget(1)}/10` },
          { label: mode === 'ai' ? 'Computer home' : 'Blue home', value: `${inTarget(2)}/10` },
        ]}
      />
      <ModePicker mode={mode} onChange={setMode} disabled={started && !over} />
      <StatusBar>{status}</StatusBar>
      <svg viewBox={`0 0 ${W.toFixed(2)} ${H.toFixed(2)}`} style={{ width: '100%', maxWidth: 560, touchAction: 'manipulation', userSelect: 'none' }} role="grid" aria-label="Chinese checkers board">
        {CELLS.map((_, i) => {
          const hl = TARGET_SET[1].has(i) ? COLORS[2] : TARGET_SET[2].has(i) ? COLORS[1] : null;
          return hl ? <circle key={`z${i}`} cx={px(i)} cy={py(i)} r={0.95} fill={hl} opacity={0.14} /> : null;
        })}
        {last && <polyline points={last.path.map((i) => `${px(i)},${py(i)}`).join(' ')} fill="none" stroke="#facc15" strokeWidth={0.18} strokeLinejoin="round" opacity={0.8} />}
        {CELLS.map((c, i) => {
          const p = state.board[i];
          const isTarget = targets.some((t) => t.to === i);
          return (
            <g
              key={i}
              role="button"
              tabIndex={p === human || isTarget ? 0 : -1}
              aria-label={`Hole ${c.x},${c.y}${p ? (p === 1 ? ', red' : ', blue') : isTarget ? ', move here' : ''}`}
              onClick={() => onCell(i)}
              onKeyDown={(e) => onKey(e, i)}
              style={{ cursor: p === human || isTarget ? 'pointer' : 'default', outline: 'none' }}
            >
              <circle cx={px(i)} cy={py(i)} r={0.62} fill={p ? COLORS[p as 1 | 2] : 'var(--surface-2)'} stroke={sel === i ? '#facc15' : p ? 'rgba(0,0,0,0.45)' : 'var(--border)'} strokeWidth={sel === i ? 0.2 : 0.07} />
              {isTarget && <circle cx={px(i)} cy={py(i)} r={0.26} fill="#facc15" />}
            </g>
          );
        })}
      </svg>
    </BoardLayout>
  );
}
