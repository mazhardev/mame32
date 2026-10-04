import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { maybeRandom, searchBest } from '../_shared/board/search';
import { PASS, count, flips, initial, isOver, legal, play, reversiGame } from './engine';
import type { ReversiState } from './engine';

const DEPTH = { easy: 1, normal: 3, hard: 6 } as const;
const RANDOM = { easy: 0.35, normal: 0.05, hard: 0 } as const;

export default function ReversiGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const [state, setState] = useState<ReversiState>(initial);
  const [last, setLast] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);

  const restart = useCallback(() => {
    setState(initial());
    setLast(null);
    setMessage(null);
    setOver(false);
    setStarted(false);
  }, []);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const moves = useMemo(() => legal(state.board, state.turn), [state]);
  const aiTurn = mode === 'ai' && state.turn === 2 && !over;

  const finish = useCallback(
    (s: ReversiState) => {
      setOver(true);
      const black = count(s.board, 1);
      const white = count(s.board, 2);
      const winner = black === white ? 0 : black > white ? 1 : 2;
      const text =
        winner === 0 ? `Draw, ${black}–${white}` : mode === 'ai' ? (winner === 1 ? `You win ${black}–${white}!` : `Computer wins ${white}–${black}`) : `${winner === 1 ? 'Black' : 'White'} wins ${Math.max(black, white)}–${Math.min(black, white)}`;
      setMessage(text);
      shell.play(mode === 'ai' && winner !== 1 ? 'gameOver' : 'levelComplete');
      if (mode === 'ai' && winner === 1) {
        void reportProgress('reversi.win', 1);
        if (shell.difficulty === 'hard') void reportProgress('reversi.hard', 1);
        void reportProgress('reversi.discs', black);
      }
      shell.endRound({
        score: mode === 'ai' && winner === 1 ? black * 20 : 0,
        won: mode === 'ai' ? winner === 1 : undefined,
        lost: mode === 'ai' ? winner === 2 : undefined,
        draw: winner === 0,
        title: text,
        details: [
          { label: 'Black', value: String(black) },
          { label: 'White', value: String(white) },
        ],
      });
    },
    [mode, shell],
  );

  const apply = useCallback(
    (move: number) => {
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      let next = play(state, move);
      shell.play(move === PASS ? 'blip' : 'click');
      setLast(move === PASS ? null : move);
      if (isOver(next.board)) {
        setState(next);
        finish(next);
        return;
      }
      // The next player passes automatically if they have no move.
      if (!legal(next.board, next.turn).length) {
        const who = mode === 'ai' ? (next.turn === 1 ? 'You have' : 'The computer has') : `${next.turn === 1 ? 'Black' : 'White'} has`;
        setMessage(`${who} no move — turn passes.`);
        next = play(next, PASS);
      } else {
        setMessage(null);
      }
      setState(next);
    },
    [finish, mode, shell, started, state],
  );

  useComputerTurn(
    aiTurn && !shell.paused,
    () => {
      const best = searchBest(reversiGame, state, DEPTH[shell.difficulty], 700);
      return maybeRandom(moves, best, RANDOM[shell.difficulty]);
    },
    apply,
    state,
  );

  const onSquare = (i: number) => {
    if (over || shell.paused || aiTurn || !moves.includes(i)) return;
    apply(i);
  };

  const status = message ?? (mode === 'ai' ? (state.turn === 1 ? 'Your move (black)' : 'Computer is thinking…') : `${state.turn === 1 ? 'Black' : 'White'} to move`);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: '⚫ Black', value: count(state.board, 1) },
          { label: '⚪ White', value: count(state.board, 2) },
        ]}
      />
      <ModePicker mode={mode} onChange={setMode} disabled={started && !over} />
      <StatusBar>{status}</StatusBar>
      <div className="sq-board" style={{ ['--cells' as string]: 8, gap: 0 }} role="grid" aria-label="Reversi board">
        {state.board.map((d, i) => {
          const canPlay = !aiTurn && !over && moves.includes(i);
          return (
            <button
              key={i}
              type="button"
              className={`sq green ${last === i ? 'last' : ''}`}
              onClick={() => onSquare(i)}
              aria-label={`${String.fromCharCode(97 + (i % 8))}${8 - Math.floor(i / 8)}${d ? (d === 1 ? ', black' : ', white') : canPlay ? `, play here (flips ${flips(state.board, i, state.turn).length})` : ''}`}
            >
              {d !== 0 && <span className={`piece ${d === 1 ? 'stone-black' : 'stone-white'}`} />}
              {canPlay && <span className="hint" style={{ background: state.turn === 1 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)' }} />}
            </button>
          );
        })}
      </div>
    </BoardLayout>
  );
}
