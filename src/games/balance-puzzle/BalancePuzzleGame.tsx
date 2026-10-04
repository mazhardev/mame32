import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { QUESTIONS, SHAPES, generate, options } from './engine';
import type { Pan, Puzzle } from './engine';
import '../_shared/casual/casual.css';
import './balance.css';

function PanView({ pan }: { pan: Pan }) {
  const items = pan.flatMap((n, i) => Array<string>(n).fill(SHAPES[i]));
  return (
    <div className="bal-pan" aria-label={pan.map((n, i) => (n ? `${n} ${SHAPES[i]}` : '')).filter(Boolean).join(' and ')}>
      {items.map((s, k) => (
        <span key={k} aria-hidden="true">
          {s}
        </span>
      ))}
    </div>
  );
}

function ScaleView({ left, right }: { left: Pan; right: Pan }) {
  return (
    <div className="bal-scale">
      <PanView pan={left} />
      <span className="bal-eq" aria-label="balances">
        ⚖️
      </span>
      <PanView pan={right} />
    </div>
  );
}

export default function BalancePuzzleGame() {
  const shell = useGameShell();
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generate(shell.difficulty, Math.random));
  const [choices, setChoices] = useState<number[]>(() => options(puzzle.answer, Math.random));
  const [q, setQ] = useState(1);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  const newPuzzle = useCallback(() => {
    const p = generate(shell.difficulty, Math.random);
    setPuzzle(p);
    setChoices(options(p.answer, Math.random));
    setPicked(null);
  }, [shell.difficulty]);

  const restart = useCallback(() => {
    newPuzzle();
    setQ(1);
    setCorrect(0);
    setStarted(false);
    setDone(false);
  }, [newPuzzle]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const choose = (v: number) => {
    if (picked !== null || done || shell.paused) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    setPicked(v);
    const right = v === puzzle.answer;
    const total = correct + (right ? 1 : 0);
    setCorrect(total);
    shell.play(right ? 'success' : 'failure');
    if (q >= QUESTIONS) {
      setDone(true);
      void reportProgress('balance-puzzle.first', total > 0 ? 1 : 0);
      void reportProgress('balance-puzzle.perfect', total === QUESTIONS ? 1 : 0);
      void reportProgress('balance-puzzle.hard', shell.difficulty === 'hard' && total >= 6 ? 1 : 0);
      void incrementProgress('balance-puzzle.solved', total);
      window.setTimeout(
        () =>
          shell.endRound({
            score: total * 100,
            won: total >= QUESTIONS / 2,
            title: `${total} of ${QUESTIONS} balanced`,
            details: [{ label: 'Correct', value: `${total} / ${QUESTIONS}` }],
          }),
        700,
      );
    }
  };

  const next = () => {
    if (done) return;
    setQ((n) => n + 1);
    newPuzzle();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && picked === null) choose(choices[n - 1]);
      else if ((e.key === 'Enter' || e.key === ' ') && picked !== null && !done) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const unitPan = Array(puzzle.shapes).fill(0);
  unitPan[puzzle.unit] = 1;

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Question', value: `${q} / ${QUESTIONS}` },
          { label: 'Correct', value: correct },
        ]}
      />
      <div className="cz-panel" style={{ alignItems: 'stretch' }}>
        <div className="small muted">These scales are balanced:</div>
        {puzzle.clues.map((c, i) => (
          <ScaleView key={i} left={c.left} right={c.right} />
        ))}
        <div className="small muted" style={{ marginTop: 8 }}>
          How many {SHAPES[puzzle.unit]} balance this?
        </div>
        <div className="bal-scale bal-question">
          <PanView pan={puzzle.ask} />
          <span className="bal-eq">⚖️</span>
          <div className="bal-pan">
            <strong>{picked === null ? '?' : puzzle.answer}</strong> × <span aria-hidden="true">{SHAPES[puzzle.unit]}</span>
          </div>
        </div>
      </div>
      <div className="cz-choices" style={{ ['--cz-cols' as string]: 4 }}>
        {choices.map((v, i) => (
          <button
            key={v}
            type="button"
            className="cz-choice"
            style={{
              background: picked !== null && v === puzzle.answer ? 'var(--success-soft)' : picked === v ? 'var(--danger-soft)' : undefined,
              fontSize: '1.4rem',
              minHeight: 64,
            }}
            disabled={picked !== null || done || shell.paused}
            onClick={() => choose(v)}
          >
            {v}
            <kbd>{i + 1}</kbd>
          </button>
        ))}
      </div>
      {picked !== null && !done && (
        <button type="button" className="btn btn-primary btn-lg" onClick={next}>
          Next scale
        </button>
      )}
    </div>
  );
}
