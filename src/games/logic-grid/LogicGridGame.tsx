import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { isRecord, useSavedGame } from '../_shared/puzzle/useSavedGame';
import { clueText, emptyMarks, generate, marksSolve } from './engine';
import type { Marks, Puzzle } from './engine';
import './logic-grid.css';

const ID = 'logic-grid';

interface Saved {
  puzzle: Puzzle;
  marks: Marks;
  struck: number[];
  seconds: number;
  checks: number;
}

/** Saved puzzles are rebuilt from plain data, so check the shape carefully. */
function validSave(v: unknown): v is Saved {
  if (!isRecord(v) || !isRecord(v.puzzle) || !Array.isArray(v.marks) || !Array.isArray(v.struck)) return false;
  const p = v.puzzle as Record<string, unknown>;
  if (typeof p.n !== 'number' || p.n < 3 || p.n > 5 || !Array.isArray(p.categories) || !Array.isArray(p.solution) || !Array.isArray(p.clues)) return false;
  const n = p.n;
  const k = p.categories.length;
  const catsOk = (p.categories as unknown[]).every((c) => isRecord(c) && typeof c.name === 'string' && typeof c.phrase === 'string' && Array.isArray(c.items) && c.items.length === n && c.items.every((x) => typeof x === 'string'));
  const solOk = (p.solution as unknown[]).length === k && (p.solution as unknown[]).every((row) => Array.isArray(row) && row.length === n && row.every((x) => Number.isInteger(x) && x >= 0 && x < n));
  const refOk = (r: unknown) => isRecord(r) && Number.isInteger(r.cat) && (r.cat as number) >= 0 && (r.cat as number) < k && Number.isInteger(r.item) && (r.item as number) >= 0 && (r.item as number) < n;
  const cluesOk = (p.clues as unknown[]).every((c) => isRecord(c) && ['same', 'diff', 'older', 'either'].includes(String(c.kind)) && refOk(c.a) && refOk(c.b) && (c.kind !== 'either' || refOk(c.c)));
  const marksOk = (v.marks as unknown[]).length === n && (v.marks as unknown[]).every((row) => Array.isArray(row) && row.length === k && row.every((cell) => Array.isArray(cell) && cell.length === n && cell.every((m) => m === 0 || m === 1 || m === 2)));
  return catsOk && solOk && cluesOk && marksOk && typeof v.seconds === 'number' && typeof v.checks === 'number';
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function LogicGridGame() {
  const shell = useGameShell();
  const save = useSavedGame(ID, validSave);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generate(shell.difficulty, Math.random));
  const [marks, setMarks] = useState<Marks>(() => emptyMarks(puzzle.n, puzzle.categories.length));
  const [struck, setStruck] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [checks, setChecks] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [autoCross, setAutoCross] = useState(true);
  const [done, setDone] = useState(false);
  const [running, setRunning] = useState(false);
  const started = useRef(false);

  const pending = save.saved;
  const locked = shell.paused || done || !!pending || save.loading;

  useEffect(() => {
    if (locked || !running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [locked, running]);

  const fresh = useCallback(() => {
    const p = generate(shell.difficulty, Math.random);
    setPuzzle(p);
    setMarks(emptyMarks(p.n, p.categories.length));
    setStruck([]);
    setSeconds(0);
    setChecks(0);
    setMessage(null);
    setDone(false);
    setRunning(false);
    started.current = false;
  }, [shell.difficulty]);
  const restart = useCallback(() => {
    fresh();
    save.clear();
  }, [fresh, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  // The saved difficulty can arrive after the first render; match it before play starts.
  const expectedN = { easy: 3, normal: 4, hard: 5 }[shell.difficulty];
  useEffect(() => {
    if (!started.current && puzzle.n !== expectedN) fresh();
  }, [expectedN, puzzle.n, fresh]);

  const persist = (m: Marks, s: number[], c = checks) =>
    save.persist({ puzzle, marks: m, struck: s, seconds, checks: c }, { label: `${puzzle.n} people · ${fmt(seconds)}` });

  const touch = () => {
    if (!started.current) {
      started.current = true;
      setRunning(true);
      shell.startRound();
    }
  };

  const cycle = (person: number, cat: number, item: number) => {
    if (locked) return;
    touch();
    const next = marks.map((row) => row.map((cell) => [...cell]));
    const value = (next[person][cat][item] + 1) % 3;
    next[person][cat][item] = value;
    // A tick rules out the rest of its row and column within the category.
    if (value === 2 && autoCross) {
      for (let i = 0; i < puzzle.n; i++) if (i !== item && next[person][cat][i] === 0) next[person][cat][i] = 1;
      for (let p = 0; p < puzzle.n; p++) if (p !== person && next[p][cat][item] === 0) next[p][cat][item] = 1;
    }
    setMarks(next);
    setMessage(null);
    shell.play('click');
    if (marksSolve(puzzle, next)) finish(checks);
    else persist(next, struck);
  };

  const finish = (checkCount: number) => {
    setDone(true);
    save.clear();
    shell.play('levelComplete');
    void reportProgress('logic-grid.first', 1);
    if (puzzle.n === 5) void reportProgress('logic-grid.hard', 1);
    if (checkCount === 0) void reportProgress('logic-grid.clean', 1);
    void incrementProgress('logic-grid.solved');
    const base = { 3: 300, 4: 600, 5: 1000 }[puzzle.n] ?? 300;
    shell.endRound({
      won: true,
      score: Math.max(50, base - seconds - checkCount * 40),
      timeMs: seconds * 1000,
      title: 'Case closed!',
      details: [
        { label: 'People', value: String(puzzle.n) },
        { label: 'Time', value: fmt(seconds) },
        { label: 'Checks used', value: String(checkCount) },
      ],
    });
  };

  /** Tells the player whether any tick or cross contradicts the solution. */
  const check = () => {
    if (locked) return;
    touch();
    let wrong = 0;
    marks.forEach((row, person) =>
      row.forEach((cell, c) => {
        if (c === 0) return;
        cell.forEach((m, item) => {
          const truth = puzzle.solution[c][person] === item;
          if ((m === 2 && !truth) || (m === 1 && truth)) wrong++;
        });
      }),
    );
    const c = checks + 1;
    setChecks(c);
    setMessage(wrong ? `${wrong} mark${wrong === 1 ? ' is' : 's are'} wrong.` : 'Everything so far is correct.');
    shell.play(wrong ? 'failure' : 'success');
    persist(marks, struck, c);
  };

  const toggleClue = (i: number) => {
    const s = struck.includes(i) ? struck.filter((x) => x !== i) : [...struck, i];
    setStruck(s);
    if (started.current) persist(marks, s);
  };

  const resume = () => {
    if (!pending) return;
    setPuzzle(pending.puzzle);
    setMarks(pending.marks);
    setStruck(pending.struck);
    setSeconds(pending.seconds);
    setChecks(pending.checks);
    started.current = false;
    save.dismiss();
  };

  const cats = puzzle.categories;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'People', value: puzzle.n },
          { label: 'Clues', value: puzzle.clues.length },
          { label: 'Time', value: fmt(seconds) },
        ]}
      />
      {pending && <ResumePrompt label={`${pending.puzzle.n} people · ${fmt(pending.seconds)}`} onContinue={resume} onNew={restart} />}
      <StatusBar>{done ? 'Solved — every match is right!' : (message ?? 'Tap a cell: once for ✗, twice for ✓.')}</StatusBar>
      <ol className="lg-clues">
        {puzzle.clues.map((c, i) => (
          <li key={i}>
            <button type="button" className={struck.includes(i) ? 'done' : ''} onClick={() => toggleClue(i)} aria-pressed={struck.includes(i)}>
              {clueText(cats, c)}
            </button>
          </li>
        ))}
      </ol>
      <div className="lg-wrap">
        <table className="lg-table">
          <thead>
            <tr>
              <th rowSpan={2} />
              {cats.slice(1).map((c) => (
                <th key={c.name} colSpan={puzzle.n} className="lg-cat">
                  {c.name}
                </th>
              ))}
            </tr>
            <tr>
              {cats.slice(1).map((c) =>
                c.items.map((item, i) => (
                  <th key={`${c.name}-${item}`} className={`lg-item${i === 0 ? ' first' : ''}`}>
                    <span>{item}</span>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {cats[0].items.map((name, person) => (
              <tr key={name}>
                <th scope="row" className="lg-name">
                  {name}
                </th>
                {cats.slice(1).map((c, ci) =>
                  c.items.map((item, i) => {
                    const m = marks[person][ci + 1][i];
                    return (
                      <td key={`${c.name}-${item}`} className={i === 0 ? 'first' : ''}>
                        <button
                          type="button"
                          className={`lg-cell m${m}`}
                          onClick={() => cycle(person, ci + 1, i)}
                          disabled={locked}
                          aria-label={`${name} and ${item}: ${m === 2 ? 'yes' : m === 1 ? 'no' : 'unknown'}`}
                        >
                          {m === 2 ? '✓' : m === 1 ? '✗' : ''}
                        </button>
                      </td>
                    );
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PuzzleActions>
        <button type="button" className="btn" onClick={check} disabled={locked}>
          🔍 Check marks
        </button>
        <label className="row small" style={{ gap: 6 }}>
          <input type="checkbox" checked={autoCross} onChange={(e) => setAutoCross(e.target.checked)} /> Auto-✗ after ✓
        </label>
        <button type="button" className="btn" onClick={restart} disabled={shell.paused}>
          🔀 New puzzle
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
