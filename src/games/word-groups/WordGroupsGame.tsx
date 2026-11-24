import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { WordLayout, WordToast } from '../_shared/words/WordUI';
import { MAX_MISTAKES, dailyIndex, isLost, isWon, newState, scoreFor, shuffleBoard, submit, validState } from './engine';
import type { State } from './engine';
import { PUZZLES } from './puzzles';
import './groups.css';

const ID = 'word-groups';
const LEVEL_NAMES = ['Easiest', 'Medium', 'Tricky', 'Trickiest'];

interface Saved {
  state: State;
  done: number[];
}

function validSaved(v: unknown): v is Saved {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return validState(s.state, PUZZLES) && Array.isArray(s.done) && s.done.every((i) => Number.isInteger(i));
}

export default function WordGroupsGame() {
  const shell = useGameShell();
  const save = useSavedGame(ID, validSaved);
  const today = dailyIndex(new Date(), PUZZLES.length);
  const [state, setState] = useState<State>(() => newState(PUZZLES[today], today, Math.random));
  const [done, setDone] = useState<number[]>([]);
  const [pick, setPick] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const loaded = useRef(false);
  const toastTimer = useRef<number | undefined>();
  const puzzle = PUZZLES[state.puzzle];

  // Pick up where you left off (no prompt: a half-solved board is just shown again).
  useEffect(() => {
    if (save.loading || loaded.current) return;
    loaded.current = true;
    if (save.saved) {
      setDone(save.saved.done);
      if (!isWon(save.saved.state) && !isLost(save.saved.state)) setState(save.saved.state);
      else if (save.saved.done.includes(today)) {
        const next = PUZZLES.findIndex((_, i) => !save.saved?.done.includes(i));
        if (next >= 0) setState(newState(PUZZLES[next], next, Math.random));
      }
    }
  }, [save.loading, save.saved, today]);

  const say = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const open = useCallback(
    (index: number) => {
      setState(newState(PUZZLES[index], index, Math.random));
      setPick([]);
      setStarted(false);
      setOver(false);
    },
    [],
  );

  const restart = useCallback(() => open(state.puzzle), [open, state.puzzle]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const persist = (s: State, d: number[]) => save.persist({ state: s, done: d }, { percent: s.solved.length * 25, label: `Puzzle ${s.puzzle + 1} · ${s.solved.length}/4 groups` });

  const end = (s: State, d: number[]) => {
    setOver(true);
    const won = isWon(s);
    const score = scoreFor(puzzle, s);
    if (won) {
      void reportProgress(`${ID}.first`, 1);
      void incrementProgress(`${ID}.ten`);
      if (s.mistakes === 0) void reportProgress(`${ID}.perfect`, 1);
      if (s.solved[0] === 3) void reportProgress(`${ID}.purple`, 1);
    }
    shell.endRound({
      won,
      score,
      title: won ? (s.mistakes === 0 ? 'Perfect! 🎉' : 'All four groups!') : 'Out of mistakes',
      message: puzzle
        .map((g) => `${g.name}: ${g.words.join(', ')}`)
        .join(' · '),
      details: [
        { label: 'Puzzle', value: `#${s.puzzle + 1}` },
        { label: 'Groups', value: `${s.solved.length}/4` },
        { label: 'Mistakes', value: `${s.mistakes}/${MAX_MISTAKES}` },
      ],
      next: d.length < PUZZLES.length ? { label: 'Next puzzle →', action: () => open(PUZZLES.findIndex((_, i) => !d.includes(i) && i !== s.puzzle) >= 0 ? PUZZLES.findIndex((_, i) => !d.includes(i) && i !== s.puzzle) : (s.puzzle + 1) % PUZZLES.length) } : undefined,
    });
  };

  const toggle = (w: string) => {
    if (over || shell.paused) return;
    if (pick.includes(w)) setPick(pick.filter((x) => x !== w));
    else if (pick.length < 4) setPick([...pick, w]);
    shell.play('tick');
  };

  const onSubmit = () => {
    if (over || shell.paused || pick.length !== 4) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const res = submit(puzzle, state, pick);
    if (res.outcome === 'repeat') {
      say('Already guessed');
      return;
    }
    if (res.outcome === 'invalid') return;
    setState(res.state);
    if (res.outcome === 'correct') {
      setPick([]);
      shell.play(res.state.solved.length === 4 ? 'levelComplete' : 'success');
      if (isWon(res.state)) {
        const d = done.includes(res.state.puzzle) ? done : [...done, res.state.puzzle];
        setDone(d);
        persist(res.state, d);
        end(res.state, d);
        return;
      }
    } else {
      setShake(true);
      window.setTimeout(() => setShake(false), 380);
      shell.play('failure');
      say(res.outcome === 'one-away' ? 'One away…' : 'Not a group');
      if (isLost(res.state)) {
        // Show the groups you missed, then end.
        const all = [...res.state.solved, ...[0, 1, 2, 3].filter((i) => !res.state.solved.includes(i))];
        const revealed = { ...res.state, solved: all, board: [] };
        setState(revealed);
        setPick([]);
        persist(res.state, done);
        end(res.state, done);
        return;
      }
    }
    persist(res.state, done);
  };

  const groupsShown = state.solved;

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Puzzle', value: `#${state.puzzle + 1}${state.puzzle === today ? ' (today)' : ''}` },
          { label: 'Groups', value: `${state.solved.length}/4` },
          { label: 'Mistakes left', value: '●'.repeat(MAX_MISTAKES - state.mistakes) + '○'.repeat(state.mistakes) },
        ]}
      />
      <div className="wg-pick">
        <label>
          <span className="sr-only">Puzzle</span>
          <select className="select" value={state.puzzle} onChange={(e) => open(Number(e.target.value))} disabled={shell.paused}>
            {PUZZLES.map((_, i) => (
              <option key={i} value={i}>
                Puzzle {i + 1}
                {i === today ? ' · today' : ''}
                {done.includes(i) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="wg-hint">Make four groups of four. Select four words that share something, then Submit.</p>
      <div className="wg-solved">
        {groupsShown.map((i) => (
          <div key={i} className={`wg-group l${puzzle[i].level}`} aria-label={`${LEVEL_NAMES[puzzle[i].level]} group: ${puzzle[i].name}`}>
            <strong>{puzzle[i].name}</strong>
            <span>{puzzle[i].words.join(', ')}</span>
          </div>
        ))}
      </div>
      <div className={`wg-grid${shake ? ' shake' : ''}`} role="group" aria-label="Words">
        {state.board.map((w) => (
          <button
            key={w}
            type="button"
            className={`wg-tile${pick.includes(w) ? ' on' : ''}`}
            style={{ ['--len' as string]: Math.max(5, w.length) }}
            aria-pressed={pick.includes(w)}
            onClick={() => toggle(w)}
            disabled={over}
          >
            <span>{w}</span>
          </button>
        ))}
      </div>
      <WordToast message={toast} />
      <div className="wg-actions">
        <button type="button" className="btn" onClick={() => { setState(shuffleBoard(state, Math.random)); shell.play('whoosh'); }} disabled={over || shell.paused}>
          🔀 Shuffle
        </button>
        <button type="button" className="btn" onClick={() => setPick([])} disabled={over || !pick.length}>
          Deselect
        </button>
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={over || pick.length !== 4 || shell.paused}>
          Submit
        </button>
      </div>
    </WordLayout>
  );
}
