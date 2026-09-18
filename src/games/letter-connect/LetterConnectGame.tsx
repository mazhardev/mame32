import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { StartPanel, TileRow, WordLayout, WordToast, useLetterKeys } from '../_shared/words/WordUI';
import { makeLevel, tryWord } from './engine';
import type { Level } from './engine';

const LEVELS_PER_GAME = 5;
const CONFIG = {
  easy: { base: 5, targets: 8 },
  normal: { base: 6, targets: 10 },
  hard: { base: 7, targets: 12 },
} as const;

export default function LetterConnectGame() {
  const shell = useGameShell();
  const config = CONFIG[shell.difficulty];
  const [level, setLevel] = useState<Level | null>(null);
  const [levelNo, setLevelNo] = useState(1);
  const [found, setFound] = useState<string[]>([]);
  const [bonus, setBonus] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [hints, setHints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'cleared' | 'done'>('ready');

  const newLevel = useCallback(() => {
    setLevel(makeLevel(createRng(Date.now()), config.base, config.targets));
    setFound([]);
    setBonus([]);
    setRevealed({});
    setPicked([]);
  }, [config]);

  const start = () => {
    newLevel();
    setLevelNo(1);
    setScore(0);
    setHints(0);
    setMessage(null);
    setPhase('playing');
    shell.startRound();
  };

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  const endGame = (finalScore: number, levelsDone: number) => {
    setPhase('done');
    void reportProgress('letter-connect.level', levelsDone);
    void reportProgress('letter-connect.score', finalScore);
    if (hints === 0 && levelsDone >= LEVELS_PER_GAME)
      void reportProgress('letter-connect.no-hints', 1);
    shell.endRound({
      score: finalScore,
      won: levelsDone >= LEVELS_PER_GAME,
      lost: levelsDone < LEVELS_PER_GAME,
      title: levelsDone >= LEVELS_PER_GAME ? 'All levels cleared!' : 'Game over',
      details: [
        { label: 'Levels cleared', value: `${levelsDone} / ${LEVELS_PER_GAME}` },
        { label: 'Hints used', value: String(hints) },
      ],
    });
  };

  const word = level ? picked.map((i) => level.letters[i]).join('') : '';

  const submit = () => {
    if (!level || phase !== 'playing' || shell.paused || !word) return;
    const result = tryWord(word, level, found, bonus);
    setPicked([]);
    if (result.kind === 'invalid') {
      shell.play('failure');
      return setMessage(result.reason);
    }
    if (result.kind === 'repeat') return setMessage('Already found');
    if (result.kind === 'bonus') {
      setBonus((b) => [...b, result.word]);
      setScore((s) => s + 5 * result.word.length);
      shell.play('coin');
      return setMessage(`Bonus word! +${5 * result.word.length}`);
    }
    const points = 10 * result.word.length;
    const nextFound = [...found, result.word];
    setFound(nextFound);
    setScore((s) => s + points);
    setMessage(`${result.word.toUpperCase()} +${points}`);
    if (nextFound.length === level.targets.length) {
      shell.play('levelComplete');
      setScore((s) => s + 100);
      if (levelNo >= LEVELS_PER_GAME) endGame(score + points + 100, levelNo);
      else setPhase('cleared');
    } else {
      shell.play('success');
    }
  };

  const onKey = (key: string) => {
    if (!level || phase !== 'playing' || shell.paused) return;
    if (key === 'enter') return submit();
    if (key === 'backspace') return setPicked((p) => p.slice(0, -1));
    const i = level.letters.findIndex((ch, idx) => ch === key && !picked.includes(idx));
    if (i >= 0) setPicked((p) => [...p, i]);
  };
  useLetterKeys(onKey, phase === 'playing' && !shell.paused);

  const hint = () => {
    if (!level) return;
    const open = level.targets.filter(
      (t) => !found.includes(t) && (revealed[t] ?? 0) < t.length - 1,
    );
    if (!open.length) return;
    const t = open[Math.floor(Math.random() * open.length)];
    setRevealed((r) => ({ ...r, [t]: (r[t] ?? 0) + 1 }));
    setHints((h) => h + 1);
    setScore((s) => Math.max(0, s - 15));
  };

  if (phase === 'ready' || !level) {
    return (
      <StartPanel onStart={start}>
        <p>
          Connect the letters on the wheel to spell words and fill every slot. Five levels — each
          one uses a new set of letters. Extra real words earn bonus points.
        </p>
      </StartPanel>
    );
  }

  const radius = 88;
  const n = level.letters.length;

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Level', value: `${levelNo}/${LEVELS_PER_GAME}` },
          { label: 'Score', value: score },
          { label: 'Words', value: `${found.length}/${level.targets.length}` },
          { label: 'Bonus', value: bonus.length },
        ]}
        extra={
          <button className="btn" onClick={hint} disabled={phase !== 'playing'}>
            Hint (−15)
          </button>
        }
      />
      <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
        {level.targets.map((t) => {
          const got = found.includes(t);
          const shown = got ? t : t.slice(0, revealed[t] ?? 0);
          return (
            <TileRow
              key={t}
              word={shown}
              length={t.length}
              size={30}
              states={[...t].map((_, i) =>
                got ? 'correct' : i < shown.length ? 'present' : 'empty',
              )}
              label={got ? t : `${t.length}-letter word`}
            />
          );
        })}
      </div>
      <div
        style={{
          minHeight: '1.6em',
          fontWeight: 800,
          fontSize: '1.4rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {word}
      </div>
      <div
        style={{ position: 'relative', width: radius * 2 + 64, height: radius * 2 + 64 }}
        role="group"
        aria-label="Letter wheel"
      >
        <div
          style={{
            position: 'absolute',
            inset: 20,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}
        />
        {level.letters.map((ch, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const used = picked.includes(i);
          return (
            <button
              key={i}
              type="button"
              className={`word-tile ${used ? 'present' : ''}`}
              disabled={phase !== 'playing' || shell.paused}
              onClick={() => (used ? undefined : setPicked((p) => [...p, i]))}
              style={{
                position: 'absolute',
                left: radius + 32 + Math.cos(a) * radius - 24,
                top: radius + 32 + Math.sin(a) * radius - 24,
                width: 48,
                height: 48,
                borderRadius: '50%',
                fontSize: '1.3rem',
                cursor: 'pointer',
              }}
              aria-label={ch.toUpperCase()}
            >
              {ch}
            </button>
          );
        })}
      </div>
      {phase === 'playing' && (
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={submit} disabled={!word}>
            Enter
          </button>
          <button className="btn" onClick={() => setPicked([])} disabled={!word}>
            Clear
          </button>
          <button
            className="btn"
            onClick={() =>
              setLevel((l) =>
                l ? { ...l, letters: createRng(Date.now()).shuffle([...l.letters]) } : l,
              )
            }
          >
            Shuffle
          </button>
          <button className="btn" onClick={() => endGame(score, levelNo - 1)}>
            Finish
          </button>
        </div>
      )}
      {phase === 'cleared' && (
        <button
          className="btn btn-primary btn-lg"
          onClick={() => {
            setLevelNo((l) => l + 1);
            newLevel();
            setMessage(null);
            setPhase('playing');
          }}
        >
          Next level
        </button>
      )}
      <WordToast message={message} />
    </WordLayout>
  );
}
