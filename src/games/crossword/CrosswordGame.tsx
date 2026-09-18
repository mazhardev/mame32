import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { clearProgress, loadProgress, saveProgress } from '@/storage/StorageService';
import { createRng } from '@/utils/random';
import { WordKeyboard, WordLayout, WordToast, useLetterKeys } from '../_shared/words/WordUI';
import { CLUES } from './clues';
import { cellsOf, generate, isComplete } from './engine';
import type { Dir, Placed, Puzzle } from './engine';
import './crossword.css';

const GAME_ID = 'crossword';
const LEVELS = {
  easy: { size: 9, target: 7 },
  normal: { size: 11, target: 10 },
  hard: { size: 13, target: 14 },
} as const;

interface Saved {
  puzzle: Puzzle;
  letters: (string | null)[];
  reveals: number;
  checks: number;
  difficulty: string;
}

export default function CrosswordGame() {
  const shell = useGameShell();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [letters, setLetters] = useState<(string | null)[]>([]);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [dir, setDir] = useState<Dir>('across');
  const [reveals, setReveals] = useState(0);
  const [checks, setChecks] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const begin = useCallback(
    (p: Puzzle, l: (string | null)[], r = 0, c = 0) => {
      setPuzzle(p);
      setLetters(l);
      setReveals(r);
      setChecks(c);
      setWrong(new Set());
      setDone(false);
      setMessage(null);
      const first = p.entries[0];
      setCursor(first ? first.row * p.size + first.col : 0);
      setDir(first?.dir ?? 'across');
      setSaved(null);
      if (!started.current) {
        started.current = true;
        shell.startRound();
      }
    },
    [shell],
  );

  const newPuzzle = useCallback(() => {
    const { size, target } = LEVELS[shell.difficulty];
    const p = generate(createRng(Date.now()), CLUES, size, target);
    started.current = false;
    begin(
      p,
      p.cells.map(() => null),
    );
  }, [begin, shell.difficulty]);

  // Offer to continue a saved puzzle; otherwise start a new one.
  useEffect(() => {
    let cancelled = false;
    void loadProgress<Saved>(GAME_ID).then((s) => {
      if (cancelled) return;
      if (
        s?.puzzle?.cells &&
        Array.isArray(s.letters) &&
        s.letters.length === s.puzzle.cells.length
      )
        setSaved(s);
      else newPuzzle();
    });
    return () => {
      cancelled = true;
    };
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => shell.registerRestart(newPuzzle), [shell, newPuzzle]);

  // Autosave, debounced.
  useEffect(() => {
    if (!puzzle || done) return;
    const filled = letters.filter((l, i) => l && puzzle.cells[i]).length;
    const total = puzzle.cells.filter(Boolean).length;
    if (!filled) return;
    const id = window.setTimeout(() => {
      void saveProgress(
        GAME_ID,
        { puzzle, letters, reveals, checks, difficulty: shell.difficulty } satisfies Saved,
        {
          percent: Math.round((filled / total) * 100),
          label: `${Math.round((filled / total) * 100)}% complete`,
        },
      );
    }, 500);
    return () => window.clearTimeout(id);
  }, [puzzle, letters, reveals, checks, done, shell.difficulty]);

  const entryAt = useCallback(
    (cell: number, d: Dir): Placed | undefined =>
      puzzle?.entries.find((e) => e.dir === d && cellsOf(e, puzzle.size).includes(cell)),
    [puzzle],
  );

  const active = puzzle
    ? (entryAt(cursor, dir) ?? entryAt(cursor, dir === 'across' ? 'down' : 'across'))
    : undefined;
  const activeCells = useMemo(
    () => (active && puzzle ? cellsOf(active, puzzle.size) : []),
    [active, puzzle],
  );

  const finishIfDone = (next: (string | null)[], newReveals = 0) => {
    if (!puzzle || !isComplete(puzzle, next)) return;
    setDone(true);
    shell.play('levelComplete');
    const totalReveals = reveals + newReveals;
    const score = Math.max(50, puzzle.entries.length * 100 - totalReveals * 30 - checks * 10);
    void clearProgress(GAME_ID);
    void reportProgress('crossword.first', 1);
    if (totalReveals === 0) void reportProgress('crossword.no-reveal', 1);
    if (shell.difficulty === 'hard') void reportProgress('crossword.hard', 1);
    shell.endRound({
      score,
      won: true,
      title: 'Crossword complete!',
      details: [
        { label: 'Words', value: String(puzzle.entries.length) },
        { label: 'Letters revealed', value: String(totalReveals) },
        { label: 'Checks used', value: String(checks) },
      ],
    });
  };

  const move = (step: number) => {
    if (!active || !puzzle) return;
    const idx = activeCells.indexOf(cursor);
    const next = activeCells[idx + step];
    if (next !== undefined) setCursor(next);
  };

  const onKey = (key: string) => {
    if (!puzzle || done || shell.paused || !active) return;
    if (key === 'enter') {
      // Jump to the next clue.
      const i = puzzle.entries.indexOf(active);
      const n = puzzle.entries[(i + 1) % puzzle.entries.length];
      setDir(n.dir);
      setCursor(n.row * puzzle.size + n.col);
      return;
    }
    if (key === 'backspace') {
      const next = [...letters];
      if (next[cursor]) next[cursor] = null;
      else move(-1);
      setLetters(next);
      return;
    }
    const next = [...letters];
    next[cursor] = key;
    setLetters(next);
    setWrong((w) => {
      const copy = new Set(w);
      copy.delete(cursor);
      return copy;
    });
    move(1);
    finishIfDone(next);
  };

  useLetterKeys(onKey, !!puzzle && !done && !shell.paused);

  // Arrow keys move the cursor across the grid.
  useEffect(() => {
    if (!puzzle || done) return;
    const handler = (e: KeyboardEvent) => {
      const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[
        e.key
      ];
      if (!d) return;
      e.preventDefault();
      setDir(d[0] === 0 ? 'across' : 'down');
      let r = Math.floor(cursor / puzzle.size) + d[0];
      let c = (cursor % puzzle.size) + d[1];
      while (r >= 0 && c >= 0 && r < puzzle.size && c < puzzle.size) {
        if (puzzle.cells[r * puzzle.size + c]) return setCursor(r * puzzle.size + c);
        r += d[0];
        c += d[1];
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cursor, done, puzzle]);

  if (saved && !puzzle) {
    return (
      <div className="word-layout">
        <div className="word-panel">
          <p>You have a crossword in progress.</p>
          <div className="row">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => begin(saved.puzzle, saved.letters, saved.reveals, saved.checks)}
            >
              Continue
            </button>
            <button
              className="btn btn-lg"
              onClick={() => {
                void clearProgress(GAME_ID);
                newPuzzle();
              }}
            >
              New puzzle
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!puzzle) return null;

  // Crop to the used area so the grid can be as large as possible.
  const used = puzzle.cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  const rows = used.map((i) => Math.floor(i / puzzle.size));
  const cols = used.map((i) => i % puzzle.size);
  const [r0, r1, c0, c1] = [
    Math.min(...rows),
    Math.max(...rows),
    Math.min(...cols),
    Math.max(...cols),
  ];
  const numbers = new Map(puzzle.entries.map((e) => [e.row * puzzle.size + e.col, e.number]));

  const check = () => {
    const bad = new Set<number>();
    letters.forEach((l, i) => {
      if (l && puzzle.cells[i] && l !== puzzle.cells[i]) bad.add(i);
    });
    setWrong(bad);
    setChecks((c) => c + 1);
    setMessage(
      bad.size
        ? `${bad.size} letter${bad.size === 1 ? ' is' : 's are'} wrong`
        : 'Everything so far is correct!',
    );
  };

  const reveal = (cells: number[]) => {
    const next = [...letters];
    let n = 0;
    for (const i of cells) {
      if (next[i] !== puzzle.cells[i]) {
        next[i] = puzzle.cells[i];
        n++;
      }
    }
    setLetters(next);
    setReveals((r) => r + n);
    finishIfDone(next, n);
  };

  const filled = letters.filter((l, i) => l && puzzle.cells[i]).length;
  const total = puzzle.cells.filter(Boolean).length;

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Filled', value: `${filled}/${total}` },
          { label: 'Reveals', value: reveals },
          { label: 'Checks', value: checks },
        ]}
      />
      {active && (
        <div className="cw-clue" aria-live="polite">
          <strong>
            {active.number} {active.dir === 'across' ? 'Across' : 'Down'}
          </strong>{' '}
          {active.clue} ({active.answer.length})
        </div>
      )}
      <div
        className="cw-grid"
        role="grid"
        aria-label="Crossword grid"
        style={{ gridTemplateColumns: `repeat(${c1 - c0 + 1}, var(--cw-cell))` }}
      >
        {Array.from({ length: (r1 - r0 + 1) * (c1 - c0 + 1) }, (_, k) => {
          const r = r0 + Math.floor(k / (c1 - c0 + 1));
          const c = c0 + (k % (c1 - c0 + 1));
          const i = r * puzzle.size + c;
          if (!puzzle.cells[i]) return <div key={i} className="cw-block" aria-hidden="true" />;
          const cls = [
            'cw-cell',
            i === cursor ? 'cursor' : '',
            activeCells.includes(i) ? 'active' : '',
            wrong.has(i) ? 'wrong' : '',
          ].join(' ');
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={cls}
              aria-label={`Row ${r - r0 + 1}, column ${c - c0 + 1}${letters[i] ? `, ${letters[i]}` : ', empty'}`}
              onClick={() => {
                if (i === cursor)
                  setDir((d) =>
                    entryAt(i, d === 'across' ? 'down' : 'across')
                      ? d === 'across'
                        ? 'down'
                        : 'across'
                      : d,
                  );
                else setCursor(i);
              }}
            >
              {numbers.has(i) && <small>{numbers.get(i)}</small>}
              {letters[i] ?? ''}
            </button>
          );
        })}
      </div>
      <WordToast message={message} />
      {!done && (
        <>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={check} disabled={shell.paused}>
              Check
            </button>
            <button className="btn" onClick={() => reveal([cursor])} disabled={shell.paused}>
              Reveal letter
            </button>
            <button className="btn" onClick={() => reveal(activeCells)} disabled={shell.paused}>
              Reveal word
            </button>
          </div>
          <WordKeyboard onKey={onKey} disabled={shell.paused} enterLabel="Next" />
        </>
      )}
      <div className="cw-clues">
        {(['across', 'down'] as const).map((d) => (
          <div key={d}>
            <h3>{d === 'across' ? 'Across' : 'Down'}</h3>
            <ol>
              {puzzle.entries
                .filter((e) => e.dir === d)
                .map((e) => {
                  const solved = cellsOf(e, puzzle.size).every(
                    (i) => letters[i] === puzzle.cells[i],
                  );
                  return (
                    <li
                      key={`${d}${e.number}`}
                      value={e.number}
                      className={active === e ? 'current' : ''}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setDir(e.dir);
                          setCursor(e.row * puzzle.size + e.col);
                        }}
                        style={
                          solved ? { textDecoration: 'line-through', opacity: 0.6 } : undefined
                        }
                      >
                        {e.clue} ({e.answer.length})
                      </button>
                    </li>
                  );
                })}
            </ol>
          </div>
        ))}
      </div>
    </WordLayout>
  );
}
