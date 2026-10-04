'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatClock } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { LevelPicker } from '../_shared/puzzle/LevelPicker';
import { usePackLevels, solvedInPack } from '../_shared/puzzle/levels';
import { useStopwatch } from '../_shared/puzzle/useStopwatch';
import { LEVELS_PER_PACK, blocker, generateLevel, scoreFor, stars } from './engine';
import type { Car, Lot } from './engine';
import './parking.css';

const ID = 'parking-puzzle';
const PAINT = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#f97316'];
const PACK_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const noSave = (_: unknown): _ is never => false;

export default function ParkingGame() {
  const shell = useGameShell();
  const pack = shell.difficulty;
  const levels = usePackLevels(ID, pack, LEVELS_PER_PACK, noSave, shell.requestRestart, {
    packNames: PACK_NAMES,
    better: (a, b) => a < b,
  });
  const [lot, setLot] = useState<Lot>(() => generateLevel(pack, 0));
  const [remaining, setRemaining] = useState<Set<number>>(() => new Set(lot.cars.map((_, k) => k)));
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const [bump, setBump] = useState<{ car: number; n: number } | null>(null);
  const [dents, setDents] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const timers = useRef<number[]>([]);
  // Refs mirror state so the delayed "car has left" step sees current values.
  const remainingRef = useRef(remaining);
  const dentsRef = useRef(0);

  const load = useCallback(
    (index: number) => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      const next = generateLevel(pack, index);
      const all = new Set(next.cars.map((_, k) => k));
      setLot(next);
      setRemaining(all);
      remainingRef.current = all;
      setLeaving(new Set());
      setBump(null);
      setDents(0);
      dentsRef.current = 0;
      setStarted(false);
      setDone(false);
      reset(0);
    },
    [pack, reset],
  );

  // Show the right level once saved progress has loaded.
  useEffect(() => {
    if (levels.ready) load(levels.indexRef.current);
  }, [levels.ready, levels.indexRef, load]);

  const restart = useCallback(() => load(levels.indexRef.current), [levels.indexRef, load]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const finish = useCallback(
    (dentCount: number) => {
      setDone(true);
      const ms = read();
      const index = levels.indexRef.current;
      levels.recordSolve(levels.key, dentCount);
      const s = stars(dentCount);
      void reportProgress('parking-puzzle.first', 1);
      void incrementProgress('parking-puzzle.twenty', 1);
      if (s === 3) void reportProgress('parking-puzzle.no-dents', 1);
      if (pack === 'hard' && index === LEVELS_PER_PACK - 1) void reportProgress('parking-puzzle.hard-final', 1);
      if (solvedInPack({ ...levels.progress.solved, [levels.key]: dentCount }, pack) === LEVELS_PER_PACK)
        void reportProgress('parking-puzzle.pack', 1);
      shell.endRound({
        won: true,
        score: scoreFor(lot.cars.length, dentCount, ms),
        timeMs: ms,
        title: `Lot cleared! ${'★'.repeat(s)}${'☆'.repeat(3 - s)}`,
        details: [
          { label: 'Level', value: `${PACK_NAMES[pack]} ${index + 1}` },
          { label: 'Dents', value: String(dentCount) },
        ],
        next:
          index < LEVELS_PER_PACK - 1
            ? { label: 'Next level →', action: () => levels.select(index + 1) }
            : undefined,
      });
    },
    [levels, lot.cars.length, pack, read, shell],
  );

  const drive = (k: number) => {
    if (shell.paused || done || !remainingRef.current.has(k) || leaving.has(k)) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    // Cars already driving away no longer block anyone.
    const present = new Set([...remainingRef.current].filter((j) => !leaving.has(j)));
    if (blocker(lot, present, k) >= 0) {
      const count = dentsRef.current + 1;
      dentsRef.current = count;
      setDents(count);
      setBump({ car: k, n: count });
      shell.play('hit');
      shell.vibrate(60);
      return;
    }
    shell.play('whoosh');
    setLeaving((l) => new Set(l).add(k));
    const t = window.setTimeout(() => {
      const next = new Set(remainingRef.current);
      next.delete(k);
      remainingRef.current = next;
      setRemaining(next);
      if (next.size === 0) finish(dentsRef.current);
      setLeaving((l) => {
        const next = new Set(l);
        next.delete(k);
        return next;
      });
    }, 380);
    timers.current.push(t);
  };

  const carsLeft = remaining.size - leaving.size;
  const index = levels.index;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Cars left', value: carsLeft },
          { label: 'Dents', value: dents },
          { label: 'Time', value: formatClock(elapsed) },
        ]}
      />
      <LevelPicker
        pack={pack}
        count={LEVELS_PER_PACK}
        index={index}
        solved={levels.progress.solved}
        onPick={levels.select}
        formatBest={(d) => (d === 0 ? '★★★' : `${d} dent${d === 1 ? '' : 's'}`)}
        disabled={shell.paused || !levels.ready}
      />
      <StatusBar>
        {done
          ? 'The lot is empty!'
          : 'Tap a car to drive it forwards. Only cars with a clear road ahead get out without a dent.'}
      </StatusBar>
      <div
        className="parking-lot"
        style={{ ['--w' as string]: lot.w, ['--h' as string]: lot.h }}
        role="group"
        aria-label={`Parking lot, ${carsLeft} cars left`}
      >
        {lot.bollards.map((b) => (
          <div
            key={`b${b}`}
            className="parking-bollard"
            style={{ left: `${((b % lot.w) / lot.w) * 100}%`, top: `${(Math.floor(b / lot.w) / lot.h) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        {lot.cars.map((car, k) =>
          remaining.has(k) ? (
            <CarButton
              key={k}
              car={car}
              lot={lot}
              leaving={leaving.has(k)}
              bumpKey={bump?.car === k ? bump.n : 0}
              onClick={() => drive(k)}
              disabled={shell.paused || done}
            />
          ) : null,
        )}
      </div>
    </BoardLayout>
  );
}

const ARROW: Record<Car['dir'], string> = { up: '↑', down: '↓', left: '←', right: '→' };

function CarButton({
  car,
  lot,
  leaving,
  bumpKey,
  onClick,
  disabled,
}: {
  car: Car;
  lot: Lot;
  leaving: boolean;
  bumpKey: number;
  onClick: () => void;
  disabled: boolean;
}) {
  const xs = car.cells.map((c) => c % lot.w);
  const ys = car.cells.map((c) => Math.floor(c / lot.w));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const wCells = Math.max(...xs) - x + 1;
  const hCells = Math.max(...ys) - y + 1;
  const far = Math.max(lot.w, lot.h) + 3;
  const out = { up: [0, -far], down: [0, far], left: [-far, 0], right: [far, 0] }[car.dir];
  const style = {
    left: `${(x / lot.w) * 100}%`,
    top: `${(y / lot.h) * 100}%`,
    width: `${(wCells / lot.w) * 100}%`,
    height: `${(hCells / lot.h) * 100}%`,
    ['--paint' as string]: PAINT[car.color],
    transform: leaving ? `translate(${(out[0] / wCells) * 100}%, ${(out[1] / hCells) * 100}%)` : undefined,
  };
  return (
    <button
      type="button"
      className={`parking-car dir-${car.dir}${leaving ? ' leaving' : ''}${bumpKey ? ' bump' : ''}`}
      style={style}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${car.cells.length === 3 ? 'Truck' : 'Car'} facing ${car.dir}`}
    >
      {/* Re-keyed on every bump so the shake animation replays. */}
      <span className="parking-body" key={bumpKey}>
        <span className="parking-glass" />
        <span className="parking-arrow" aria-hidden="true">
          {ARROW[car.dir]}
        </span>
      </span>
    </button>
  );
}
