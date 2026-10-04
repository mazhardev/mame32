'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { useDirectionKeys } from '../_shared/puzzle/useDirectionKeys';
import {
  SIZES,
  isSolved,
  percentPlaced,
  scoreFor,
  shuffleTiles,
  slideDirection,
  slideFrom,
  validSave,
} from './engine';
import type { Tiles } from './engine';
import './sliding.css';

const ID = 'sliding-puzzle';

/** Tiles are tinted by their home row so the target layout is easy to read. */
function tileColor(value: number, n: number): string {
  const row = Math.floor((value - 1) / n);
  const hue = 225 + (row / Math.max(1, n - 1)) * 110;
  return `hsl(${hue} 70% 52%)`;
}

export default function SlidingPuzzleGame() {
  const shell = useGameShell();
  const n = SIZES[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [tiles, setTiles] = useState<Tiles>(() => shuffleTiles(n));
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read: readTime, reset: resetTime } = useStopwatch(
    started && !done && !shell.paused,
  );
  const doneRef = useRef(false);

  const pending = save.saved && save.saved.n === n ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;

  const restart = useCallback(() => {
    setTiles(shuffleTiles(n));
    setMoves(0);
    setStarted(false);
    setDone(false);
    doneRef.current = false;
    resetTime(0);
    save.clear();
  }, [n, save, resetTime]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = useCallback(
    (moveCount: number) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setDone(true);
      const ms = readTime();
      const score = scoreFor(n, moveCount, ms);
      save.clear();
      void reportProgress('sliding-puzzle.first', 1);
      void incrementProgress('sliding-puzzle.ten');
      if (n === 3 && moveCount <= 40) void reportProgress('sliding-puzzle.efficient', 1);
      if (n === 4) void reportProgress('sliding-puzzle.fifteen', 1);
      if (n === 4 && ms < 120_000) void reportProgress('sliding-puzzle.quick', 1);
      if (n === 5) void reportProgress('sliding-puzzle.master', 1);
      shell.endRound({
        won: true,
        score,
        timeMs: ms,
        title: 'Puzzle solved!',
        details: [
          { label: 'Board', value: `${n}×${n}` },
          { label: 'Moves', value: String(moveCount) },
        ],
      });
    },
    [n, readTime, save, shell],
  );

  const apply = useCallback(
    (next: Tiles | null) => {
      if (!next || locked) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const count = moves + 1;
      setTiles(next);
      setMoves(count);
      shell.play('click');
      if (isSolved(next)) {
        finish(count);
      } else {
        const percent = percentPlaced(next);
        save.persist(
          { n, tiles: next, moves: count, ms: readTime() },
          { percent, label: `${n}×${n} · ${count} moves · ${percent}% placed` },
        );
      }
    },
    [finish, locked, moves, n, readTime, save, shell, started],
  );

  useDirectionKeys((dir) => apply(slideDirection(tiles, n, dir)), !locked);

  const resume = () => {
    if (!pending) return;
    setTiles(pending.tiles);
    setMoves(pending.moves);
    resetTime(pending.ms);
    save.dismiss();
  };

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Moves', value: moves },
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Placed', value: `${percentPlaced(tiles)}%` },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.n}×${pending.n} · ${pending.moves} moves · ${formatClock(pending.ms)}`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {done
          ? 'Solved!'
          : started
            ? 'Put the tiles back in order, 1 to ' + (n * n - 1) + '.'
            : 'Tap a tile next to the gap, or use the arrow keys.'}
      </StatusBar>
      <div
        className={`slide-board${done ? ' pz-win' : ''}`}
        style={{ ['--n' as string]: n }}
        role="grid"
        aria-label={`${n} by ${n} sliding puzzle`}
      >
        {tiles.map((value, index) =>
          value === 0 ? null : (
            <button
              key={value}
              type="button"
              className={`slide-tile${value === index + 1 ? ' home' : ''}`}
              style={{
                transform: `translate(${(index % n) * 100}%, ${Math.floor(index / n) * 100}%)`,
                ['--tile' as string]: tileColor(value, n),
              }}
              onClick={() => apply(slideFrom(tiles, n, index))}
              disabled={locked}
              aria-label={`Tile ${value}, row ${Math.floor(index / n) + 1}, column ${(index % n) + 1}`}
            >
              <span>{value}</span>
            </button>
          ),
        )}
      </div>
      <PuzzleActions>
        <button type="button" className="btn" onClick={restart} disabled={shell.paused}>
          🔀 New shuffle
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
