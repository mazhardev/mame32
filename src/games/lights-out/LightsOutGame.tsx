'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useGridCursor } from '../_shared/puzzle/useGridCursor';
import { LEVELS, allOff, generate, litCount, press, scoreFor, solve, validSave } from './engine';
import type { Lights } from './engine';
import './lights.css';

const ID = 'lights-out';

function fresh(level: (typeof LEVELS)['easy']) {
  const lights = generate(level);
  return { lights, par: solve(lights, level.n)?.length ?? 0 };
}

export default function LightsOutGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const { n } = level;
  const save = useSavedGame(ID, validSave);
  const [puzzle, setPuzzle] = useState(() => fresh(level));
  const [lights, setLights] = useState<Lights>(puzzle.lights);
  const [moves, setMoves] = useState(0);
  const [hints, setHints] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);
  const { cellProps } = useGridCursor(n, n, Math.floor((n * n) / 2));

  const pending = save.saved && save.saved.n === n ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;

  const restart = useCallback(() => {
    const p = fresh(level);
    setPuzzle(p);
    setLights(p.lights);
    setMoves(0);
    setHints(0);
    setHint(null);
    setDone(false);
    startedRef.current = false;
    save.clear();
  }, [level, save]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = useCallback(
    (moveCount: number, hintCount: number) => {
      setDone(true);
      save.clear();
      const perfect = moveCount <= puzzle.par;
      void reportProgress('lights-out.first', 1);
      void incrementProgress('lights-out.ten');
      if (perfect) void reportProgress('lights-out.par', 1);
      if (n === 7) void reportProgress('lights-out.big', 1);
      if (n === 7 && hintCount === 0) void reportProgress('lights-out.big-clean', 1);
      shell.endRound({
        won: true,
        score: scoreFor(n, moveCount, puzzle.par, hintCount),
        title: perfect ? 'Lights out — in par!' : 'Lights out!',
        details: [
          { label: 'Presses', value: String(moveCount) },
          { label: 'Par', value: String(puzzle.par) },
          { label: 'Hints', value: String(hintCount) },
        ],
      });
    },
    [n, puzzle.par, save, shell],
  );

  const onPress = (i: number) => {
    if (locked) return;
    if (!startedRef.current) {
      startedRef.current = true;
      shell.startRound();
    }
    const next = press(lights, n, i);
    const count = moves + 1;
    setLights(next);
    setMoves(count);
    setHint(null);
    shell.play('click');
    if (allOff(next)) finish(count, hints);
    else
      save.persist(
        { n, lights: next, moves: count, par: puzzle.par, hints },
        { label: `${n}×${n} · ${litCount(next)} lights on · ${count} presses` },
      );
  };

  const showHint = () => {
    if (locked) return;
    const plan = solve(lights, n);
    if (!plan?.length) return;
    setHint(plan[0]);
    setHints(hints + 1);
  };

  const resume = () => {
    if (!pending) return;
    setPuzzle({ lights: pending.lights, par: pending.par });
    setLights(pending.lights);
    setMoves(pending.moves);
    setHints(pending.hints);
    save.dismiss();
  };

  const lit = useMemo(() => litCount(lights), [lights]);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Lights on', value: lit },
          { label: 'Presses', value: moves },
          { label: 'Par', value: puzzle.par },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.n}×${pending.n} · ${litCount(pending.lights)} lights on · ${pending.moves} presses`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {done
          ? 'Every light is off!'
          : 'Pressing a light flips it and its neighbours. Switch them all off.'}
      </StatusBar>
      <div
        className={`pz-grid lo-grid${done ? ' pz-win' : ''}`}
        style={{ ['--n' as string]: n, ['--max' as string]: n === 7 ? '500px' : '420px' }}
        role="grid"
        aria-label={`Lights Out, ${n} by ${n}`}
      >
        {lights.map((on, i) => (
          <button
            key={i}
            type="button"
            className={`pz-cell lo-cell${on ? ' on' : ''}${hint === i ? ' hint' : ''}`}
            onClick={() => onPress(i)}
            disabled={locked}
            aria-pressed={on}
            aria-label={`Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}, ${on ? 'on' : 'off'}${hint === i ? ', suggested' : ''}`}
            {...cellProps(i)}
          />
        ))}
      </div>
      <PuzzleActions>
        <button type="button" className="btn" onClick={showHint} disabled={locked}>
          💡 Hint
        </button>
        <button type="button" className="btn" onClick={restart} disabled={shell.paused}>
          🔀 New puzzle
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
