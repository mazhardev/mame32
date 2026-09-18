import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { useCountdown } from '../_shared/useCountdown';
import { AnswerInput, StartPanel, TileRow, WordLayout, WordToast } from '../_shared/words/WordUI';
import { isValidStep, nextOptions, pickStart, stepScore } from './engine';

const SECONDS = { easy: 180, normal: 150, hard: 120 } as const;
const DEPTH = { easy: 4, normal: 4, hard: 5 } as const;

export default function WordBuilderGame() {
  const shell = useGameShell();
  const [chain, setChain] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [longest, setLongest] = useState(0);
  const [chains, setChains] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');

  const finish = useCallback(
    (finalScore: number, best: number) => {
      setPhase('done');
      void reportProgress('word-builder.six', best);
      void reportProgress('word-builder.eight', best);
      void reportProgress('word-builder.score', finalScore);
      shell.endRound({
        score: finalScore,
        won: best >= 6,
        lost: best < 6,
        title: 'Time’s up!',
        details: [
          { label: 'Longest word', value: `${best} letters` },
          { label: 'Chains started', value: String(chains + 1) },
        ],
      });
    },
    [chains, shell],
  );

  const timer = useCountdown(SECONDS[shell.difficulty], phase === 'playing' && !shell.paused, () =>
    finish(score, longest),
  );

  const newChain = () => setChain([pickStart(createRng(Date.now()), DEPTH[shell.difficulty])]);

  const start = () => {
    newChain();
    setScore(0);
    setLongest(3);
    setChains(0);
    setMessage(null);
    timer.reset(SECONDS[shell.difficulty]);
    setPhase('playing');
    shell.startRound();
  };

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  const current = chain[chain.length - 1] ?? '';

  const submit = (value: string) => {
    if (phase !== 'playing' || shell.paused) return;
    if (!isValidStep(current, value)) {
      shell.play('failure');
      setMessage(
        value.length !== current.length + 1
          ? `Your word needs ${current.length + 1} letters`
          : `Use all of ${current.toUpperCase()} plus one new letter`,
      );
      return;
    }
    const points = stepScore(value);
    setChain((c) => [...c, value]);
    setScore((s) => s + points);
    setLongest((l) => Math.max(l, value.length));
    shell.play(value.length >= 7 ? 'levelComplete' : 'success');
    setMessage(`${value.toUpperCase()} +${points}`);
  };

  const restartChain = () => {
    setChains((n) => n + 1);
    setMessage(`New chain! Your score is kept.`);
    newChain();
  };

  if (phase === 'ready') {
    return (
      <StartPanel onStart={start}>
        <p>
          Start from a three-letter word. Add ONE letter at a time and rearrange to make a new word:
          ART → RATE → CRATE → CARTER… Build the longest words you can before time runs out.
        </p>
      </StartPanel>
    );
  }

  const options = nextOptions(current).length;

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Score', value: score },
          { label: 'Longest', value: longest },
          { label: 'Time', value: `${timer.seconds}s` },
        ]}
      />
      <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
        {chain.map((w, i) => (
          <TileRow
            key={`${w}-${i}`}
            word={w}
            length={w.length}
            size={36}
            states={[...w].map(() => (i === chain.length - 1 ? 'correct' : 'pending'))}
          />
        ))}
      </div>
      {phase === 'playing' && (
        <>
          <p className="small muted">
            Add one letter to {current.toUpperCase()} ({current.length + 1} letters).{' '}
            {options > 0
              ? `At least ${options} common word${options === 1 ? '' : 's'} work.`
              : 'Common words run out here — try any real word or start a new chain.'}
          </p>
          <AnswerInput
            onSubmit={submit}
            disabled={shell.paused}
            maxLength={current.length + 1}
            placeholder={`${current.length + 1}-letter word`}
          />
          <button className="btn" onClick={restartChain} disabled={shell.paused}>
            New chain
          </button>
        </>
      )}
      <WordToast message={message} />
    </WordLayout>
  );
}
