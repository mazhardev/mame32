import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { AnswerInput, TileRow, WordLayout, WordToast } from '../_shared/words/WordUI';
import type { LetterState } from '../_shared/words/WordUI';
import { checkStep, hint, makeLadder } from './engine';
import type { Ladder } from './engine';

const LEVELS = {
  easy: { length: 3, min: 3, max: 4 },
  normal: { length: 4, min: 4, max: 5 },
  hard: { length: 4, min: 5, max: 7 },
} as const;

/** Highlights the letter that changed from the previous word. */
function changedStates(prev: string | undefined, word: string): LetterState[] {
  return [...word].map((ch, i) => (prev && prev[i] !== ch ? 'present' : 'pending'));
}

export default function WordLadderGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const [ladder, setLadder] = useState<Ladder>(() =>
    makeLadder(createRng(Date.now()), level.length, level.min, level.max),
  );
  const [steps, setSteps] = useState<string[]>([]);
  const [hints, setHints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const restart = useCallback(() => {
    const l = LEVELS[shell.difficulty];
    setLadder(makeLadder(createRng(Date.now()), l.length, l.min, l.max));
    setSteps([]);
    setHints(0);
    setMessage(null);
    setDone(false);
    started.current = false;
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const chain = [ladder.start, ...steps];
  const current = chain[chain.length - 1];

  const begin = () => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
  };

  const submit = (word: string) => {
    if (done || shell.paused) return;
    begin();
    const check = checkStep(current, word, chain);
    if (!check.ok) {
      shell.play('failure');
      setMessage(check.reason);
      return;
    }
    const next = [...steps, word];
    setSteps(next);
    setMessage(null);
    shell.play('click');
    if (word === ladder.end) {
      setDone(true);
      shell.play('levelComplete');
      const used = next.length;
      const score = Math.max(50, Math.round((500 * ladder.optimal) / used) - hints * 60);
      void reportProgress('word-ladder.first', 1);
      if (used === ladder.optimal) void reportProgress('word-ladder.optimal', 1);
      if (shell.difficulty === 'hard') void reportProgress('word-ladder.hard', 1);
      shell.endRound({
        score,
        won: true,
        title: used === ladder.optimal ? 'Perfect ladder!' : 'Ladder complete!',
        details: [
          { label: 'Steps', value: String(used) },
          { label: 'Shortest possible', value: String(ladder.optimal) },
          { label: 'Hints', value: String(hints) },
        ],
      });
    }
  };

  const useHint = () => {
    begin();
    const h = hint(current, ladder.end);
    if (!h) return setMessage('No route from here — try Undo.');
    setHints((n) => n + 1);
    setMessage(`Try: ${h.toUpperCase()}`);
  };

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Steps', value: steps.length },
          { label: 'Best possible', value: ladder.optimal },
          { label: 'Hints', value: hints },
        ]}
      />
      <p className="small muted" style={{ textAlign: 'center' }}>
        Change one letter at a time to turn <strong>{ladder.start.toUpperCase()}</strong> into{' '}
        <strong>{ladder.end.toUpperCase()}</strong>. Every step must be a real word.
      </p>
      <div style={{ display: 'grid', gap: 6 }}>
        {chain.map((w, i) => (
          <TileRow
            key={`${w}-${i}`}
            word={w}
            length={w.length}
            size={40}
            states={i === 0 ? [...w].map(() => 'correct') : changedStates(chain[i - 1], w)}
          />
        ))}
        {!done && <div style={{ textAlign: 'center', color: 'var(--text-faint)' }}>⋮</div>}
        {!done && (
          <TileRow
            word={ladder.end}
            length={ladder.end.length}
            size={40}
            states={[...ladder.end].map(() => 'absent')}
            label={`Target ${ladder.end}`}
          />
        )}
      </div>
      {!done && (
        <>
          <AnswerInput
            onSubmit={submit}
            disabled={shell.paused}
            maxLength={ladder.start.length}
            placeholder="Next word"
          />
          <div className="row">
            <button className="btn" onClick={useHint} disabled={shell.paused}>
              Hint (−60)
            </button>
            <button
              className="btn"
              onClick={() => setSteps((s) => s.slice(0, -1))}
              disabled={!steps.length || shell.paused}
            >
              Undo
            </button>
          </div>
        </>
      )}
      <WordToast message={message} />
    </WordLayout>
  );
}
