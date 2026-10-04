import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { applyMove, generate, isTrue, read, slots, solutions } from './engine';
import type { Equation, Kind } from './engine';
import '../_shared/casual/casual.css';
import './matchstick.css';

const ROUND = 5;
const DIGIT_W = 64;
const OP_W = 56;
const H = 110;

/** Stick endpoints in a symbol's local coordinates. */
const SEGMENTS: Record<Kind, [number, number, number, number][]> = {
  digit: [
    [12, 6, 52, 6], // a
    [56, 10, 56, 51], // b
    [56, 59, 56, 100], // c
    [12, 104, 52, 104], // d
    [8, 59, 8, 100], // e
    [8, 10, 8, 51], // f
    [12, 55, 52, 55], // g
  ],
  op: [
    [8, 55, 48, 55],
    [28, 35, 28, 75],
  ],
  eq: [],
};

const width = (k: Kind) => (k === 'digit' ? DIGIT_W : OP_W);
const POINTS: Record<number, number> = { 0: 100, 1: 60 };

export default function MatchstickPuzzleGame() {
  const shell = useGameShell();
  const [puzzle, setPuzzle] = useState<Equation>(() => generate(shell.difficulty, Math.random));
  const [eq, setEq] = useState<Equation>(puzzle);
  const [held, setHeld] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [index, setIndex] = useState(1);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [status, setStatus] = useState<'playing' | 'solved' | 'revealed'>('playing');
  const [message, setMessage] = useState('Move one matchstick to make the equation true.');
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);

  const load = useCallback(() => {
    const p = generate(shell.difficulty, Math.random);
    setPuzzle(p);
    setEq(p);
    setHeld(null);
    setMistakes(0);
    setStatus('playing');
    setMessage('Move one matchstick to make the equation true.');
  }, [shell.difficulty]);

  const restart = useCallback(() => {
    load();
    setIndex(1);
    setScore(0);
    setSolved(0);
    setStarted(false);
    setOver(false);
  }, [load]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const begin = () => {
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
  };

  const pick = (i: number, s: number) => {
    if (status !== 'playing' || shell.paused) return;
    begin();
    if (held && held[0] === i && held[1] === s) {
      setHeld(null);
      return;
    }
    setHeld([i, s]);
    shell.play('select');
  };

  const place = (j: number, t: number) => {
    if (!held || status !== 'playing' || shell.paused) return;
    const next = applyMove(eq, { from: held, to: [j, t] });
    setHeld(null);
    if (!read(next)) {
      setMessage('That would not make a real digit or sign.');
      shell.play('failure');
      return;
    }
    if (isTrue(next)) {
      setEq(next);
      setStatus('solved');
      const pts = POINTS[mistakes] ?? 30;
      setScore((v) => v + pts);
      setSolved((v) => v + 1);
      setMessage(`Correct! ${read(next)?.replace('-', '−')}  (+${pts})`);
      shell.play('success');
    } else {
      setMistakes((m) => m + 1);
      setMessage(`${read(next)?.replace('-', '−')} is not true. Try another move.`);
      shell.play('failure');
    }
  };

  const reveal = () => {
    if (status !== 'playing') return;
    begin();
    const sol = solutions(puzzle)[0];
    if (!sol) return;
    setEq(applyMove(puzzle, sol));
    setStatus('revealed');
    setMessage(`One answer: ${read(applyMove(puzzle, sol))?.replace('-', '−')}`);
  };

  const next = () => {
    if (index >= ROUND) {
      setOver(true);
      void reportProgress('matchstick-puzzle.first', solved > 0 ? 1 : 0);
      void reportProgress('matchstick-puzzle.perfect', score >= ROUND * 100 ? 1 : 0);
      void reportProgress('matchstick-puzzle.hard', shell.difficulty === 'hard' && solved === ROUND ? 1 : 0);
      void incrementProgress('matchstick-puzzle.solved', solved);
      shell.play('levelComplete');
      shell.endRound({
        score,
        won: solved >= 3,
        title: `${solved} of ${ROUND} solved`,
        details: [{ label: 'Solved', value: `${solved} / ${ROUND}` }],
      });
      return;
    }
    setIndex((i) => i + 1);
    load();
  };

  let x = 0;
  const layout = eq.map((s) => {
    const pos = x;
    x += width(s.kind) + 6;
    return pos;
  });
  const totalW = x;

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Puzzle', value: `${index} / ${ROUND}` },
          { label: 'Score', value: score },
          { label: 'Wrong tries', value: mistakes },
        ]}
      />
      <div className="cz-panel">
        <svg className={`ms-board${held ? ' holding' : ''}`} viewBox={`-6 -6 ${totalW + 6} ${H + 12}`} role="group" aria-label={`Equation ${read(eq)?.replace('-', ' minus ').replace('+', ' plus ').replace('=', ' equals ') ?? ''}`}>
          {eq.map((s, i) => (
            <g key={i} transform={`translate(${layout[i]},0)`}>
              {s.kind === 'eq' && (
                <>
                  <line x1={8} y1={45} x2={48} y2={45} className="ms-stick fixed" />
                  <line x1={8} y1={67} x2={48} y2={67} className="ms-stick fixed" />
                </>
              )}
              {SEGMENTS[s.kind].slice(0, slots(s.kind)).map(([x1, y1, x2, y2], k) => {
                const on = (s.lit & (1 << k)) !== 0;
                const isHeld = held && held[0] === i && held[1] === k;
                return (
                  <g key={k}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className={`ms-stick${on ? '' : ' slot'}${isHeld ? ' held' : ''}`}
                    />
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className="ms-hit"
                      role="button"
                      tabIndex={status === 'playing' && (on || held) ? 0 : -1}
                      aria-label={on ? `Matchstick ${k + 1} of symbol ${i + 1}${isHeld ? ', picked up' : ''}` : `Empty slot ${k + 1} of symbol ${i + 1}`}
                      onClick={() => (on ? pick(i, k) : place(i, k))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (on) pick(i, k);
                          else place(i, k);
                        }
                      }}
                    />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
        <div className="cz-status" aria-live="polite">
          {held ? 'Now tap an empty slot to place the stick.' : message}
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {status === 'playing' ? (
            <>
              <button type="button" className="btn" onClick={() => { setEq(puzzle); setHeld(null); }} disabled={shell.paused}>
                ↺ Reset
              </button>
              <button type="button" className="btn" onClick={reveal} disabled={shell.paused}>
                Show answer
              </button>
            </>
          ) : (
            !over && (
              <button type="button" className="btn btn-primary" onClick={next}>
                {index >= ROUND ? 'Finish' : 'Next puzzle'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
