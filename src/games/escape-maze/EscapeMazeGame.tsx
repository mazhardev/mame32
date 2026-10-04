'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Direction } from '@/game-engine/InputManager';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { DPad } from '@/components/game/TouchControls';
import { useIsCoarsePointer } from '@/hooks/usePlatform';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { StartPanel } from '../_shared/puzzle/PuzzleUI';
import { useCountdown } from '../_shared/useCountdown';
import { run } from '../_shared/maze/maze';
import { MazeView } from '../_shared/maze/MazeView';
import { useMazeInput } from '../_shared/maze/useMazeInput';
import { LEVELS_PER_RUN, SETTINGS, buildLevel, levelScore, move, visibleCells } from './engine';
import type { Door, Level, RunnerState } from './engine';

const KEY_COLORS = ['#f59e0b', '#38bdf8', '#e879f9'];
const KEY_NAMES = ['gold', 'blue', 'pink'];

type Phase = 'intro' | 'playing' | 'cleared';

function freshState(lvl: Level): RunnerState {
  return { pos: lvl.start, held: [], opened: [], coins: [] };
}

export default function EscapeMazeGame() {
  const shell = useGameShell();
  const coarse = useIsCoarsePointer();
  const settings = SETTINGS[shell.difficulty];
  const [levelNo, setLevelNo] = useState(1);
  const [lvl, setLvl] = useState<Level>(() => buildLevel(shell.difficulty, 1));
  const [state, setState] = useState<RunnerState>(() => freshState(lvl));
  const [explored, setExplored] = useState<Set<number>>(() => new Set());
  const [phase, setPhase] = useState<Phase>('intro');
  const [total, setTotal] = useState(0);
  const [lastLevelScore, setLastLevelScore] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const stateRef = useRef(state);
  const totalRef = useRef(0);
  const coinsRef = useRef(0);
  const allCoinsRef = useRef(false);

  const onTimeout = useCallback(() => {
    shell.play('gameOver');
    shell.endRound({
      lost: true,
      score: totalRef.current,
      title: 'The lamp went out',
      message: `You escaped ${levelNo - 1} of ${LEVELS_PER_RUN} mazes.`,
      details: [
        { label: 'Mazes escaped', value: `${levelNo - 1} / ${LEVELS_PER_RUN}` },
        { label: 'Coins', value: String(coinsRef.current) },
      ],
    });
    setPhase('intro');
  }, [levelNo, shell]);

  const timer = useCountdown(lvl.seconds, phase === 'playing' && !shell.paused, onTimeout);
  const resetTimer = timer.reset;

  const loadLevel = useCallback(
    (n: number) => {
      const next = buildLevel(shell.difficulty, n);
      const s = freshState(next);
      setLvl(next);
      setLevelNo(n);
      setState(s);
      stateRef.current = s;
      setExplored(new Set(visibleCells(next.maze, s.pos, settings.vision)));
      setNote(null);
      resetTimer(next.seconds);
      return next;
    },
    [resetTimer, settings.vision, shell.difficulty],
  );

  const restart = useCallback(() => {
    loadLevel(1);
    totalRef.current = 0;
    coinsRef.current = 0;
    allCoinsRef.current = false;
    setTotal(0);
    setPhase('intro');
  }, [loadLevel]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const begin = () => {
    restart();
    setPhase('playing');
    shell.startRound();
  };

  const escaped = useCallback(
    (s: RunnerState) => {
      const secondsLeft = timer.left;
      const score = levelScore(levelNo, secondsLeft, s.coins.length);
      totalRef.current += score;
      coinsRef.current += s.coins.length;
      setTotal(totalRef.current);
      setLastLevelScore(score);
      void reportProgress('escape-maze.first', 1);
      if (lvl.coins.length && s.coins.length === lvl.coins.length) {
        allCoinsRef.current = true;
        void reportProgress('escape-maze.coins', 1);
      }
      if (secondsLeft >= lvl.seconds / 2) void reportProgress('escape-maze.quick', 1);
      if (levelNo >= LEVELS_PER_RUN) {
        void reportProgress('escape-maze.run', 1);
        if (shell.difficulty === 'hard') void reportProgress('escape-maze.hard', 1);
        shell.endRound({
          won: true,
          score: totalRef.current,
          title: 'You escaped every maze!',
          details: [
            { label: 'Mazes', value: `${LEVELS_PER_RUN} / ${LEVELS_PER_RUN}` },
            { label: 'Coins', value: String(coinsRef.current) },
          ],
        });
        setPhase('intro');
      } else {
        shell.play('levelComplete');
        setPhase('cleared');
      }
    },
    [levelNo, lvl, shell, timer.left],
  );

  const applyMoves = useCallback(
    (dirs: Direction[]) => {
      if (phase !== 'playing' || shell.paused) return;
      let s = stateRef.current;
      let lastEvent = '';
      for (const dir of dirs) {
        const r = move(lvl, s, dir);
        if (r.event === 'blocked') break;
        if (r.event === 'locked') {
          const door = lvl.doors.find((d) => d.a === s.pos || d.b === s.pos);
          setNote(`Locked — find the ${KEY_NAMES[door?.color ?? 0]} key.`);
          shell.play('failure');
          lastEvent = 'locked';
          break;
        }
        s = r.state;
        lastEvent = r.event;
        if (r.event === 'key' || r.event === 'unlocked' || r.event === 'coin' || s.pos === lvl.exit)
          break;
      }
      if (s === stateRef.current) return;
      stateRef.current = s;
      setState(s);
      setExplored((prev) => {
        const next = new Set(prev);
        visibleCells(lvl.maze, s.pos, settings.vision).forEach((c) => next.add(c));
        return next;
      });
      if (lastEvent === 'key') {
        setNote(`You picked up the ${KEY_NAMES[s.held[s.held.length - 1]]} key.`);
        shell.play('powerup');
      } else if (lastEvent === 'unlocked') {
        setNote('The door swings open.');
        shell.play('success');
      } else if (lastEvent === 'coin') {
        shell.play('coin');
      } else {
        shell.play('tick');
      }
      if (s.pos === lvl.exit) escaped(s);
    },
    [escaped, lvl, phase, settings.vision, shell],
  );

  // Swipes run to the next junction; convert the path into single steps.
  const onRun = (dir: Direction) => {
    const path = run(lvl.maze, stateRef.current.pos, dir);
    applyMoves(runDirections(lvl, stateRef.current.pos, path));
  };
  const input = useMazeInput(phase === 'playing' && !shell.paused, (d) => applyMoves([d]), onRun);

  const next = () => {
    const n = levelNo + 1;
    loadLevel(n);
    setPhase('playing');
  };

  const w = lvl.maze.w;
  const fog = (
    <g>
      {Array.from({ length: w * lvl.maze.h }, (_, c) => {
        const lit = isLit(lvl, state.pos, c, settings.vision);
        if (lit) return null;
        return (
          <rect
            key={c}
            x={(c % w) - 0.01}
            y={Math.floor(c / w) - 0.01}
            width={1.02}
            height={1.02}
            fill={explored.has(c) ? 'rgba(4,6,12,0.55)' : '#05070d'}
          />
        );
      })}
    </g>
  );

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Maze', value: `${levelNo}/${LEVELS_PER_RUN}` },
          { label: 'Time', value: `${timer.seconds}s` },
          { label: 'Score', value: total },
          {
            label: 'Keys',
            value: state.held.length ? state.held.map((k) => (
              <span key={k} style={{ color: KEY_COLORS[k] }} aria-label={`${KEY_NAMES[k]} key`}>
                ⚿
              </span>
            )) : '—',
          },
        ]}
      />
      {phase === 'intro' && (
        <StartPanel title="Escape the dark mazes" onStart={begin} startLabel="Light the lamp">
          <p className="small muted">
            Escape {LEVELS_PER_RUN} mazes before your lamp runs out. You can only see a few cells
            around you. Coloured doors need the matching key. Coins add bonus points.
          </p>
        </StartPanel>
      )}
      {phase === 'cleared' && (
        <StartPanel title={`Maze ${levelNo} escaped!`} onStart={next} startLabel="Next maze →">
          <p className="small muted">
            +{lastLevelScore} points · {state.coins.length} of {lvl.coins.length} coins ·{' '}
            {timer.seconds}s to spare
          </p>
        </StartPanel>
      )}
      {phase === 'playing' && (
        <>
          <StatusBar>
            {note ?? 'Find the flag. Swipe or Shift+arrow to run along corridors.'}
          </StatusBar>
          <MazeView
            maze={lvl.maze}
            player={state.pos}
            exit={lvl.exit}
            label={`Dark maze ${levelNo}. ${timer.seconds} seconds left. Holding ${state.held.length} keys.`}
            overlay={fog}
            onPointerDown={input.onPointerDown}
            onPointerUp={input.onPointerUp}
          >
            {lvl.doors
              .filter((d) => !state.opened.includes(d.color))
              .map((d) => (
                <DoorMark key={d.color} door={d} w={w} />
              ))}
            {lvl.keys.map((k, color) =>
              state.held.includes(color) || state.opened.includes(color) ? null : (
                <text
                  key={`k${color}`}
                  x={(k % w) + 0.5}
                  y={Math.floor(k / w) + 0.55}
                  fontSize={0.62}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={KEY_COLORS[color]}
                >
                  ⚿
                </text>
              ),
            )}
            {lvl.coins
              .filter((c) => !state.coins.includes(c))
              .map((c) => (
                <circle
                  key={`c${c}`}
                  cx={(c % w) + 0.5}
                  cy={Math.floor(c / w) + 0.5}
                  r={0.2}
                  fill="#facc15"
                  stroke="#a16207"
                  strokeWidth={0.05}
                />
              ))}
          </MazeView>
          {coarse && (
            <div className="maze-controls">
              <DPad onPress={(d) => applyMoves([d])} />
            </div>
          )}
        </>
      )}
    </BoardLayout>
  );
}

