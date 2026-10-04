'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  CAPACITY,
  LEVELS,
  canMove,
  generate,
  isSolved,
  moveBall,
  scoreFor,
  solve,
  sortedCount,
  validSave,
} from './engine';
import type { BallSortSave, Move, Tubes } from './engine';
import './ballsort.css';

const ID = 'ball-sort';

/** Colour plus a symbol, so every ball is distinguishable without colour vision. */
const BALLS: { color: string; mark: string; name: string }[] = [
  { color: '#e11d48', mark: '●', name: 'red' },
  { color: '#2563eb', mark: '▲', name: 'blue' },
  { color: '#16a34a', mark: '■', name: 'green' },
  { color: '#eab308', mark: '★', name: 'yellow' },
  { color: '#9333ea', mark: '◆', name: 'purple' },
  { color: '#f97316', mark: '♥', name: 'orange' },
  { color: '#06b6d4', mark: '✚', name: 'cyan' },
  { color: '#ec4899', mark: '♠', name: 'pink' },
  { color: '#84cc16', mark: '♣', name: 'lime' },
  { color: '#92400e', mark: '⬟', name: 'brown' },
  { color: '#e5e7eb', mark: '✦', name: 'white' },
  { color: '#1e3a8a', mark: '☾', name: 'navy' },
];

export default function BallSortGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [tubes, setTubes] = useState<Tubes>(() => generate(level.colors, level.empty));
  const [history, setHistory] = useState<Tubes[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [hints, setHints] = useState(0);
  const [undos, setUndos] = useState(0);
  const [extraTube, setExtraTube] = useState(false);
  const [hint, setHint] = useState<Move | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  const pending = save.saved && save.saved.colors === level.colors ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;

  const restart = useCallback(() => {
    setTubes(generate(level.colors, level.empty));
    setHistory([]);
    setSelected(null);
    setMoves(0);
    setHints(0);
    setUndos(0);
    setExtraTube(false);
    setHint(null);
    setNote(null);
    setDone(false);
    startedRef.current = false;
    save.clear();
  }, [level, save]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const persist = (state: BallSortSave) =>
    save.persist(state, {
      percent: Math.round((sortedCount(state.tubes) / state.colors) * 100),
      label: `${state.colors} colours · ${sortedCount(state.tubes)} sorted · ${state.moves} moves`,
    });

  const finish = (moveCount: number, stats: { hints: number; undos: number; extra: boolean }) => {
    setDone(true);
    save.clear();
    void reportProgress('ball-sort.first', 1);
    void incrementProgress('ball-sort.ten');
    if (level.colors >= 10) void reportProgress('ball-sort.hard', 1);
    if (stats.undos === 0 && stats.hints === 0 && !stats.extra)
      void reportProgress('ball-sort.clean', 1);
    if (level.colors >= 7 && moveCount <= level.colors * 6) void reportProgress('ball-sort.swift', 1);
    shell.endRound({
      won: true,
      score: scoreFor(level.colors, moveCount, stats.hints, stats.extra),
      title: 'All sorted!',
      details: [
        { label: 'Colours', value: String(level.colors) },
        { label: 'Moves', value: String(moveCount) },
        { label: 'Undos', value: String(stats.undos) },
        { label: 'Hints', value: String(stats.hints) },
      ],
    });
  };

  const tryMove = (from: number, to: number) => {
    const next = moveBall(tubes, from, to);
    setSelected(null);
    if (!next) {
      setNote('A ball can only go into an empty tube or onto a ball of the same colour.');
      shell.play('failure');
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      shell.startRound();
    }
    const count = moves + 1;
    setHistory([...history, tubes]);
    setTubes(next);
    setMoves(count);
    setHint(null);
    setNote(null);
    const justSorted = sortedCount(next) > sortedCount(tubes);
    shell.play(justSorted ? 'success' : 'pop');
    if (isSolved(next)) finish(count, { hints, undos, extra: extraTube });
    else persist({ tubes: next, colors: level.colors, moves: count, hints, undos, extraTube });
  };

  const onTube = (i: number) => {
    if (locked) return;
    if (selected === null) {
      if (tubes[i].length) setSelected(i);
      return;
    }
    if (selected === i) setSelected(null);
    else tryMove(selected, i);
  };

  const undo = () => {
    if (locked || !history.length) return;
    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setTubes(prev);
    setSelected(null);
    setHint(null);
    setUndos(undos + 1);
    persist({ tubes: prev, colors: level.colors, moves, hints, undos: undos + 1, extraTube });
  };

  const showHint = () => {
    if (locked) return;
    const plan = solve(tubes);
    if (!plan) {
      setNote('No solution from here — undo a few moves or add a tube.');
      return;
    }
    setHint(plan[0]);
    setHints(hints + 1);
    setNote('Hint: move the ball from the highlighted tube to the dashed one.');
  };

  const addTube = () => {
    if (locked || extraTube) return;
    const next = [...tubes, []];
    setTubes(next);
    setExtraTube(true);
    setHint(null);
    setNote('An extra empty tube was added (−200 points).');
    persist({ tubes: next, colors: level.colors, moves, hints, undos, extraTube: true });
  };

  const resume = () => {
    if (!pending) return;
    setTubes(pending.tubes);
    setMoves(pending.moves);
    setHints(pending.hints);
    setUndos(pending.undos);
    setExtraTube(pending.extraTube);
    save.dismiss();
  };

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Sorted', value: `${sortedCount(tubes)}/${level.colors}` },
          { label: 'Moves', value: moves },
          { label: 'Undos', value: undos },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.colors} colours · ${sortedCount(pending.tubes)} sorted · ${pending.moves} moves`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {done
          ? 'Every tube holds one colour!'
          : (note ?? 'Sort the balls so each tube holds four of one colour.')}
      </StatusBar>
      <div className={`bs-rack${done ? ' pz-win' : ''}`}>
        {tubes.map((tube, i) => {
          const legal = selected !== null && selected !== i && canMove(tubes, selected, i);
          const isComplete =
            tube.length === CAPACITY && tube.every((c) => c === tube[0]);
          return (
            <button
              key={i}
              type="button"
              className={`bs-tube${selected === i ? ' sel' : ''}${legal ? ' legal' : ''}${hint?.[0] === i ? ' hint-from' : ''}${hint?.[1] === i ? ' hint-to' : ''}${isComplete ? ' full' : ''}`}
              onClick={() => onTube(i)}
              disabled={locked}
              aria-label={`Tube ${i + 1}: ${tube.length ? tube.map((c) => BALLS[c].name).join(', ') : 'empty'}, bottom to top${selected === i ? ', selected' : ''}`}
            >
              {tube.map((c, j) => (
                <span
                  key={j}
                  className={`bs-ball${selected === i && j === tube.length - 1 ? ' lifted' : ''}`}
                  style={{
                    background: BALLS[c].color,
                    ['--lift' as string]: CAPACITY - tube.length,
                  }}
                  aria-hidden="true"
                >
                  {BALLS[c].mark}
                </span>
              ))}
            </button>
          );
        })}
      </div>
      <PuzzleActions>
        <button type="button" className="btn" onClick={undo} disabled={locked || !history.length}>
          ↶ Undo
        </button>
        <button type="button" className="btn" onClick={showHint} disabled={locked}>
          💡 Hint
        </button>
        <button type="button" className="btn" onClick={addTube} disabled={locked || extraTube}>
          ➕ Extra tube
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
