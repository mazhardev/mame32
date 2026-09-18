import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { useCountdown } from '../_shared/useCountdown';
import { AnswerInput, StartPanel, WordLayout, WordToast } from '../_shared/words/WordUI';
import { checkWord, commonWithPrefix, pickPrefixes } from './engine';

const ROUNDS = 3;
const SECONDS = 45;

export default function FinishTheWordGame() {
  const shell = useGameShell();
  const [prefixes, setPrefixes] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [total, setTotal] = useState({ score: 0, words: 0, best: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'between' | 'done'>('ready');

  const prefix = prefixes[index] ?? '';

  const finish = useCallback(
    (t: { score: number; words: number; best: number }) => {
      setPhase('done');
      void reportProgress('finish-the-word.words', t.words);
      void reportProgress('finish-the-word.score', t.score);
      void reportProgress('finish-the-word.round', t.best);
      shell.endRound({
        score: t.score,
        won: t.words >= 15,
        lost: t.words < 15,
        details: [
          { label: 'Words found', value: String(t.words) },
          { label: 'Best round', value: `${t.best} words` },
        ],
      });
    },
    [shell],
  );

  const timer = useCountdown(SECONDS, phase === 'playing' && !shell.paused, () => {
    shell.play('levelComplete');
    const t = { ...total, best: Math.max(total.best, found.length) };
    setTotal(t);
    const examples = commonWithPrefix(prefix)
      .filter((w) => !found.includes(w))
      .slice(0, 6);
    setMessage(
      examples.length
        ? `You could also have found: ${examples.map((e) => e.toUpperCase()).join(', ')}`
        : null,
    );
    if (index + 1 >= ROUNDS) finish(t);
    else setPhase('between');
  });

  const start = () => {
    setPrefixes(pickPrefixes(createRng(Date.now()), shell.difficulty, ROUNDS));
    setIndex(0);
    setFound([]);
    setTotal({ score: 0, words: 0, best: 0 });
    setMessage(null);
    timer.reset(SECONDS);
    setPhase('playing');
    shell.startRound();
  };

  const nextRound = () => {
    setIndex((i) => i + 1);
    setFound([]);
    setMessage(null);
    timer.reset(SECONDS);
    setPhase('playing');
  };

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  const submit = (value: string) => {
    if (phase !== 'playing' || shell.paused) return;
    // Let players type just the ending: "ing" after "st" becomes "sting".
    const word = value.startsWith(prefix) ? value : prefix + value;
    const check = checkWord(word, prefix, found);
    if (!check.ok) {
      shell.play('failure');
      return setMessage(check.reason);
    }
    setFound((f) => [word, ...f]);
    setTotal((t) => ({ ...t, score: t.score + check.points, words: t.words + 1 }));
    shell.play('coin');
    setMessage(`${word.toUpperCase()} +${check.points}`);
  };

  if (phase === 'ready') {
    return (
      <StartPanel onStart={start}>
        <p>
          You get a word beginning, like <strong>ST</strong>. Type as many real words starting with
          it as you can in {SECONDS} seconds. {ROUNDS} rounds. You can type the whole word or just
          the ending.
        </p>
      </StartPanel>
    );
  }

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Round', value: `${index + 1}/${ROUNDS}` },
          { label: 'Score', value: total.score },
          { label: 'Words', value: found.length },
          { label: 'Time', value: `${timer.seconds}s` },
        ]}
      />
      <div className="word-panel">
        <p className="small muted">Words starting with</p>
        <strong style={{ fontSize: '3rem', letterSpacing: '0.1em' }}>
          {prefix.toUpperCase()}…
        </strong>
      </div>
      {phase === 'playing' && (
        <AnswerInput
          onSubmit={submit}
          disabled={shell.paused}
          placeholder={`${prefix.toUpperCase()}…`}
        />
      )}
      {phase === 'between' && (
        <button className="btn btn-primary btn-lg" onClick={nextRound}>
          Next round
        </button>
      )}
      <WordToast message={message} />
      <div className="word-chips">
        {found.map((w) => (
          <span key={w} className="word-chip found">
            {w}
          </span>
        ))}
      </div>
    </WordLayout>
  );
}
