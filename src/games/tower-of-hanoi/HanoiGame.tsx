'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useDirectionKeys } from '../_shared/puzzle/useDirectionKeys';
import {
  DISCS,
  canMove,
  initial,
  isSolved,
  minMoves,
  move,
  movesRemaining,
  nextOptimalMove,
  scoreFor,
  top,
  validSave,
} from './engine';
import type { Pegs } from './engine';
import './hanoi.css';

const ID = 'tower-of-hanoi';
const PEG_NAMES = ['left', 'middle', 'right'];

function discColor(d: number, discs: number) {
  return `hsl(${(d / discs) * 300 + 10} 72% 55%)`;
}

export default function HanoiGame() {
  const shell = useGameShell();
  const discs = DISCS[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [pegs, setPegs] = useState<Pegs>(() => initial(discs));
  const [selected, setSelected] = useState<number | null>(null);
  const [focusPeg, setFocusPeg] = useState(0);
  const [moves, setMoves] = useState(0);
  const [hints, setHints] = useState(0);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const startedRef = useRef(false);
  const dragFrom = useRef<number | null>(null);
  const pegRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const pending = save.saved && save.saved.discs === discs ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;
  const best = minMoves(discs);

  const restart = useCallback(() => {
    setPegs(initial(discs));
    setSelected(null);
    setMoves(0);
    setHints(0);
    setHint(null);
    setDone(false);
    setNote(null);
    startedRef.current = false;
    save.clear();
  }, [discs, save]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = useCallback(
    (moveCount: number, hintCount: number) => {
      setDone(true);
      save.clear();
      const perfect = moveCount === best;
      void reportProgress('tower-of-hanoi.first', 1);
      if (perfect) void reportProgress('tower-of-hanoi.perfect', 1);
      if (discs === 5 && perfect) void reportProgress('tower-of-hanoi.five', 1);
      if (discs === 7) void reportProgress('tower-of-hanoi.seven', 1);
      if (discs === 7 && perfect) void reportProgress('tower-of-hanoi.monk', 1);
      shell.endRound({
        won: true,
        score: scoreFor(discs, moveCount, hintCount),
        title: perfect ? 'Perfect tower!' : 'Tower moved!',
        message: perfect ? `The minimum possible: ${best} moves.` : undefined,
        details: [
          { label: 'Discs', value: String(discs) },
          { label: 'Moves', value: `${moveCount} (best ${best})` },
          { label: 'Hints', value: String(hintCount) },
        ],
      });
    },
    [best, discs, save, shell],
  );

  const tryMove = useCallback(
    (from: number, to: number) => {
      const next = move(pegs, from, to);
      setSelected(null);
      if (!next) {
        if (from !== to) {
          setNote('A disc can only go on an empty peg or a larger disc.');
          shell.play('failure');
        }
        return;
      }
      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }
      const count = moves + 1;
      setPegs(next);
      setMoves(count);
      setHint(null);
      setNote(null);
      shell.play('click');
      if (isSolved(next, discs)) finish(count, hints);
      else
        save.persist(
          { discs, pegs: next, moves: count, hints },
          {
            percent: Math.round((next[2].length / discs) * 100),
            label: `${discs} discs · ${count} moves`,
          },
        );
    },
    [discs, finish, hints, moves, pegs, save, shell],
  );

  const choosePeg = useCallback(
    (p: number) => {
      if (locked) return;
      setFocusPeg(p);
      if (selected === null) {
        if (pegs[p].length) setSelected(p);
      } else if (selected === p) {
        setSelected(null);
      } else {
        tryMove(selected, p);
      }
    },
    [locked, pegs, selected, tryMove],
  );

  // Keyboard: 1/2/3 pick pegs directly; left/right move the focus between pegs.
  useDirectionKeys(
    (dir) => {
      if (dir === 'left' || dir === 'right') {
        const next = (focusPeg + (dir === 'left' ? 2 : 1)) % 3;
        setFocusPeg(next);
        pegRefs.current[next]?.focus();
      }
    },
    !locked,
    { '1': () => choosePeg(0), '2': () => choosePeg(1), '3': () => choosePeg(2) },
  );

  // Dragging a disc: press on one peg, release over another.
  const onPointerDown = (p: number, e: ReactPointerEvent) => {
    if (locked || e.button !== 0 || !pegs[p].length || selected !== null) return;
    dragFrom.current = p;
  };
  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      const from = dragFrom.current;
      dragFrom.current = null;
      if (from === null) return;
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-peg]');
      const to = el ? Number((el as HTMLElement).dataset.peg) : -1;
      if (to >= 0 && to !== from) tryMove(from, to);
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [tryMove]);

  const showHint = () => {
    if (locked) return;
    const m = nextOptimalMove(pegs, discs);
    if (!m) return;
    setHint(m);
    setHints(hints + 1);
    setNote(`Hint: move the top disc from the ${PEG_NAMES[m[0]]} peg to the ${PEG_NAMES[m[1]]} peg.`);
  };

  const resume = () => {
    if (!pending) return;
    setPegs(pending.pegs);
    setMoves(pending.moves);
    setHints(pending.hints);
    save.dismiss();
  };

  const remaining = movesRemaining(pegs, discs);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Moves', value: moves },
          { label: 'Best possible', value: best },
          { label: 'Still needed', value: remaining },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.discs} discs · ${pending.moves} moves`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {done
          ? 'The tower is rebuilt!'
          : (note ??
            (selected !== null
              ? `Now choose where the disc from the ${PEG_NAMES[selected]} peg goes.`
              : 'Move the whole tower to the right peg. Never put a disc on a smaller one.'))}
      </StatusBar>
      <div className={`hanoi${done ? ' pz-win' : ''}`} style={{ ['--discs' as string]: discs }}>
        {pegs.map((peg, p) => {
          const isFrom = hint?.[0] === p;
          const isTo = hint?.[1] === p;
          const legal = selected !== null && selected !== p && canMove(pegs, selected, p);
          return (
            <button
              key={p}
              type="button"
              data-peg={p}
              ref={(el) => {
                pegRefs.current[p] = el;
              }}
              className={`hanoi-peg${selected === p ? ' sel' : ''}${legal ? ' legal' : ''}${isFrom ? ' hint-from' : ''}${isTo ? ' hint-to' : ''}${p === 2 ? ' goal' : ''}`}
              onClick={() => choosePeg(p)}
              onPointerDown={(e) => onPointerDown(p, e)}
              onFocus={() => setFocusPeg(p)}
              disabled={locked}
              aria-label={`${PEG_NAMES[p]} peg${p === 2 ? ' (goal)' : ''}, ${peg.length ? `${peg.length} discs, top disc size ${top(peg)}` : 'empty'}${selected === p ? ', selected' : ''}`}
            >
              <span className="hanoi-rod" aria-hidden="true" />
              <span className="hanoi-stack" aria-hidden="true">
                {peg.map((d, i) => (
                  <span
                    key={d}
                    className={`hanoi-disc${selected === p && i === peg.length - 1 ? ' lifted' : ''}`}
                    style={{
                      width: `${28 + (d / discs) * 68}%`,
                      background: discColor(d, discs),
                    }}
                  >
                    {d}
                  </span>
                ))}
              </span>
              <span className="hanoi-label" aria-hidden="true">
                {p + 1}
                {p === 2 ? ' ★' : ''}
              </span>
            </button>
          );
        })}
      </div>
      <PuzzleActions>
        <button type="button" className="btn" onClick={showHint} disabled={locked}>
          💡 Hint
        </button>
        <button type="button" className="btn" onClick={restart} disabled={shell.paused}>
          ↺ Start over
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
