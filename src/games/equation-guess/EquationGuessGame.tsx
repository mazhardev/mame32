import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { createRng, todayKey } from '@/utils/random';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { WordLayout, WordToast } from '../_shared/words/WordUI';
import { MAX_GUESSES, PROBLEMS, keyMarks, makeEquation, marks, problem, show, validGuesses } from './engine';
import type { Mark } from './engine';
import './equation.css';

const ID = 'equation-guess';
const LENGTHS = { easy: 6, normal: 7, hard: 8 } as const;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '*', '/', '='];

interface Saved {
  seed: string;
  length: number;
  guesses: string[];
}

function validSaved(v: unknown): v is Saved {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.seed === 'string' && (s.length === 6 || s.length === 7 || s.length === 8) && validGuesses(s.guesses, s.length as number);
}

export default function EquationGuessGame() {
  const shell = useGameShell();
  const length = LENGTHS[shell.difficulty];
  const save = useSavedGame(ID, validSaved);
  const today = todayKey();
  const [seed, setSeed] = useState(today);
  const answer = useMemo(() => makeEquation(length, createRng(`equation-guess-${length}-${seed}`).next), [length, seed]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const loaded = useRef(false);
  const toastTimer = useRef<number | undefined>();

  // Resume an unfinished equation of this length.
  useEffect(() => {
    if (save.loading || loaded.current) return;
    loaded.current = true;
    const s = save.saved;
    if (s && s.length === length && s.guesses.length && s.guesses.length < MAX_GUESSES) {
      const ans = makeEquation(s.length, createRng(`equation-guess-${s.length}-${s.seed}`).next);
      if (!s.guesses.includes(ans)) {
        setSeed(s.seed);
        setGuesses(s.guesses);
      }
    }
  }, [length, save.loading, save.saved]);

  const say = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const fresh = useCallback(
    (nextSeed: string) => {
      setSeed(nextSeed);
      setGuesses([]);
      setTyped('');
      setStarted(false);
      setOver(false);
      save.clear();
    },
    [save],
  );

  const restart = useCallback(() => fresh(seed === today ? today : `r${Date.now()}`), [fresh, seed, today]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const enter = () => {
    if (over || shell.paused) return;
    const why = problem(typed, length);
    if (why) {
      say(PROBLEMS[why]);
      setShake(true);
      window.setTimeout(() => setShake(false), 360);
      shell.play('failure');
      return;
    }
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const list = [...guesses, typed];
    setGuesses(list);
    setTyped('');
    const won = typed === answer;
    if (won || list.length === MAX_GUESSES) {
      setOver(true);
      save.clear();
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) {
        void reportProgress(`${ID}.first`, 1);
        void incrementProgress(`${ID}.ten`);
        if (list.length <= 3) void reportProgress(`${ID}.three`, 1);
        if (length === 8) void reportProgress(`${ID}.hard`, 1);
      }
      shell.endRound({
        won,
        score: won ? (MAX_GUESSES + 1 - list.length) * 100 * (length - 4) : 0,
        title: won ? (list.length === 1 ? 'First try! 🤯' : 'Solved! 🧮') : 'Out of guesses',
        message: `The equation was ${[...answer].map(show).join('')}.`,
        details: [
          { label: 'Guesses', value: won ? `${list.length}/${MAX_GUESSES}` : 'X' },
          { label: 'Length', value: `${length} symbols` },
        ],
        next: { label: 'New equation →', action: () => fresh(`r${Date.now()}`) },
      });
    } else {
      const got = marks(typed, answer).filter((m) => m === 'correct').length;
      shell.play(got >= length - 2 ? 'success' : 'click');
      save.persist({ seed, length, guesses: list }, { percent: Math.round((list.length / MAX_GUESSES) * 100), label: `${length} symbols · guess ${list.length + 1}/${MAX_GUESSES}` });
    }
  };

  const press = (k: string) => {
    if (over || shell.paused) return;
    if (k === 'Enter') return enter();
    if (k === 'Backspace') return setTyped((t) => t.slice(0, -1));
    if (typed.length >= length) return;
    setTyped(typed + k);
    shell.play('tick');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      const map: Record<string, string> = { x: '*', X: '*', '×': '*', '÷': '/', '−': '-' };
      const k = map[e.key] ?? e.key;
      if (k === 'Enter' || k === 'Backspace' || KEYS.includes(k)) {
        e.preventDefault();
        press(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const km = keyMarks(guesses, answer);
  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length) return { text: guesses[r], marks: marks(guesses[r], answer) as (Mark | 'pending' | 'empty')[] };
    if (r === guesses.length && !over) return { text: typed, marks: Array.from({ length }, (_, i) => (typed[i] ? 'pending' : 'empty')) as ('pending' | 'empty')[] };
    return { text: '', marks: Array(length).fill('empty') as 'empty'[] };
  });

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: seed === today ? 'Today' : 'Random', value: seed === today ? today.slice(5) : '🔀' },
          { label: 'Symbols', value: length },
          { label: 'Guess', value: `${Math.min(guesses.length + 1, MAX_GUESSES)}/${MAX_GUESSES}` },
        ]}
      />
      <p className="eq-hint">Find the hidden equation. Each guess must be a true sum, like {[...makeEquation(length, createRng('example').next)].map(show).join('')}.</p>
      <div className="eq-board" style={{ ['--len' as string]: length }} aria-label="Guesses">
        {rows.map((row, r) => (
          <div key={r} className={`eq-row${r === guesses.length && shake ? ' shake' : ''}`} aria-label={row.text ? [...row.text].map(show).join(' ') : 'empty row'}>
            {Array.from({ length }, (_, i) => (
              <span key={i} className={`eq-tile ${row.marks[i]}`}>
                {row.text[i] ? show(row.text[i]) : ''}
              </span>
            ))}
          </div>
        ))}
      </div>
      <WordToast message={toast} />
      <div className="eq-keys" role="group" aria-label="Keypad">
        {KEYS.map((k) => (
          <button key={k} type="button" className={`eq-key ${km.get(k) ?? ''}${OPS_CLASS(k)}`} onClick={() => press(k)} aria-label={show(k)}>
            {show(k)}
          </button>
        ))}
        <button type="button" className="eq-key wide" onClick={() => press('Backspace')} aria-label="Delete">
          ⌫
        </button>
        <button type="button" className="eq-key wide enter" onClick={() => press('Enter')}>
          Enter
        </button>
      </div>
      <div className="eq-actions">
        {seed !== today && (
          <button type="button" className="btn btn-sm" onClick={() => fresh(today)} disabled={shell.paused}>
            📅 Today’s equation
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={() => fresh(`r${Date.now()}`)} disabled={shell.paused}>
          🔀 New equation
        </button>
      </div>
    </WordLayout>
  );
}

function OPS_CLASS(k: string) {
  return '+-*/='.includes(k) ? ' op' : '';
}
