import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { crossStyle, starPoints } from '../_shared/board/grid';
import { PASS, chooseMove, newGame, play, score } from './engine';
import type { GoState } from './engine';

const KOMI = 7.5;
const LEVEL = {
  easy: { playouts: 250, timeMs: 400 },
  normal: { playouts: 2500, timeMs: 1200 },
  hard: { playouts: 9000, timeMs: 2500 },
} as const;

let seq = 0;

function useGoWorker() {
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    try {
      worker.current = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker.current = null;
    }
    return () => worker.current?.terminate();
  }, []);
  return useCallback(
    (s: GoState, playouts: number, timeMs: number) =>
      new Promise<number>((resolve) => {
        const w = worker.current;
        if (!w) return resolve(chooseMove(s, KOMI, playouts, timeMs));
        const id = ++seq;
        const onMessage = (e: MessageEvent<{ id: number; move: number }>) => {
          if (e.data.id !== id) return;
          w.removeEventListener('message', onMessage);
          resolve(e.data.move);
        };
        w.addEventListener('message', onMessage);
        w.postMessage({ id, n: s.n, board: Array.from(s.board), turn: s.turn, ko: s.ko, komi: KOMI, playouts, timeMs });
      }),
    [],
  );
}

export default function GoGame() {
  const shell = useGameShell();
  const think = useGoWorker();
  const [mode, setMode] = useState<PlayMode>('ai');
  const [size, setSize] = useState(9);
  const n = mode === 'ai' ? 9 : size;
  const [history, setHistory] = useState<GoState[]>(() => [newGame(9)]);
  const [last, setLast] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const started = useRef(false);
  const state = history[history.length - 1];

  const restart = useCallback(() => {
    setHistory([newGame(n)]);
    setLast(null);
    setOver(null);
    setMessage(null);
    setThinking(false);
    started.current = false;
  }, [n]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const finish = useCallback(
    (s: GoState, resignedBy: 1 | 2 | null = null) => {
      const sc = score(s.board, s.n);
      const white = sc.white + KOMI;
      const winner: 1 | 2 = resignedBy ? (resignedBy === 1 ? 2 : 1) : sc.black > white ? 1 : 2;
      const margin = Math.abs(sc.black - white);
      const text = resignedBy
        ? `${resignedBy === 1 ? 'Black' : 'White'} resigned.`
        : mode === 'ai'
          ? winner === 1
            ? `You win by ${margin} points!`
            : `The computer wins by ${margin} points.`
          : `${winner === 1 ? 'Black' : 'White'} wins by ${margin} points.`;
      setOver(text);
      const youWon = mode === 'ai' && winner === 1;
      shell.play(mode === 'ai' && !youWon ? 'gameOver' : 'levelComplete');
      if (youWon) {
        void reportProgress('go.win', 1);
        if (shell.difficulty === 'hard') void reportProgress('go.hard', 1);
        if (margin >= 20) void reportProgress('go.big', 1);
      }
      shell.endRound({
        score: youWon ? Math.round(300 + margin * 10) * (shell.difficulty === 'hard' ? 2 : 1) : 0,
        won: mode === 'ai' ? youWon : undefined,
        lost: mode === 'ai' ? !youWon : undefined,
        title: text,
        details: resignedBy
          ? []
          : [
              { label: 'Black (stones + area)', value: String(sc.black) },
              { label: `White (+${KOMI} komi)`, value: String(white) },
            ],
      });
    },
    [mode, shell],
  );

  const move = useCallback(
    (i: number) => {
      const r = play(state, i);
      if (!r) {
        setMessage(i === state.ko ? 'Ko — you can’t retake immediately. Play elsewhere first.' : 'That move would be suicide.');
        shell.play('failure');
        return false;
      }
      if (!started.current) {
        started.current = true;
        shell.startRound();
      }
      const who = state.turn === 1 ? 'Black' : 'White';
      setHistory((h) => [...h, r.state]);
      setLast(i === PASS ? null : i);
      if (i === PASS) {
        setMessage(`${mode === 'ai' ? (state.turn === 1 ? 'You' : 'The computer') : who} passed.`);
        shell.play('blip');
      } else {
        setMessage(r.captured.length ? `${who} captured ${r.captured.length} stone${r.captured.length > 1 ? 's' : ''}.` : null);
        shell.play(r.captured.length ? 'coin' : 'click');
      }
      if (r.state.passes >= 2) finish(r.state);
      return true;
    },
    [finish, mode, shell, state],
  );

  const aiTurn = mode === 'ai' && state.turn === 2 && !over;

  useEffect(() => {
    if (!aiTurn || shell.paused) return;
    let cancelled = false;
    setThinking(true);
    const snapshot = state;
    const t = window.setTimeout(() => {
      // If you passed and the computer is already ahead, it passes to end the game.
      if (snapshot.passes === 1) {
        const sc = score(snapshot.board, snapshot.n);
        if (sc.white + KOMI > sc.black) {
          setThinking(false);
          move(PASS);
          return;
        }
      }
      const { playouts, timeMs } = LEVEL[shell.difficulty];
      void think(snapshot, playouts, timeMs).then((m) => {
        if (cancelled) return;
        setThinking(false);
        if (!move(m)) move(PASS);
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setThinking(false);
    };
    // `state` identifies the position; move/think are rebuilt with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTurn, state, shell.paused, shell.difficulty]);

  const onPoint = (i: number) => {
    if (over || shell.paused || aiTurn || thinking || state.board[i]) return;
    move(i);
  };

  const undo = () => {
    if (over || thinking) return;
    const plies = mode === 'ai' ? 2 : 1;
    if (history.length <= plies) return;
    setHistory(history.slice(0, -plies));
    setLast(null);
    setMessage(null);
  };

  const resign = () => {
    if (over || history.length < 2) return;
    finish(state, mode === 'ai' ? 1 : state.turn);
  };

  const stars = starPoints(n);
  const territory = over ? score(state.board, state.n).territory : null;
  const liveScore = score(state.board, state.n);
  const idle = aiTurn ? 'Computer is thinking…' : mode === 'ai' ? 'Your move (black)' : `${state.turn === 1 ? 'Black' : 'White'} to move`;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: '⚫ Captures', value: state.captures[1] },
          { label: '⚪ Captures', value: state.captures[2] },
          { label: 'Area B–W', value: `${liveScore.black}–${liveScore.white + KOMI}` },
        ]}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <ModePicker mode={mode} onChange={setMode} disabled={history.length > 1 && !over} />
        {mode === 'local' && (
          <div className="seg" role="radiogroup" aria-label="Board size">
            {[9, 13, 19].map((s) => (
              <button key={s} type="button" role="radio" aria-checked={size === s} className={size === s ? 'on' : ''} disabled={history.length > 1 && !over} onClick={() => setSize(s)}>
                {s}×{s}
              </button>
            ))}
          </div>
        )}
      </div>
      <StatusBar>{over ?? message ?? idle}</StatusBar>
      <div className="sq-board" style={{ ['--cells' as string]: state.n, borderRadius: 4 }} role="grid" aria-label={`Go board ${state.n} by ${state.n}`}>
        {Array.from(state.board).map((s, i) => {
          const r = Math.floor(i / state.n);
          const c = i % state.n;
          const t = territory?.[i];
          return (
            <button
              key={i}
              type="button"
              className={`sq cross ${last === i ? 'last' : ''}`}
              style={crossStyle(r, c, state.n)}
              onClick={() => onPoint(i)}
              aria-label={`${'ABCDEFGHJKLMNOPQRST'[c]}${state.n - r}${s ? (s === 1 ? ', black' : ', white') : ''}`}
            >
              {s ? (
                <span className={`piece ${s === 1 ? 'stone-black' : 'stone-white'}`} />
              ) : t ? (
                <span style={{ width: '32%', height: '32%', background: t === 1 ? '#111827' : '#f8fafc', opacity: 0.8 }} />
              ) : stars.has(i) ? (
                <span className="star" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={() => move(PASS)} disabled={!!over || aiTurn || shell.paused}>
          Pass
        </button>
        <button type="button" className="btn" onClick={undo} disabled={!!over || thinking || history.length < 2}>
          ↶ Undo
        </button>
        <button type="button" className="btn" onClick={resign} disabled={!!over || history.length < 2}>
          🏳 Resign
        </button>
      </div>
    </BoardLayout>
  );
}
