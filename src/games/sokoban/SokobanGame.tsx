'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Direction } from '@/game-engine/InputManager';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { DPad } from '@/components/game/TouchControls';
import { useIsCoarsePointer } from '@/hooks/usePlatform';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { LevelPicker } from '../_shared/puzzle/LevelPicker';
import { solvedInPack, usePackLevels } from '../_shared/puzzle/levels';
import { swipeDirection, useDirectionKeys } from '../_shared/puzzle/useDirectionKeys';
import { boxesOnGoals, deadSquares, isSolved, parseLevel, reachable, step } from './engine';
import type { Level, State } from './engine';
import { LEVEL_PACKS } from './levels';
import './sokoban.css';

const ID = 'sokoban';
const PACK_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

interface Snapshot {
  state: State;
  moves: number;
  pushes: number;
}

function validSnapshot(v: unknown): v is Snapshot {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const st = s.state as Record<string, unknown> | undefined;
  return (
    !!st &&
    Number.isInteger(st.player) &&
    Array.isArray(st.boxes) &&
    st.boxes.length <= 6 &&
    st.boxes.every((b) => Number.isInteger(b) && b >= 0 && b < 400) &&
    Number.isInteger(s.moves) &&
    Number.isInteger(s.pushes)
  );
}

export function starsFor(pushes: number, best: number): number {
  return pushes <= best ? 3 : pushes <= Math.ceil(best * 1.3) ? 2 : 1;
}

/** Shortest walk for the keeper to `target` without pushing, as directions. */
function walkTo(level: Level, state: State, target: number): Direction[] | null {
  const prev = new Map<number, number>([[state.player, -1]]);
  const queue = [state.player];
  const blocked = new Set(state.boxes);
  for (let qi = 0; qi < queue.length; qi++) {
    const c = queue[qi];
    if (c === target) break;
    for (const d of [-level.w, level.w, -1, 1]) {
      const n = c + d;
      if (level.walls.has(n) || blocked.has(n) || prev.has(n)) continue;
      prev.set(n, c);
      queue.push(n);
    }
  }
  if (!prev.has(target)) return null;
  const dirs: Direction[] = [];
  for (let c = target; prev.get(c)! >= 0; c = prev.get(c)!) {
    const p = prev.get(c)!;
    dirs.unshift(c === p - level.w ? 'up' : c === p + level.w ? 'down' : c === p - 1 ? 'left' : 'right');
  }
  return dirs;
}

