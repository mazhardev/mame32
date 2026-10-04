import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';
import {
  StartPanel,
  Tile,
  WordKeyboard,
  WordLayout,
  WordToast,
  useLetterKeys,
} from '../_shared/words/WordUI';
import type { LetterState } from '../_shared/words/WordUI';
import { PhraseRound, VOWEL_COST, isLetter } from './engine';
import { PHRASES } from './phrases';

const ROUNDS = 3;
const LIVES = { easy: 7, normal: 5, hard: 4 } as const;

function pickPhrases(rng: Rng, level: 'easy' | 'normal' | 'hard'): [string, string][] {
  const max = level === 'easy' ? 1 : level === 'normal' ? 2 : 3;
  const min = level === 'hard' ? 2 : 1;
  const pool = PHRASES.filter(([, , l]) => l >= min && l <= max);
  return rng
    .shuffle([...pool])
    .slice(0, ROUNDS)
    .map(([c, p]) => [c, p]);
}

export default function GuessThePhraseGame() {
  const shell = useGameShell();
  const rngRef = useRef(createRng(Date.now()));
  const [phrases, setPhrases] = useState<[string, string][]>([]);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState<PhraseRound | null>(null);
  const [total, setTotal] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [, force] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'between' | 'done'>('ready');

  const newRound = useCallback(
    (list: [string, string][], i: number) => {
      const [category, phrase] = list[i];
      setRound(new PhraseRound(phrase, category, LIVES[shell.difficulty], rngRef.current));
      setSolving(false);
      setMessage(null);
    },
    [shell.difficulty],
  );

  const start = () => {
    rngRef.current = createRng(Date.now());
    const list = pickPhrases(rngRef.current, shell.difficulty);
    setPhrases(list);
    setIndex(0);
    setTotal(0);
    setSolvedCount(0);
    newRound(list, 0);
    setPhase('playing');
    shell.startRound();
  };

  useEffect(() => shell.registerRestart(() => setPhase('ready')), [shell]);
  useEffect(() => setPhase('ready'), [shell.difficulty]);

  const roundOver = (r: PhraseRound) => {
    const earned = r.solved ? r.points : 0;
    const nextTotal = total + earned;
    const nextSolved = solvedCount + (r.solved ? 1 : 0);
    setTotal(nextTotal);
    setSolvedCount(nextSolved);
    shell.play(r.solved ? 'levelComplete' : 'gameOver');
    setMessage(r.solved ? `Solved! +${earned}` : `Out of lives — it was “${r.phrase}”.`);
    if (index + 1 >= ROUNDS) {
      setPhase('done');
      void reportProgress('guess-the-phrase.first', nextSolved);
      void reportProgress('guess-the-phrase.score', nextTotal);
      if (nextSolved === ROUNDS) void reportProgress('guess-the-phrase.all', 1);
      shell.endRound({
        score: nextTotal,
        won: nextSolved >= 2,
        lost: nextSolved < 2,
        details: [{ label: 'Phrases solved', value: `${nextSolved} / ${ROUNDS}` }],
      });
    } else {
      setPhase('between');
    }
  };

  const guess = (letter: string) => {
    if (!round || phase !== 'playing' || shell.paused || solving) return;
    const res = round.guess(letter);
    setMessage(res.message);
    shell.play(res.ok ? 'coin' : 'failure');
    force((n) => n + 1);
    if (round.over) roundOver(round);
  };

  const trySolve = (text: string) => {
    if (!round || phase !== 'playing') return;
    const ok = round.solve(text);
    setSolving(false);
    force((n) => n + 1);
    if (!ok) {
      shell.play('failure');
      setMessage('That’s not it!');
    }
    if (round.over) roundOver(round);
  };

  useLetterKeys(
    (k) => (k.length === 1 ? guess(k) : undefined),
    phase === 'playing' && !solving && !shell.paused,
  );

  if (phase === 'ready' || !round) {
    return (
      <StartPanel onStart={start}>
        <p>
          Reveal the hidden phrase. Each consonant earns the prize value for every time it appears;
          vowels cost {VOWEL_COST} points. Solve it for a bonus! {ROUNDS} phrases per game.
        </p>
      </StartPanel>
    );
  }

  const keyStates: Record<string, LetterState> = {};
  for (const l of round.guessed)
    keyStates[l.toLowerCase()] = round.phrase.includes(l) ? 'correct' : 'absent';

  const words = round.board.split(' ');

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Phrase', value: `${index + 1}/${ROUNDS}` },
          { label: 'Round points', value: round.points },
          { label: 'Total', value: total },
          { label: 'Lives', value: '❤️'.repeat(Math.max(0, round.lives)) || '0' },
        ]}
      />
      <div className="word-panel" style={{ gap: 10 }}>
        <span className="small muted">Category: {round.category}</span>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', justifyContent: 'center' }}
          aria-label={`Phrase: ${round.board.replace(/_/g, ' blank ')}`}
        >
          {words.map((w, wi) => (
            <div key={wi} style={{ display: 'flex', gap: 4 }}>
              {[...w].map((ch, ci) =>
                isLetter(ch) || ch === '_' ? (
                  <Tile
                    key={ci}
                    letter={ch === '_' ? '' : ch}
                    state={ch === '_' ? 'empty' : 'correct'}
                    size={34}
                  />
                ) : (
                  <span
                    key={ci}
                    style={{ fontWeight: 800, fontSize: '1.3rem', alignSelf: 'center' }}
                  >
                    {ch}
                  </span>
                ),
              )}
            </div>
          ))}
        </div>
        {phase === 'playing' && (
          <span>
            Next consonant is worth <strong>{round.prize}</strong> per letter
          </span>
        )}
      </div>
      <WordToast message={message} />
      {phase === 'playing' && !solving && (
        <>
          <WordKeyboard
            onKey={(k) => (k.length === 1 ? guess(k) : undefined)}
            states={keyStates}
            disabled={shell.paused}
            enterLabel="—"
          />
          <button
            className="btn btn-primary"
            onClick={() => setSolving(true)}
            disabled={shell.paused}
          >
            Solve the phrase
          </button>
        </>
      )}
      {phase === 'playing' && solving && (
        <form
          className="word-input"
          onSubmit={(e) => {
            e.preventDefault();
            const v = new FormData(e.currentTarget).get('solve');
            trySolve(String(v ?? ''));
          }}
        >
          <input
            name="solve"
            className="input"
            autoFocus
            autoComplete="off"
            placeholder="Type the whole phrase"
          />
          <button className="btn btn-primary" type="submit">
            Solve
          </button>
          <button className="btn" type="button" onClick={() => setSolving(false)}>
            Cancel
          </button>
        </form>
      )}
      {phase === 'between' && (
        <button
          className="btn btn-primary btn-lg"
          onClick={() => {
            setIndex((i) => i + 1);
            newRound(phrases, index + 1);
            setPhase('playing');
          }}
        >
          Next phrase
        </button>
      )}
    </WordLayout>
  );
}
