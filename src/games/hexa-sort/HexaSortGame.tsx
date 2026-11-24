import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { CLEAR_AT, boardCells, emptyCells, isOver, newGame, place, top, topRun, validState } from './engine';
import type { Stack, State } from './engine';
import './hexa.css';

const ID = 'hexa-sort';
const START_COLORS = { easy: 3, normal: 4, hard: 5 } as const;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#64748b'];
const SIZE = 10;
const LIFT = 1.6;
const SQ3 = Math.sqrt(3);

const hex = (x: number, y: number, r: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 30);
    return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

/** A pile of hexagon tiles, bottom first, with the top tile's run count. */
function Pile({ stack, x, y, r }: { stack: Stack; x: number; y: number; r: number }) {
  const shown = stack.slice(-12);
  const run = topRun(stack);
  return (
    <g pointerEvents="none">
      {shown.map((c, k) => (
        <polygon key={k} points={hex(x, y - k * LIFT * (r / SIZE), r * 0.92)} fill={COLORS[c]} className="hx-tile" />
      ))}
      {stack.length > 0 && (
        <text x={x} y={y - (shown.length - 1) * LIFT * (r / SIZE)} textAnchor="middle" dominantBaseline="central" className="hx-count" fontSize={r * 0.62}>
          {run}
        </text>
      )}
    </g>
  );
}

export default function HexaSortGame() {
  const shell = useGameShell();
  const save = useSavedGame(ID, validState);
  const startColors = START_COLORS[shell.difficulty];
  const [state, setState] = useState<State>(() => newGame(2, startColors, Math.random));
  const [selected, setSelected] = useState(0);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const flashTimer = useRef<number | undefined>();
  const pending = save.saved && save.saved.placed > 0 && !isOver(save.saved) ? save.saved : null;
  const cells = boardCells(state.radius);
  const locked = shell.paused || done || !!pending;

  const restart = useCallback(() => {
    save.clear();
    setState(newGame(2, startColors, Math.random));
    setSelected(0);
    setStarted(false);
    setDone(false);
  }, [save, startColors]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const end = (s: State) => {
    setDone(true);
    save.clear();
    shell.play('gameOver');
    if (s.score >= 1000) void reportProgress(`${ID}.k1`, 1);
    if (s.score >= 5000) void reportProgress(`${ID}.k5`, 1);
    shell.endRound({
      won: false,
      score: s.score,
      title: 'Board full',
      message: `You placed ${s.placed} stacks and cleared ${s.cleared} tiles.`,
      details: [
        { label: 'Stacks placed', value: String(s.placed) },
        { label: 'Tiles cleared', value: String(s.cleared) },
        { label: 'Best chain', value: `${s.bestChain} clear${s.bestChain === 1 ? '' : 's'}` },
      ],
    });
  };

  const drop = (i: number) => {
    if (locked || selected < 0) return;
    const res = place(state, selected, i, Math.random);
    if (!res) {
      shell.play('blip');
      return;
    }
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    setState(res.state);
    setSelected(res.state.tray.findIndex((x) => x !== null));
    const clears = res.steps.filter((x) => x.kind === 'clear');
    const moves = res.steps.filter((x) => x.kind === 'move');
    if (clears.length) {
      shell.play(clears.length > 1 ? 'powerup' : 'success');
      void incrementProgress(`${ID}.clears`, clears.length);
      if (clears.length >= 2) void reportProgress(`${ID}.chain`, 1);
      setFlash(new Set(clears.map((x) => x.to)));
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(new Set()), 450);
    } else shell.play(moves.length ? 'pop' : 'click');
    if (isOver(res.state)) {
      end(res.state);
      return;
    }
    save.persist(res.state, { label: `${res.state.score} points · ${emptyCells(res.state).length} free cells` });
  };

  const resume = () => {
    if (!pending) return;
    setState(pending);
    setSelected(pending.tray.findIndex((x) => x !== null));
    setStarted(true);
    shell.startRound();
    save.dismiss();
  };

  // Board geometry (pointy-top hexagons).
  const pos = (i: number) => {
    const [q, r] = cells[i];
    return { x: SIZE * SQ3 * (q + r / 2), y: SIZE * 1.5 * r };
  };
  const span = state.radius * 2 + 1;
  const vbW = SIZE * SQ3 * span + 4;
  const vbH = SIZE * (1.5 * (span - 1) + 2) + 14;
  const sel = selected >= 0 ? state.tray[selected] : null;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Score', value: state.score.toLocaleString() },
          { label: 'Cleared', value: state.cleared },
          { label: 'Colours', value: state.colors },
          { label: 'Free cells', value: emptyCells(state).length },
        ]}
      />
      {pending && <ResumePrompt label={`${pending.score} points · ${pending.placed} stacks placed`} onContinue={resume} onNew={restart} />}
      <StatusBar>
        {done
          ? 'No room left for the next stack.'
          : sel
            ? `Tap an empty cell to place the stack. Matching colours slide together; ${CLEAR_AT} of one colour clears.`
            : 'Pick a stack from the tray below.'}
      </StatusBar>
      <div className="hx-board">
        <svg viewBox={`${-vbW / 2} ${-vbH / 2 - 4} ${vbW} ${vbH}`} role="group" aria-label="Board">
          {cells.map((_, i) => {
            const { x, y } = pos(i);
            const s = state.stacks[i];
            return (
              <g
                key={i}
                className={`hx-cell${!s.length && sel ? ' open' : ''}${flash.has(i) ? ' flash' : ''}`}
                role="button"
                tabIndex={s.length ? -1 : 0}
                aria-label={s.length ? `Stack of ${s.length}, top colour ${top(s) + 1}` : 'Empty cell'}
                onClick={() => drop(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), drop(i))}
              >
                <polygon points={hex(x, y, SIZE * 0.97)} className="hx-slot" />
                <Pile stack={s} x={x} y={y} r={SIZE} />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="hx-tray" role="group" aria-label="Stacks to place">
        {state.tray.map((s, t) => (
          <button
            key={t}
            type="button"
            className={`hx-offer${selected === t ? ' on' : ''}`}
            onClick={() => {
              if (!s || locked) return;
              setSelected(t);
              shell.play('tick');
            }}
            disabled={!s || locked}
            aria-pressed={selected === t}
            aria-label={s ? `Stack of ${s.length}` : 'Used'}
          >
            {s && (
              <svg viewBox="-12 -24 24 34" aria-hidden="true">
                <Pile stack={s} x={0} y={0} r={SIZE} />
              </svg>
            )}
          </button>
        ))}
      </div>
    </BoardLayout>
  );
}
