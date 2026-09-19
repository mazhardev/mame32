import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from './BoardUI';
import type { PlayMode } from './BoardUI';
import { applyMove, bestMove, count, initialBoard, isKing, legalMoves, owner } from './draughts';
import type { Cell, DraughtsRules, Move, Player } from './draughts';

export interface Variant {
  name: string;
  rules: DraughtsRules;
  /** Search depth per difficulty. */
  depth: { easy: number; normal: number; hard: number };
}

interface State {
  board: Cell[];
  turn: Player;
  /** Plies since the last capture or man move (for the draw rule). */
  quiet: number;
  last: Move | null;
  history: { board: Cell[]; turn: Player; quiet: number; last: Move | null }[];
}

const DRAW_PLIES = 80;

export function DraughtsGame({ gameId, variants }: { gameId: string; variants: Variant[] }) {
  const shell = useGameShell();
  const [variantIndex, setVariantIndex] = useState(0);
  const variant = variants[variantIndex];
  const rules = variant.rules;
  const [mode, setMode] = useState<PlayMode>('ai');
  const fresh = useCallback(
    (): State => ({ board: initialBoard(rules), turn: 1, quiet: 0, last: null, history: [] }),
    [rules],
  );
  const [state, setState] = useState<State>(fresh);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const restart = useCallback(() => {
    setState(fresh());
    setSelected(null);
    setResult(null);
    setStarted(false);
  }, [fresh]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const moves = useMemo(() => legalMoves(state.board, state.turn, rules), [state.board, state.turn, rules]);
  const aiTurn = mode === 'ai' && state.turn === 2 && !result;

  const finish = useCallback(
    (winner: Player | 0, board: Cell[]) => {
      const youWin = mode === 'ai' ? winner === 1 : winner !== 0;
      const text =
        winner === 0 ? 'Draw — no progress for 40 moves' : mode === 'ai' ? (winner === 1 ? 'You win!' : 'The computer wins') : `${winner === 1 ? 'Red' : 'Black'} wins!`;
      setResult(text);
      shell.play(winner === 0 ? 'click' : youWin ? 'levelComplete' : 'gameOver');
      if (mode === 'ai' && winner === 1) {
        void reportProgress(`${gameId}.win`, 1);
        if (shell.difficulty === 'hard') void reportProgress(`${gameId}.hard`, 1);
        if (count(board, 1) >= (rules.size === 10 ? 20 : 12)) void reportProgress(`${gameId}.flawless`, 1);
      }
      shell.endRound({
        score: mode === 'ai' && winner === 1 ? 500 + count(board, 1) * 25 : 0,
        won: mode === 'ai' ? winner === 1 : undefined,
        lost: mode === 'ai' ? winner === 2 : undefined,
        draw: winner === 0,
        title: text,
        mode: mode === 'ai' ? 'vs computer' : 'two players',
        details: [
          { label: 'Your pieces left', value: String(count(board, 1)) },
          { label: 'Opponent pieces left', value: String(count(board, 2)) },
        ],
      });
    },
    [gameId, mode, rules.size, shell],
  );

  const play = useCallback(
    (move: Move) => {
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const board = applyMove(state.board, move);
      const next: Player = state.turn === 1 ? 2 : 1;
      const manMoved = !isKing(state.board[move.from]);
      const quiet = move.captured.length || manMoved ? 0 : state.quiet + 1;
      shell.play(move.captured.length ? 'hit' : 'click');
      setState({
        board,
        turn: next,
        quiet,
        last: move,
        history: [...state.history, { board: state.board, turn: state.turn, quiet: state.quiet, last: state.last }],
      });
      setSelected(null);
      if (!legalMoves(board, next, rules).length) finish(state.turn, board);
      else if (quiet >= DRAW_PLIES) finish(0, board);
    },
    [finish, rules, shell, started, state],
  );

  useComputerTurn(
    aiTurn && !shell.paused,
    () => bestMove(state.board, 2, rules, variant.depth[shell.difficulty]),
    play,
    state.board,
  );

  const onSquare = (i: number) => {
    if (result || shell.paused || aiTurn) return;
    const destination = selected !== null ? moves.find((m) => m.from === selected && m.path[m.path.length - 1] === i) : undefined;
    if (destination) return play(destination);
    if (owner(state.board[i]) === state.turn && moves.some((m) => m.from === i)) setSelected(i);
    else if (owner(state.board[i]) === state.turn) setSelected(null);
  };

  const undo = () => {
    const steps = mode === 'ai' ? 2 : 1;
    if (state.history.length < steps || result) return;
    const prev = state.history[state.history.length - steps];
    setState({ ...prev, history: state.history.slice(0, -steps) });
    setSelected(null);
  };

  const targets = new Set(selected === null ? [] : moves.filter((m) => m.from === selected).map((m) => m.path[m.path.length - 1]));
  const movable = new Set(moves.map((m) => m.from));
  const lastSquares = new Set(state.last ? [state.last.from, ...state.last.path] : []);
  const size = rules.size;
  const mustCapture = moves.some((m) => m.captured.length > 0);

  const status = result
    ? result
    : mode === 'ai'
      ? state.turn === 1
        ? mustCapture
          ? 'Your move — you must capture'
          : 'Your move (red)'
        : 'Computer is thinking…'
      : `${state.turn === 1 ? 'Red' : 'Black'} to move${mustCapture ? ' — must capture' : ''}`;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Red', value: count(state.board, 1) },
          { label: 'Black', value: count(state.board, 2) },
        ]}
        extra={
          <button className="btn" onClick={undo} disabled={!state.history.length || !!result || aiTurn}>
            Undo
          </button>
        }
      />
      <div className="row wrap" style={{ justifyContent: 'center' }}>
        <ModePicker mode={mode} onChange={setMode} disabled={started && !result} />
        {variants.length > 1 && (
          <select
            className="select"
            style={{ width: 'auto' }}
            value={variantIndex}
            disabled={started && !result}
            aria-label="Rules"
            onChange={(e) => setVariantIndex(Number(e.target.value))}
          >
            {variants.map((v, i) => (
              <option key={v.name} value={i}>
                {v.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <StatusBar>{status}</StatusBar>
      <div className="sq-board" style={{ ['--cells' as string]: size }} role="grid" aria-label={`${variant.name} board`}>
        {state.board.map((cell, i) => {
          const dark = (Math.floor(i / size) + (i % size)) % 2 === 1;
          const cls = ['sq', dark ? 'dark' : 'light', selected === i ? 'sel' : '', lastSquares.has(i) && !targets.has(i) ? 'last' : ''].join(' ');
          const who = owner(cell);
          return (
            <button
              key={i}
              type="button"
              className={cls}
              onClick={() => onSquare(i)}
              disabled={!dark}
              aria-label={`Square ${i}${cell ? `, ${who === 1 ? 'red' : 'black'}${isKing(cell) ? ' king' : ''}` : ''}${targets.has(i) ? ', move here' : ''}`}
            >
              {cell !== 0 && (
                <span
                  className={`piece ${who === 1 ? 'red' : 'black'}`}
                  style={movable.has(i) && who === state.turn && !aiTurn && !result ? { outline: '2px solid rgba(255,216,77,0.7)' } : undefined}
                >
                  {isKing(cell) ? '♛' : ''}
                </span>
              )}
              {targets.has(i) && <span className="hint" />}
            </button>
          );
        })}
      </div>
    </BoardLayout>
  );
}
