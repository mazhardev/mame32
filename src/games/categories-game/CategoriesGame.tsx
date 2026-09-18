import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { useCountdown } from '../_shared/useCountdown';
import { StartPanel, WordLayout } from '../_shared/words/WordUI';
import { PER_ROUND, examples, isValidAnswer, makeRound, normalize } from './lists';
import type { Round } from './lists';

const ROUNDS = 3;
const SECONDS = { easy: 120, normal: 90, hard: 60 } as const;

type Result = { answer: string; ok: boolean };

export default function CategoriesGame() {
  const shell = useGameShell();
  const seconds = SECONDS[shell.difficulty];
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'review' | 'done'>('ready');

  const round = rounds[index];

  const score1 = (r: Round, list: string[]) =>
    r.categories.map((c, i) => {
      const answer = list[i] ?? '';
      return { answer, ok: !!normalize(answer) && isValidAnswer(c, answer, r.letter) };
    });

  const submit = useCallback(() => {
    if (!round || phase !== 'playing') return;
    const res = score1(round, answers);
    const pts = res.reduce(
      (s, r) => s + (r.ok ? 10 + (normalize(r.answer).length >= 8 ? 5 : 0) : 0),
      0,
    );
    setResults(res);
    setScore((s) => s + pts);
    setCorrect((n) => n + res.filter((r) => r.ok).length);
    shell.play(res.every((r) => r.ok) ? 'levelComplete' : 'success');
    if (res.every((r) => r.ok)) void reportProgress('categories-game.full-round', 1);
    setPhase('review');
  }, [answers, phase, round, shell]);

  const timer = useCountdown(seconds, phase === 'playing' && !shell.paused, submit);

  const start = () => {
    const rng = createRng(Date.now());
    const list: Round[] = [];
    for (let i = 0; i < ROUNDS; i++)
      list.push(
        makeRound(
          rng,
          list.map((r) => r.letter),
        ),
      );
    setRounds(list);
    setIndex(0);
    setAnswers([]);
    setResults(null);
    setScore(0);
    setCorrect(0);
    timer.reset(seconds);
    setPhase('playing');
    shell.startRound();
  };

  const next = () => {
    if (index + 1 >= ROUNDS) {
      setPhase('done');
      void reportProgress('categories-game.answers', correct);
      void reportProgress('categories-game.score', score);
      shell.endRound({
        score,
        won: correct >= ROUNDS * PER_ROUND * 0.5,
        lost: correct < ROUNDS * PER_ROUND * 0.5,
        details: [{ label: 'Correct answers', value: `${correct} / ${ROUNDS * PER_ROUND}` }],
      });
      return;
    }
    setIndex((i) => i + 1);
    setAnswers([]);
    setResults(null);
    timer.reset(seconds);
    setPhase('playing');
  };

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  if (phase === 'ready' || !round) {
    return (
      <StartPanel onStart={start}>
        <p>
          Each round gives you a letter and six categories. Think of one answer for each category
          that starts with the letter — an animal, a country, a job… {ROUNDS} rounds, {seconds}{' '}
          seconds each.
        </p>
      </StartPanel>
    );
  }

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Round', value: `${index + 1}/${ROUNDS}` },
          { label: 'Score', value: score },
          { label: 'Time', value: phase === 'playing' ? `${timer.seconds}s` : '—' },
        ]}
      />
      <div className="word-panel" style={{ padding: 'var(--space-3)' }}>
        <span className="small muted">Everything must start with</span>
        <strong style={{ fontSize: '3.2rem', lineHeight: 1 }}>{round.letter.toUpperCase()}</strong>
      </div>
      <form
        style={{ width: '100%', display: 'grid', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {round.categories.map((c, i) => {
          const r = results?.[i];
          return (
            <label
              key={c}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(110px, 38%) 1fr',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <span className="small" style={{ fontWeight: 600 }}>
                {c}
              </span>
              <span style={{ display: 'grid', gap: 2 }}>
                <input
                  className="input"
                  value={answers[i] ?? ''}
                  disabled={phase !== 'playing' || shell.paused}
                  placeholder={`${round.letter.toUpperCase()}…`}
                  autoComplete="off"
                  onChange={(e) => {
                    const v = e.target.value;
                    setAnswers((a) => {
                      const copy = [...a];
                      copy[i] = v;
                      return copy;
                    });
                  }}
                  style={r ? { borderColor: r.ok ? 'var(--success)' : 'var(--danger)' } : undefined}
                />
                {r && (
                  <span
                    className="small"
                    style={{ color: r.ok ? 'var(--success)' : 'var(--text-muted)' }}
                  >
                    {r.ok ? '✓ Accepted' : `✗ e.g. ${examples(c, round.letter).join(', ')}`}
                  </span>
                )}
              </span>
            </label>
          );
        })}
        {phase === 'playing' && (
          <button className="btn btn-primary" type="submit" disabled={shell.paused}>
            Done
          </button>
        )}
      </form>
      {phase === 'review' && (
        <button className="btn btn-primary btn-lg" onClick={next}>
          {index + 1 >= ROUNDS ? 'See results' : 'Next round'}
        </button>
      )}
      <p className="small muted" style={{ textAlign: 'center' }}>
        Answers are checked against built-in lists, so very unusual answers may not be recognised.
      </p>
    </WordLayout>
  );
}
