import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { QuizEngine } from './engine';
import type { QuizQuestion } from './engine';
import './quiz.css';

export interface QuizRace {
  /** Correct answers needed to reach the finish line. */
  target: number;
  /** Seconds the computer car takes to finish, per difficulty. */
  aiSeconds: Record<DifficultySetting, number>;
}

export interface QuizGameProps {
  makeQuestions: (rng: Rng, difficulty: DifficultySetting) => QuizQuestion[];
  /** Seconds per question; omit for untimed rounds. */
  timeLimit?: Partial<Record<DifficultySetting, number>>;
  intro: string;
  race?: QuizRace;
  /** Single column suits long answers. */
  layout?: 'grid' | 'list';
}

type Phase = 'intro' | 'question' | 'feedback' | 'done';

export function QuizGame({
  makeQuestions,
  timeLimit,
  intro,
  race,
  layout = 'grid',
}: QuizGameProps) {
  const shell = useGameShell();
  const engineRef = useRef<QuizEngine | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [aiProgress, setAiProgress] = useState(0);
  const endedRef = useRef(false);
  const limit = timeLimit?.[shell.difficulty];

  const reset = useCallback(() => {
    engineRef.current = null;
    endedRef.current = false;
    setPicked(null);
    setAiProgress(0);
    setPhase('intro');
  }, []);

  useEffect(() => {
    shell.registerRestart(reset);
  }, [shell, reset]);

  useEffect(() => {
    reset();
  }, [shell.difficulty, reset]);

  const finish = useCallback(
    (won?: boolean) => {
      const e = engineRef.current;
      if (!e || endedRef.current) return;
      endedRef.current = true;
      setPhase('done');
      const id = shell.game.id;
      void reportProgress(`${id}.first`, e.correct);
      void reportProgress(`${id}.score`, e.score);
      void reportProgress(`${id}.streak`, e.bestStreak);
      const perfect =
        e.answered.length > 0 && e.correct === e.answered.length && (race ? true : e.finished);
      if (perfect) void reportProgress(`${id}.perfect`, 1);
      const passed = won ?? e.accuracy >= 0.6;
      shell.endRound({
        score: e.score,
        won: passed,
        lost: !passed,
        title: race
          ? passed
            ? 'You won the race!'
            : 'The computer got there first'
          : passed
            ? 'Round complete!'
            : 'Keep practising!',
        details: [
          { label: 'Correct', value: `${e.correct} / ${e.answered.length}` },
          { label: 'Accuracy', value: `${Math.round(e.accuracy * 100)}%` },
          { label: 'Best streak', value: String(e.bestStreak) },
        ],
      });
    },
    [shell, race],
  );

  const start = useCallback(() => {
    const rng = createRng(Date.now());
    engineRef.current = new QuizEngine(makeQuestions(rng, shell.difficulty));
    endedRef.current = false;
    setPicked(null);
    setAiProgress(0);
    setTimeLeft(limit ?? 0);
    setPhase('question');
    shell.startRound();
  }, [makeQuestions, shell, limit]);

  const next = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    e.next();
    setPicked(null);
    if (e.finished) {
      finish();
      return;
    }
    setTimeLeft(limit ?? 0);
    setPhase('question');
  }, [finish, limit]);

  const choose = useCallback(
    (choice: number | null) => {
      const e = engineRef.current;
      if (!e || phase !== 'question' || shell.paused) return;
      const fraction = limit ? timeLeft / limit : 1;
      const result = e.answer(choice, fraction);
      setPicked(choice);
      shell.play(result.correct ? 'success' : 'failure');
      if (race) {
        if (e.correct >= race.target) {
          finish(true);
          return;
        }
        // Races keep moving: a short flash of feedback, then the next question.
        setPhase('feedback');
        window.setTimeout(
          () => {
            if (!endedRef.current) next();
          },
          result.correct ? 350 : 800,
        );
        return;
      }
      setPhase('feedback');
    },
    [phase, shell, limit, timeLeft, race, finish, next],
  );

  // Per-question countdown, frozen while the game is paused.
  useEffect(() => {
    if (phase !== 'question' || !limit || shell.paused) return;
    const started = performance.now();
    const from = timeLeft;
    const id = window.setInterval(() => {
      const left = Math.max(0, from - (performance.now() - started) / 1000);
      setTimeLeft(left);
      if (left <= 0) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
    // timeLeft is read once as the starting point for this run of the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, limit, shell.paused, engineRef.current?.index]);

  useEffect(() => {
    if (phase === 'question' && limit && timeLeft <= 0) choose(null);
  }, [phase, limit, timeLeft, choose]);

  // The computer car in race mode advances in real time.
  useEffect(() => {
    if (!race || shell.paused || (phase !== 'question' && phase !== 'feedback')) return;
    const total = race.aiSeconds[shell.difficulty];
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setAiProgress((p) => {
        const nextP = Math.min(1, p + dt / total);
        if (nextP >= 1) window.setTimeout(() => finish(false), 0);
        return nextP;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [race, shell.paused, shell.difficulty, phase, finish]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag && /^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if (phase === 'question' && /^[1-9]$/.test(ev.key)) {
        const i = Number(ev.key) - 1;
        if (engineRef.current?.current && i < engineRef.current.current.choices.length) {
          ev.preventDefault();
          choose(i);
        }
      } else if (phase === 'feedback' && !race && ev.key === 'Enter' && tag !== 'BUTTON') {
        ev.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, choose, next, race]);

  const e = engineRef.current;
  const q = e?.current;

  if (phase === 'intro' || !e) {
    return (
      <div className="quiz">
        <div className="quiz-card quiz-intro">
          <p>{intro}</p>
          <label className="row" style={{ justifyContent: 'center' }}>
            <span className="small muted">Difficulty</span>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={shell.difficulty}
              onChange={(ev) => shell.setDifficulty(ev.target.value as DifficultySetting)}
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <button className="btn btn-primary btn-lg" onClick={start}>
            Start
          </button>
        </div>
      </div>
    );
  }

  const hud = [
    race
      ? { label: 'Correct', value: `${e.correct}/${race.target}` }
      : { label: 'Question', value: `${Math.min(e.index + 1, e.total)}/${e.total}` },
    { label: 'Score', value: e.score },
    { label: 'Streak', value: e.streak },
  ];
  if (limit) hud.push({ label: 'Time', value: `${Math.ceil(timeLeft)}s` });

  return (
    <div className="quiz">
      <GameHud items={hud} />
      {race && (
        <div
          className="quiz-race"
          aria-label={`You ${e.correct} of ${race.target}. Computer ${Math.round(aiProgress * 100)}%.`}
        >
          <div className="lane">
            <span className="lane-label">You</span>
            <div className="track">
              <span className="car" style={{ left: `${(e.correct / race.target) * 100}%` }}>
                🏎️
              </span>
            </div>
          </div>
          <div className="lane">
            <span className="lane-label">CPU</span>
            <div className="track">
              <span className="car cpu" style={{ left: `${aiProgress * 100}%` }}>
                🚙
              </span>
            </div>
          </div>
        </div>
      )}
      {limit ? (
        <div className="quiz-timer" aria-hidden="true">
          <span style={{ width: `${(timeLeft / limit) * 100}%` }} />
        </div>
      ) : null}
      {q && phase !== 'done' && (
        <div className="quiz-card">
          {q.visual && <div className="quiz-visual">{q.visual}</div>}
          <p className="quiz-prompt">{q.prompt}</p>
          <div className={`quiz-choices ${layout}`}>
            {q.choices.map((c, i) => {
              let state = '';
              if (phase === 'feedback') {
                if (i === q.answer) state = 'correct';
                else if (i === picked) state = 'wrong';
              }
              return (
                <button
                  key={`${e.index}-${i}`}
                  className={`quiz-choice ${state}`}
                  disabled={phase !== 'question' || shell.paused}
                  onClick={() => choose(i)}
                >
                  <kbd>{i + 1}</kbd>
                  <span>{c}</span>
                </button>
              );
            })}
          </div>
          {phase === 'feedback' && !race && (
            <div className="quiz-feedback" role="status" aria-live="polite">
              <strong>
                {picked === q.answer ? 'Correct!' : picked === null ? "Time's up!" : 'Not quite.'}
              </strong>{' '}
              {picked !== q.answer && <span>The answer is {q.choices[q.answer]}. </span>}
              {q.explain && <span className="muted">{q.explain}</span>}
              <div>
                <button className="btn btn-primary" onClick={next} autoFocus>
                  {e.index + 1 >= e.total ? 'See results' : 'Next question'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
