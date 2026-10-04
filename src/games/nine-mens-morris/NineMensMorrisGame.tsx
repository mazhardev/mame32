import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { maybeRandom, searchBest } from '../_shared/board/search';
import { EDGES, POINTS, count, initial, legalMoves, material, morrisGame, play, winner } from './engine';
import type { Move, MorrisState, Player } from './engine';
import './morris.css';

const DEPTH = { easy: 1, normal: 3, hard: 5 } as const;
const RANDOM = { easy: 0.35, normal: 0.05, hard: 0 } as const;
const S = 60;
const PAD = 30;
const at = (p: number): [number, number] => [PAD + POINTS[p][0] * S, PAD + POINTS[p][1] * S];

export default function NineMensMorrisGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const [state, setState] = useState<MorrisState>(initial);
  const [from, setFrom] = useState<number | null>(null);
  /** Chosen placement or slide that formed a mill and now needs a removal. */
  const [pending, setPending] = useState<{ from: number; to: number } | null>(null);
  const [last, setLast] = useState<Move | null>(null);
  const [started, setStarted] = useState(false);
  const [captures, setCaptures] = useState(0);

  const restart = useCallback(() => {
    setState(initial());
    setFrom(null);
    setPending(null);
    setLast(null);
    setStarted(false);
    setCaptures(0);
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const moves = useMemo(() => legalMoves(state), [state]);
  const result = winner(state);
  const over = result !== null;
  const aiTurn = mode === 'ai' && state.turn === 2 && !over;
  const name = (p: Player) => (mode === 'ai' ? (p === 1 ? 'You' : 'Computer') : p === 1 ? 'White' : 'Black');
  const placing = state.inHand[state.turn - 1] > 0;

  const commit = useCallback(
    (m: Move) => {
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const next = play(state, m);
      setState(next);
      setLast(m);
      setFrom(null);
      setPending(null);
      if (m.remove >= 0) {
        shell.play('coin');
        if (mode === 'ai' && state.turn === 1) setCaptures((c) => c + 1);
      } else shell.play('click');
      const w = winner(next);
      if (w === null) return;
      const youWon = mode === 'ai' && w === 1;
      shell.play(mode === 'ai' && w === 2 ? 'gameOver' : 'levelComplete');
      if (youWon) {
        void reportProgress('nine-mens-morris.win', 1);
        if (shell.difficulty === 'hard') void reportProgress('nine-mens-morris.hard', 1);
        if (material(next, 1) === 9) void reportProgress('nine-mens-morris.flawless', 1);
        void incrementProgress('nine-mens-morris.wins', 1);
      }
      shell.endRound({
        won: mode === 'ai' ? youWon : undefined,
        lost: mode === 'ai' ? w === 2 : undefined,
        draw: w === 0,
        score: youWon ? 100 + material(next, 1) * 20 : 0,
        title: w === 0 ? 'Draw — 50 moves without a capture' : `${name(w)} ${mode === 'ai' && w === 1 ? 'win' : 'wins'}!`,
        details: [
          { label: `${name(1)} men left`, value: String(material(next, 1)) },
          { label: `${name(2)} men left`, value: String(material(next, 2)) },
        ],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, shell, started, state],
  );

  useEffect(() => {
    if (captures >= 1) void reportProgress('nine-mens-morris.mill', 1);
  }, [captures]);

  useComputerTurn(
    aiTurn && !shell.paused,
    () => maybeRandom(moves, searchBest(morrisGame, state, DEPTH[shell.difficulty], 900), RANDOM[shell.difficulty]),
    commit,
    state,
    600,
  );

  const humanTurn = !over && !aiTurn && !shell.paused;
  const removals = pending ? moves.filter((m) => m.from === pending.from && m.to === pending.to && m.remove >= 0).map((m) => m.remove) : [];
  const targets = useMemo(() => {
    if (!humanTurn || pending) return new Set<number>();
    if (placing) return new Set(moves.map((m) => m.to));
    if (from === null) return new Set<number>();
    return new Set(moves.filter((m) => m.from === from).map((m) => m.to));
  }, [from, humanTurn, moves, pending, placing]);
  const movable = useMemo(() => new Set(placing ? [] : moves.map((m) => m.from)), [moves, placing]);

  const click = (p: number) => {
    if (!humanTurn) return;
    if (pending) {
      const m = moves.find((x) => x.from === pending.from && x.to === pending.to && x.remove === p);
      if (m) commit(m);
      return;
    }
    if (!placing && state.board[p] === state.turn) {
      setFrom(movable.has(p) ? p : null);
      return;
    }
    if (!targets.has(p)) return;
    const f = placing ? -1 : (from as number);
    const options = moves.filter((m) => m.from === f && m.to === p);
    if (options.length === 1) commit(options[0]);
    else {
      setPending({ from: f, to: p });
      shell.play('select');
    }
  };

  const status = over
    ? result === 0
      ? 'Draw'
      : `${name(result as Player)} ${mode === 'ai' && result === 1 ? 'win' : 'wins'}!`
    : aiTurn
      ? 'Computer is thinking…'
      : pending
        ? 'Mill! Choose a piece to remove.'
        : placing
          ? `${name(state.turn)}: place a man (${state.inHand[state.turn - 1]} left)`
          : count(state, state.turn) === 3
            ? `${name(state.turn)}: you can fly to any empty point`
            : from === null
              ? `${name(state.turn)}: choose a man to move`
              : `${name(state.turn)}: choose where to move`;

  const display = pending
    ? (() => {
        const b = [...state.board];
        if (pending.from >= 0) b[pending.from] = 0;
        b[pending.to] = state.turn;
        return b;
      })()
    : state.board;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: `${name(1)} (white)`, value: `${count(state, 1)} + ${state.inHand[0]}` },
          { label: `${name(2)} (black)`, value: `${count(state, 2)} + ${state.inHand[1]}` },
          { label: 'Quiet moves', value: state.quiet },
        ]}
      />
      <ModePicker mode={mode} onChange={setMode} disabled={started && !over} />
      <StatusBar>{status}</StatusBar>
      <svg className="morris" viewBox={`0 0 ${PAD * 2 + 6 * S} ${PAD * 2 + 6 * S}`} role="group" aria-label="Nine Men's Morris board">
        {EDGES.map(([a, b]) => {
          const [x1, y1] = at(a);
          const [x2, y2] = at(b);
          return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} className="morris-line" />;
        })}
        {POINTS.map((_, p) => {
          const [x, y] = at(p);
          const c = display[p];
          const isTarget = targets.has(p);
          const isRemovable = removals.includes(p);
          const isSelected = from === p || pending?.to === p;
          const wasLast = last && (last.to === p || last.from === p);
          return (
            <g key={p}>
              <circle cx={x} cy={y} r={7} className="morris-point" />
              {c !== 0 && (
                <circle
                  cx={x}
                  cy={y}
                  r={20}
                  className={`morris-man p${c}${isSelected ? ' sel' : ''}${isRemovable ? ' victim' : ''}${wasLast ? ' last' : ''}`}
                />
              )}
              {isTarget && <circle cx={x} cy={y} r={10} className="morris-target" />}
              <circle
                cx={x}
                cy={y}
                r={26}
                fill="transparent"
                role="button"
                tabIndex={humanTurn && (isTarget || isRemovable || movable.has(p)) ? 0 : -1}
                aria-label={`Point ${p + 1}${c ? `, ${c === 1 ? 'white' : 'black'} man` : ', empty'}${isRemovable ? ', remove' : ''}`}
                onClick={() => click(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    click(p);
                  }
                }}
                style={{ cursor: humanTurn ? 'pointer' : 'default' }}
              />
            </g>
          );
        })}
      </svg>
      {(from !== null || pending) && humanTurn && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setFrom(null);
            setPending(null);
          }}
        >
          Cancel selection
        </button>
      )}
    </BoardLayout>
  );
}
