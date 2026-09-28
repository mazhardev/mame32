import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  boardFromSave,
  combos,
  duplicates,
  generate,
  isSolved,
  runStatus,
  scoreFor,
  validSave,
} from './engine';
import type { Board } from './engine';
import './kakuro.css';

const ID = 'kakuro';

function firstFree(board: Board): number {
  return board.white.findIndex((w, i) => w && !board.givens[i]);
}

export default function KakuroGame() {
  const shell = useGameShell();
  const n = SIZES[shell.difficulty];
  const save = useSavedGame(ID, validSave);
  const [board, setBoard] = useState<Board>(() => generate(n));
  const [entries, setEntries] = useState<number[]>(() => board.givens.slice());
  const [selected, setSelected] = useState(() => firstFree(board));
  const [checks, setChecks] = useState(0);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { elapsed, read, reset } = useStopwatch(started && !done && !shell.paused);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wrongTimer = useRef<number | undefined>();

  const pending = save.saved && save.saved.n === n ? save.saved : null;
  const locked = shell.paused || done || !!pending || save.loading;

  const restart = useCallback(() => {
    const b = generate(n);
    setBoard(b);
    setEntries(b.givens.slice());
    setSelected(firstFree(b));
    setChecks(0);
    setWrong(new Set());
    setStarted(false);
    setDone(false);
    reset(0);
    save.clear();
  }, [n, reset, save]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => window.clearTimeout(wrongTimer.current), []);

  const status = useMemo(() => runStatus(board, entries), [board, entries]);
  const dupes = useMemo(() => duplicates(board, entries), [board, entries]);

  const setDigit = useCallback(
    (value: number) => {
      if (locked || selected < 0 || !board.white[selected] || board.givens[selected]) return;
      if (entries[selected] === value) return;
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const next = entries.slice();
      next[selected] = value;
      setEntries(next);
      setWrong(new Set());
      if (isSolved(board, next)) {
        setDone(true);
        const ms = read();
        save.clear();
        shell.play('levelComplete');
        void reportProgress('kakuro.first', 1);
        void incrementProgress('kakuro.ten');
        if (n >= 8) void reportProgress('kakuro.eight', 1);
        if (n === 10) void reportProgress('kakuro.ten-grid', 1);
        if (n >= 8 && checks === 0) void reportProgress('kakuro.clean', 1);
        shell.endRound({
          won: true,
          score: scoreFor(n, ms, checks),
          timeMs: ms,
          title: 'Kakuro solved!',
          details: [
            { label: 'Grid', value: `${n}×${n}` },
            { label: 'Checks used', value: String(checks) },
          ],
        });
        return;
      }
      shell.play(value ? 'click' : 'pop');
      const free = board.white.filter((w, i) => w && !board.givens[i]).length;
      const filled = next.filter((v, i) => v && board.white[i] && !board.givens[i]).length;
      const percent = Math.round((filled / Math.max(1, free)) * 100);
      save.persist(
        {
          n,
          white: board.white,
          solution: board.solution,
          givens: board.givens,
          entries: next,
          ms: read(),
          checks,
        },
        { percent, label: `${n}×${n} · ${percent}% complete` },
      );
    },
    [board, checks, entries, locked, n, read, save, selected, shell, started],
  );

  // Arrow keys hop to the next white cell in that direction.
  useDirectionKeys(
    (dir) => {
      const dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      const dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      let r = Math.floor(selected / n) + dr;
      let c = (selected % n) + dc;
      while (r >= 0 && c >= 0 && r < n && c < n) {
        const i = r * n + c;
        if (board.white[i]) {
          setSelected(i);
          cellRefs.current[i]?.focus();
          return;
        }
        r += dr;
        c += dc;
      }
    },
    !locked,
    Object.fromEntries([
      ...Array.from({ length: 9 }, (_, k) => [String(k + 1), () => setDigit(k + 1)]),
      ['0', () => setDigit(0)],
      ['Backspace', () => setDigit(0)],
      ['Delete', () => setDigit(0)],
    ]),
  );

  const check = () => {
    if (locked) return;
    const bad = new Set<number>();
    entries.forEach((v, i) => {
      if (v && board.white[i] && v !== board.solution[i]) bad.add(i);
    });
    setChecks(checks + 1);
    setWrong(bad);
    shell.play(bad.size ? 'failure' : 'success');
    window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => setWrong(new Set()), 2500);
  };

  const resume = () => {
    if (!pending) return;
    const b = boardFromSave(pending);
    setBoard(b);
    setEntries(pending.entries.map((v, i) => b.givens[i] || v));
    setSelected(firstFree(b));
    setChecks(pending.checks);
    reset(pending.ms);
    save.dismiss();
  };

  const [acrossRun, downRun] = selected >= 0 && board.white[selected] ? board.cellRuns[selected] : [-1, -1];
  const inRun = new Set([
    ...(acrossRun >= 0 ? board.runs[acrossRun].cells : []),
    ...(downRun >= 0 ? board.runs[downRun].cells : []),
  ]);

  /** Combinations still possible for a run given the digits already in it. */
  const helper = (runIndex: number) => {
    if (runIndex < 0) return null;
    const run = board.runs[runIndex];
    const placed = run.cells.map((c) => entries[c]).filter(Boolean);
    const options = combos(run.cells.length, run.sum).filter((set) => placed.every((d) => set.includes(d)));
    return (
      <div>
        <strong>
          {run.dir === 'across' ? 'Across' : 'Down'} {run.sum} in {run.cells.length}:
        </strong>{' '}
        {options.length
          ? options.slice(0, 6).map((o) => o.join('+')).join(', ') + (options.length > 6 ? ', …' : '')
          : 'no combination fits — check this run'}
      </div>
    );
  };

  // Clue triangles: which run sums each black cell displays.
  const clueText = useMemo(() => {
    const map = new Map<number, { across?: number; down?: number; acrossRun?: number; downRun?: number }>();
    board.runs.forEach((run, k) => {
      const entry = map.get(run.clue) ?? {};
      if (run.dir === 'across') {
        entry.across = run.sum;
        entry.acrossRun = k;
      } else {
        entry.down = run.sum;
        entry.downRun = k;
      }
      map.set(run.clue, entry);
    });
    return map;
  }, [board]);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Time', value: formatClock(elapsed) },
          { label: 'Grid', value: `${n}×${n}` },
          { label: 'Checks', value: checks },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.n}×${pending.n} · ${formatClock(pending.ms)}`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <StatusBar>
        {done
          ? 'Every sum adds up!'
          : wrong.size
            ? `${wrong.size} digit${wrong.size === 1 ? ' is' : 's are'} wrong (in red).`
            : 'Each run must add up to its clue, with no digit repeated.'}
      </StatusBar>
      <div className={`kk-grid${done ? ' pz-win' : ''}`} style={{ ['--n' as string]: n }} role="grid" aria-label={`Kakuro ${n} by ${n}`}>
        {board.white.map((isWhite, i) => {
          if (!isWhite) {
            const clue = clueText.get(i);
            if (!clue) return <div key={i} className="kk-black" aria-hidden="true" />;
            return (
              <div key={i} className="kk-clue" aria-hidden="true">
                {clue.across !== undefined && (
                  <span className={`kk-a${status[clue.acrossRun!] === 'bad' ? ' bad' : status[clue.acrossRun!] === 'ok' ? ' ok' : ''}`}>
                    {clue.across}
                  </span>
                )}
                {clue.down !== undefined && (
                  <span className={`kk-d${status[clue.downRun!] === 'bad' ? ' bad' : status[clue.downRun!] === 'ok' ? ' ok' : ''}`}>
                    {clue.down}
                  </span>
                )}
              </div>
            );
          }
          const given = !!board.givens[i];
          const [a, d] = board.cellRuns[i];
          return (
            <button
              key={i}
              type="button"
              ref={(el) => (cellRefs.current[i] = el)}
              className={`kk-cell${selected === i ? ' sel' : ''}${inRun.has(i) ? ' run' : ''}${given ? ' given' : ''}${dupes.has(i) || wrong.has(i) ? ' err' : ''}`}
              onClick={() => !locked && setSelected(i)}
              tabIndex={selected === i ? 0 : -1}
              disabled={locked && !done}
              aria-label={`Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}: ${entries[i] || 'empty'}${given ? ' (given)' : ''}. Across ${board.runs[a].sum} in ${board.runs[a].cells.length}, down ${board.runs[d].sum} in ${board.runs[d].cells.length}.`}
            >
              {entries[i] || ''}
            </button>
          );
        })}
      </div>
      {!done && selected >= 0 && (
        <div className="kk-helper small muted" aria-live="polite">
          {helper(acrossRun)}
          {helper(downRun)}
        </div>
      )}
      <div className="kk-pad" role="group" aria-label="Digits">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} type="button" className="kk-key" onClick={() => setDigit(d)} disabled={locked}>
            {d}
          </button>
        ))}
        <button type="button" className="kk-key" onClick={() => setDigit(0)} disabled={locked} aria-label="Erase">
          ⌫
        </button>
      </div>
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={check} disabled={locked}>
          🔍 Check
        </button>
        <button type="button" className="btn btn-sm" onClick={restart} disabled={shell.paused}>
          🔀 New puzzle
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
