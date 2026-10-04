'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Direction } from '@/game-engine/InputManager';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { DPad } from '@/components/game/TouchControls';
import { useIsCoarsePointer } from '@/hooks/usePlatform';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { generateMaze, run, shortestPath, step } from '../_shared/maze/maze';
import type { Maze } from '../_shared/maze/maze';
import { MazeView } from '../_shared/maze/MazeView';
import { useMazeInput } from '../_shared/maze/useMazeInput';
import { SIZES, parSeconds, scoreFor } from './engine';

function build(w: number, h: number) {
  const maze = generateMaze(w, h);
  return { maze, shortest: shortestPath(maze, 0, w * h - 1).length - 1 };
}

export default function MazeGame() {
  const shell = useGameShell();
  const coarse = useIsCoarsePointer();
  const { w, h } = SIZES[shell.difficulty];
  const [{ maze, shortest }, setBoard] = useState(() => build(w, h));
  const [pos, setPos] = useState(0);
  const [trail, setTrail] = useState<Set<number>>(() => new Set([0]));
  const [steps, setSteps] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintPath, setHintPath] = useState<number[] | undefined>();
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const hintTimer = useRef<number | undefined>(undefined);
  // Mirrors of pos/steps so several key events in one frame each see the latest move.
  const posRef = useRef(0);
  const stepsRef = useRef(0);
  const doneRef = useRef(false);
  const exit = w * h - 1;
  const locked = shell.paused || done;

  const restart = useCallback(() => {
    setBoard(build(w, h));
    setPos(0);
    setTrail(new Set([0]));
    setSteps(0);
    posRef.current = 0;
    stepsRef.current = 0;
    doneRef.current = false;
    setHints(0);
    setHintPath(undefined);
    setStarted(false);
    setDone(false);
    reset(0);
  }, [w, h, reset]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => window.clearTimeout(hintTimer.current), []);

  const finish = useCallback(
    (stepCount: number) => {
      setDone(true);
      const ms = read();
      const cells = w * h;
      void reportProgress('maze.first', 1);
      void incrementProgress('maze.ten');
      if (cells >= 400) void reportProgress('maze.hard', 1);
      if (cells >= 400 && hints === 0) void reportProgress('maze.no-hints', 1);
      if (stepCount === shortest) void reportProgress('maze.perfect', 1);
      if (cells === 256 && ms < 45_000) void reportProgress('maze.fast', 1);
      shell.endRound({
        won: true,
        score: scoreFor(cells, shortest, stepCount, ms, hints),
        timeMs: ms,
        title: stepCount === shortest ? 'Escaped by the shortest route!' : 'You found the exit!',
        details: [
          { label: 'Maze', value: `${w}×${h}` },
          { label: 'Steps', value: `${stepCount} (shortest ${shortest})` },
          { label: 'Hints', value: String(hints) },
        ],
      });
    },
    [h, hints, read, shell, shortest, w],
  );

  const travel = useCallback(
    (path: number[]) => {
      if (locked || doneRef.current || !path.length) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const end = path[path.length - 1];
      const count = stepsRef.current + path.length;
      posRef.current = end;
      stepsRef.current = count;
      setPos(end);
      setSteps(count);
      setTrail((t) => {
        const next = new Set(t);
        path.forEach((c) => next.add(c));
        return next;
      });
      shell.play('tick');
      if (end === exit) {
        doneRef.current = true;
        finish(count);
      }
    },
    [exit, finish, locked, shell, started],
  );

  const onStep = (dir: Direction) => {
    const next = step(maze, posRef.current, dir);
    if (next >= 0) travel([next]);
  };
  const onRun = (dir: Direction) => travel(run(maze, posRef.current, dir, (c) => c === exit));
  const input = useMazeInput(!locked, onStep, onRun);

  const showHint = () => {
    if (locked) return;
    setHints(hints + 1);
    setHintPath(shortestPath(maze, posRef.current, exit));
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintPath(undefined), 2500);
  };

  const par = useMemo(() => parSeconds(shortest), [shortest]);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Par', value: formatClock(par * 1000) },
          { label: 'Steps', value: steps },
        ]}
      />
      <StatusBar>
        {done
          ? 'You made it out!'
          : started
            ? 'Find the green flag in the bottom-right corner.'
            : 'Arrow keys to step, Shift+arrow or swipe to run to the next junction.'}
      </StatusBar>
      <MazeBoard
        maze={maze}
        pos={pos}
        exit={exit}
        trail={trail}
        hintPath={hintPath}
        input={input}
      />
      {coarse && !done && (
        <div className="maze-controls">
          <DPad onPress={(d) => onStep(d)} />
        </div>
      )}
      <PuzzleActions>
        <button type="button" className="btn" onClick={showHint} disabled={locked}>
          🧭 Show the way (2.5s)
        </button>
        <button type="button" className="btn" onClick={restart} disabled={shell.paused}>
          🔀 New maze
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}

function MazeBoard({
  maze,
  pos,
  exit,
  trail,
  hintPath,
  input,
}: {
  maze: Maze;
  pos: number;
  exit: number;
  trail: Set<number>;
  hintPath?: number[];
  input: ReturnType<typeof useMazeInput>;
}) {
  return (
    <MazeView
      maze={maze}
      player={pos}
      exit={exit}
      trail={trail}
      hintPath={hintPath}
      label={`Maze, ${maze.w} by ${maze.h}. You are at row ${Math.floor(pos / maze.w) + 1}, column ${(pos % maze.w) + 1}. The exit is in the bottom-right corner.`}
      onPointerDown={input.onPointerDown}
      onPointerUp={input.onPointerUp}
    />
  );
}
