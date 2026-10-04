import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { loadProgress, saveProgress } from '@/storage/StorageService';
import { createRng } from '@/utils/random';
import { accuracy, appended, wpm } from '../_shared/typing';
import { WordLayout } from '../_shared/words/WordUI';
import { FINGER, LESSONS, lessonText } from './lessons';
import '../_shared/typing.css';

const GAME_ID = 'typing-tutor';
const PASS = { easy: 85, normal: 90, hard: 95 } as const;
const LENGTH = { easy: 70, normal: 110, hard: 150 } as const;
const FINGER_COLORS = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#94a3b8',
];
const ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];

export default function TypingTutorGame() {
  const shell = useGameShell();
  const [unlocked, setUnlocked] = useState(1);
  const [lessonIndex, setLessonIndex] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [pos, setPos] = useState(0);
  const [errors, setErrors] = useState(0);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastValue = useRef('');
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    void loadProgress<{ unlocked: number }>(GAME_ID).then((s) => {
      if (s && typeof s.unlocked === 'number')
        setUnlocked(Math.max(1, Math.min(LESSONS.length, s.unlocked)));
    });
  }, []);

  const open = useCallback(
    (i: number) => {
      setLessonIndex(i);
      setText(lessonText(LESSONS[i], createRng(Date.now()), LENGTH[shell.difficulty]));
      setPos(0);
      setErrors(0);
      lastValue.current = '';
      startedAt.current = null;
      window.setTimeout(() => inputRef.current?.focus(), 0);
    },
    [shell.difficulty],
  );

  useEffect(
    () => shell.registerRestart(() => (lessonIndex === null ? undefined : open(lessonIndex))),
    [shell, lessonIndex, open],
  );

  const complete = (finalErrors: number) => {
    if (lessonIndex === null) return;
    const seconds = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 1;
    const acc = accuracy(text.length, text.length + finalErrors);
    const speed = wpm(text.length, seconds);
    const passed = acc >= PASS[shell.difficulty];
    if (passed && lessonIndex + 1 >= unlocked && lessonIndex + 1 < LESSONS.length) {
      const next = lessonIndex + 2;
      setUnlocked(next);
      void saveProgress(
        GAME_ID,
        { unlocked: next },
        { level: next, label: `Lesson ${next} of ${LESSONS.length}` },
      );
    }
    if (passed) void reportProgress('typing-tutor.lessons', lessonIndex + 1);
    if (passed && lessonIndex === LESSONS.length - 1)
      void reportProgress('typing-tutor.graduate', 1);
    if (acc === 100) void reportProgress('typing-tutor.perfect', 1);
    shell.play(passed ? 'levelComplete' : 'failure');
    shell.endRound({
      score: Math.round(speed * acc),
      won: passed,
      lost: !passed,
      title: passed
        ? `Lesson ${lessonIndex + 1} passed!`
        : `Need ${PASS[shell.difficulty]}% accuracy to pass`,
      details: [
        { label: 'Accuracy', value: `${acc}%` },
        { label: 'Speed', value: `${speed} WPM` },
        { label: 'Mistakes', value: String(finalErrors) },
      ],
    });
  };

  const onChange = (value: string) => {
    if (lessonIndex === null || shell.paused || pos >= text.length) return;
    const added = appended(lastValue.current, value);
    lastValue.current = value;
    if (!added) return;
    if (startedAt.current === null) {
      startedAt.current = Date.now();
      shell.startRound();
    }
    let p = pos;
    let e = errors;
    for (const ch of added) {
      if (p >= text.length) break;
      if (ch === text[p]) p++;
      else {
        e++;
        setFlash(true);
        window.setTimeout(() => setFlash(false), 150);
      }
    }
    setPos(p);
    setErrors(e);
    // Keep the input short so it never scrolls on phones.
    if (value.length > 30 && inputRef.current) {
      inputRef.current.value = '';
      lastValue.current = '';
    }
    if (p >= text.length) complete(e);
  };

  if (lessonIndex === null) {
    return (
      <WordLayout>
        <div className="word-panel" style={{ justifyItems: 'stretch', textAlign: 'left' }}>
          <p>
            Learn to touch-type, one row at a time. Pass a lesson with at least{' '}
            {PASS[shell.difficulty]}% accuracy to unlock the next.
          </p>
          <ol style={{ display: 'grid', gap: 6, paddingLeft: 0, listStyle: 'none' }}>
            {LESSONS.map((l, i) => (
              <li key={l.title}>
                <button
                  className="btn"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                  disabled={i + 1 > unlocked}
                  onClick={() => open(i)}
                >
                  <span>
                    {i + 1}. {l.title}
                  </span>
                  <span className="small muted">
                    {i + 1 > unlocked ? '🔒' : i + 1 < unlocked ? '✓' : 'Next'}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </WordLayout>
    );
  }

  const lesson = LESSONS[lessonIndex];
  const next = text[pos] ?? '';
  const nextKey = next.toLowerCase();
  const done = pos >= text.length;

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Lesson', value: `${lessonIndex + 1}/${LESSONS.length}` },
          { label: 'Progress', value: `${Math.round((pos / text.length) * 100)}%` },
          { label: 'Mistakes', value: errors },
        ]}
        extra={
          <button className="btn" onClick={() => setLessonIndex(null)}>
            Lessons
          </button>
        }
      />
      <p className="small muted" style={{ textAlign: 'center' }}>
        {lesson.tip}
      </p>
      <div
        className="typing-text"
        onClick={() => inputRef.current?.focus()}
        style={{
          outline: flash ? '2px solid var(--danger)' : undefined,
          whiteSpace: 'pre-wrap',
          display: 'block',
        }}
        aria-label="Text to type"
      >
        <span className="tc ok">{text.slice(0, pos)}</span>
        <span
          style={{ background: 'var(--brand)', color: 'var(--brand-contrast)', borderRadius: 3 }}
        >
          {next === ' ' ? '␣' : next}
        </span>
        <span className="tw">{text.slice(pos + 1)}</span>
      </div>
      <input
        ref={inputRef}
        className="input typing-input"
        onChange={(e) => onChange(e.target.value)}
        disabled={done || shell.paused}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="Type here"
        placeholder="Click here and type…"
      />
      <div className="word-keyboard" aria-hidden="true">
        {ROWS.map((row) => (
          <div className="kb-row" key={row}>
            {[...row].map((k) => (
              <span
                key={k}
                className="kb-key"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  borderBottom: `4px solid ${FINGER_COLORS[FINGER[k] ?? 7]}`,
                  background: k === nextKey ? FINGER_COLORS[FINGER[k] ?? 7] : undefined,
                  color: k === nextKey ? '#111' : undefined,
                }}
              >
                {k}
              </span>
            ))}
          </div>
        ))}
        <div className="kb-row">
          <span
            className="kb-key"
            style={{
              maxWidth: 280,
              flexGrow: 6,
              display: 'grid',
              placeItems: 'center',
              background: next === ' ' ? '#94a3b8' : undefined,
            }}
          >
            space
          </span>
        </div>
      </div>
    </WordLayout>
  );
}