function isLit(lvl: Level, pos: number, cell: number, radius: number) {
  const w = lvl.maze.w;
  const dx = (cell % w) - (pos % w);
  const dy = Math.floor(cell / w) - Math.floor(pos / w);
  return dx * dx + dy * dy <= radius * radius;
}

/** Directions for a run path, one per cell. */
function runDirections(lvl: Level, from: number, path: number[]): Direction[] {
  const w = lvl.maze.w;
  const out: Direction[] = [];
  let at = from;
  for (const c of path) {
    out.push(c === at - w ? 'up' : c === at + w ? 'down' : c === at - 1 ? 'left' : 'right');
    at = c;
  }
  return out;
}

function DoorMark({ door, w }: { door: Door; w: number }) {
  const [a, b] = door.a < door.b ? [door.a, door.b] : [door.b, door.a];
  const horizontal = b === a + 1;
  const x = horizontal ? (b % w) : (a % w);
  const y = horizontal ? Math.floor(a / w) : Math.floor(b / w);
  return horizontal ? (
    <line x1={x} y1={y + 0.08} x2={x} y2={y + 0.92} stroke={KEY_COLORS[door.color]} strokeWidth={0.28} strokeLinecap="round" />
  ) : (
    <line x1={x + 0.08} y1={y} x2={x + 0.92} y2={y} stroke={KEY_COLORS[door.color]} strokeWidth={0.28} strokeLinecap="round" />
  );
}