export default function SokobanGame() {
  const shell = useGameShell();
  const coarse = useIsCoarsePointer();
  const pack = shell.difficulty;
  const list = LEVEL_PACKS[pack];
  const levels = usePackLevels(ID, pack, list.length, validSnapshot, shell.requestRestart, {
    packNames: PACK_NAMES,
  });
  const [parsed, setParsed] = useState(() => parseLevel(list[0].text));
  const [snap, setSnap] = useState<Snapshot>({ state: parsed.state, moves: 0, pushes: 0 });
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [done, setDone] = useState(false);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const startedRef = useRef(false);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const { level } = parsed;

  const dead = useMemo(() => deadSquares(level), [level]);
  const interior = useMemo(() => reachable(level, parsed.state.player, []), [level, parsed.state.player]);
  const best = list[levels.index]?.pushes ?? 0;

  const load = useCallback(
    (index: number, resume: boolean) => {
      const p = parseLevel(list[index].text);
      const saved = resume ? levels.savedFor(index) : null;
      const start: Snapshot = saved ?? { state: p.state, moves: 0, pushes: 0 };
      setParsed(p);
      setSnap(start);
      snapRef.current = start;
      setHistory([]);
      setDone(false);
      startedRef.current = false;
    },
    [levels, list],
  );

  useEffect(() => {
    if (levels.ready) load(levels.indexRef.current, true);
    // Load once progress is available, or when the pack changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels.ready, pack]);

  const restart = useCallback(() => {
    levels.clearCurrent();
    load(levels.indexRef.current, false);
  }, [levels, load]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = useCallback(
    (final: Snapshot) => {
      setDone(true);
      const index = levels.indexRef.current;
      const key = levels.key;
      levels.recordSolve(key, final.pushes);
      const s = starsFor(final.pushes, best);
      shell.play('levelComplete');
      void reportProgress('sokoban.first', 1);
      void incrementProgress('sokoban.twenty');
      if (s === 3) void reportProgress('sokoban.optimal', 1);
      if (pack === 'hard') void reportProgress('sokoban.hard', 1);
      if (solvedInPack({ ...levels.progress.solved, [key]: final.pushes }, pack) === list.length)
        void reportProgress('sokoban.pack', 1);
      shell.endRound({
        won: true,
        score: Math.max(50, best * 40 + 200 - Math.max(0, final.pushes - best) * 20 - Math.round(final.moves / 4)),
        title: `Every box stored! ${'★'.repeat(s)}${'☆'.repeat(3 - s)}`,
        details: [
          { label: 'Level', value: `${PACK_NAMES[pack]} ${index + 1}` },
          { label: 'Pushes', value: `${final.pushes} (fewest ${best})` },
          { label: 'Moves', value: String(final.moves) },
        ],
        next: index < list.length - 1 ? { label: 'Next level →', action: () => levels.select(index + 1) } : undefined,
      });
    },
    [best, levels, list.length, pack, shell],
  );

  const locked = shell.paused || done || !levels.ready;

  /** Applies a sequence of steps as one undoable action. */
  const walk = useCallback(
    (dirs: Direction[]) => {
      if (locked || !dirs.length) return;
      const before = snapRef.current;
      let cur = before;
      let pushed = false;
      for (const d of dirs) {
        const r = step(level, cur.state, d);
        if (!r) break;
        cur = { state: r.state, moves: cur.moves + 1, pushes: cur.pushes + (r.pushed ? 1 : 0) };
        pushed ||= r.pushed;
      }
      if (cur === before) return;
      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }
      snapRef.current = cur;
      setSnap(cur);
      setHistory((h) => [...h.slice(-499), before]);
      if (pushed) {
        const nowOnGoals = boxesOnGoals(level, cur.state);
        shell.play(nowOnGoals > boxesOnGoals(level, before.state) ? 'success' : 'pop');
      }
      if (isSolved(level, cur.state)) finish(cur);
      else levels.saveCurrent(levels.key, cur);
    },
    [finish, level, levels, locked, shell],
  );

  useDirectionKeys((dir) => walk([dir]), !locked, {
    z: () => undo(),
    Z: () => undo(),
    u: () => undo(),
    U: () => undo(),
  });

  function undo() {
    if (locked || !history.length) return;
    const prev = history[history.length - 1];
    snapRef.current = prev;
    setSnap(prev);
    setHistory(history.slice(0, -1));
    levels.saveCurrent(levels.key, prev);
  }

  // Tap a floor square to walk there; tap a box next to you to push it.
  const onCell = (cell: number) => {
    if (locked) return;
    const s = snapRef.current.state;
    const diff = cell - s.player;
    const adjacent =
      diff === -level.w ? 'up' : diff === level.w ? 'down' : diff === -1 ? 'left' : diff === 1 ? 'right' : null;
    if (s.boxes.includes(cell)) {
      if (adjacent) walk([adjacent]);
      return;
    }
    const path = walkTo(level, s, cell);
    if (path) walk(path);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dir = swipeDirection(e.clientX - s.x, e.clientY - s.y, 30);
    if (dir) {
      walk([dir]);
      return;
    }
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')?.dataset.cell;
    if (cell !== undefined) onCell(Number(cell));
  };

  const { state } = snap;
  const stuck = state.boxes.some((b) => dead.has(b) && !level.goals.has(b));
  const index = levels.index;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Stored', value: `${boxesOnGoals(level, state)}/${state.boxes.length}` },
          { label: 'Pushes', value: snap.pushes },
          { label: 'Fewest', value: best },
          { label: 'Moves', value: snap.moves },
        ]}
      />
      <LevelPicker
        pack={pack}
        count={list.length}
        index={index}
        solved={levels.progress.solved}
        onPick={levels.select}
        formatBest={(p) => `${p} pushes`}
        disabled={shell.paused || !levels.ready}
      />
      <StatusBar>
        {done
          ? 'All boxes are on their spots!'
          : stuck
            ? 'A box is stuck where it can never reach a spot — undo (Z) to take it back.'
            : 'Push every box onto a marked spot. You can push, but never pull.'}
      </StatusBar>
      <div
        className={`sk-board${done ? ' pz-win' : ''}`}
        style={{ ['--w' as string]: level.w, ['--h' as string]: level.h }}
        role="application"
        aria-label={`Sokoban level ${index + 1}. ${boxesOnGoals(level, state)} of ${state.boxes.length} boxes stored. Arrow keys move, Z undoes.`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {Array.from({ length: level.w * level.h }, (_, i) => {
          const wall = level.walls.has(i);
          const floor = interior.has(i);
          if (!wall && !floor) return <div key={i} className="sk-void" />;
          if (wall) return <div key={i} className="sk-wall" />;
          const box = state.boxes.includes(i);
          const goal = level.goals.has(i);
          return (
            <div key={i} data-cell={i} className={`sk-floor${goal ? ' goal' : ''}`}>
              {box && <span className={`sk-box${goal ? ' home' : dead.has(i) ? ' stuck' : ''}`} />}
              {i === state.player && <span className="sk-keeper" />}
            </div>
          );
        })}
      </div>
      {coarse && !done && <DPad onPress={(d) => walk([d])} />}
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={undo} disabled={locked || !history.length}>
          ↶ Undo
        </button>
        <button type="button" className="btn btn-sm" onClick={restart} disabled={shell.paused || !levels.ready}>
          ↺ Reset level
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
