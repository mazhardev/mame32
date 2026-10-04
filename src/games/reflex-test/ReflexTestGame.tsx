'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { PADS, TIMEOUT_MS, TRIALS, average, nextTrial, score } from './engine';
import type { Trial } from './engine';
import '../_shared/casual/casual.css';

const KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'];
const LABELS = ['↑', '←', '→', '↓'];
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7'];

type Phase = 'idle' | 'waiting' | 'lit' | 'done';

export default function ReflexTestGame() {
  const shell = useGameShell();
  const [phase, setPhase] = useState<Phase>('idle');
  const [trials, setTrials] = useState<Trial[]>([]);
  const [lit, setLit] = useState<{ pad: number; decoy: boolean } | null>(null);
  const [message, setMessage] = useState('Press Start, then hit the pad that lights up.');
  const litAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const trialsRef = useRef<Trial[]>([]);
  // record() and schedule() call each other; the ref breaks the cycle.
  const scheduleRef = useRef<() => void>(() => {});

  const clear = () => window.clearTimeout(timer.current);

  const finish = useCallback(
    (all: Trial[]) => {
      setPhase('done');
      setLit(null);
      const avg = average(all);
      const correct = all.filter((t) => t.correct).length;
      void reportProgress('reflex-test.fast', avg !== null && avg < 450 ? 1 : 0);
      void reportProgress('reflex-test.lightning', avg !== null && avg < 350 ? 1 : 0);
      void reportProgress('reflex-test.perfect', correct === all.length ? 1 : 0);
      void incrementProgress('reflex-test.rounds', 1);
      shell.play('levelComplete');
      shell.endRound({
        score: score(all),
        title: avg ? `Average ${avg} ms` : 'Test complete',
        details: [
          { label: 'Correct', value: `${correct} / ${all.length}` },
          { label: 'Average reaction', value: avg ? `${avg} ms` : '–' },
          { label: 'Fastest', value: (() => { const f = all.filter((t) => t.correct && t.ms !== null && !t.decoy).map((t) => t.ms as number); return f.length ? `${Math.min(...f)} ms` : '–'; })() },
        ],
      });
    },
    [shell],
  );

  const record = useCallback(
    (t: Trial) => {
      const all = [...trialsRef.current, t];
      trialsRef.current = all;
      setTrials(all);
      setLit(null);
      if (all.length >= TRIALS) finish(all);
      else scheduleRef.current();
    },
    [finish],
  );

  const schedule = useCallback(() => {
    clear();
    setPhase('waiting');
    const next = nextTrial(shell.difficulty, Math.random);
    timer.current = window.setTimeout(() => {
      setLit({ pad: next.pad, decoy: next.decoy });
      setPhase('lit');
      litAt.current = performance.now();
      timer.current = window.setTimeout(() => {
        // Nobody pressed: correct for a decoy, a miss otherwise.
        setMessage(next.decoy ? 'Good — you left the red one alone.' : 'Too slow!');
        record({ pad: next.pad, decoy: next.decoy, ms: null, correct: next.decoy });
      }, TIMEOUT_MS[shell.difficulty]);
    }, next.delay);
  }, [record, shell.difficulty]);
  scheduleRef.current = schedule;

  const start = () => {
    if (shell.paused) return;
    clear();
    trialsRef.current = [];
    setTrials([]);
    setMessage('Wait for a pad to light…');
    shell.startRound();
    schedule();
  };

  const restart = useCallback(() => {
    clear();
    trialsRef.current = [];
    setTrials([]);
    setLit(null);
    setPhase('idle');
    setMessage('Press Start, then hit the pad that lights up.');
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (shell.paused && (phase === 'waiting' || phase === 'lit')) {
      restart();
      setMessage('Paused — the test was reset. Press Start to try again.');
    }
  }, [shell.paused, phase, restart]);

  const press = useCallback(
    (pad: number) => {
      if (phase === 'waiting') {
        clear();
        setMessage('Too early! Wait for the light.');
        shell.play('failure');
        record({ pad, decoy: false, ms: null, correct: false });
        return;
      }
      if (phase !== 'lit' || !lit) return;
      clear();
      const ms = Math.round(performance.now() - litAt.current);
      const correct = !lit.decoy && pad === lit.pad;
      setMessage(lit.decoy ? 'That one was red — leave it!' : correct ? `${ms} ms` : 'Wrong pad!');
      shell.play(correct ? 'blip' : 'failure');
      record({ pad: lit.pad, decoy: lit.decoy, ms, correct });
    },
    [lit, phase, record, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = KEYS.indexOf(e.key);
      if (i >= 0) {
        e.preventDefault();
        press(i);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const avg = average(trials);

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Trial', value: `${Math.min(trials.length + (phase === 'done' ? 0 : 1), TRIALS)} / ${TRIALS}` },
          { label: 'Average', value: avg ? `${avg} ms` : '–' },
          { label: 'Correct', value: trials.filter((t) => t.correct).length },
        ]}
      />
      <div className="cz-status" style={{ textAlign: 'center' }} aria-live="polite">
        {message}
      </div>
      <div className="cz-choices" style={{ ['--cz-cols' as string]: 2 }}>
        {Array.from({ length: PADS }, (_, i) => {
          const on = lit?.pad === i;
          return (
            <button
              key={i}
              type="button"
              className="cz-choice"
              style={{
                minHeight: 120,
                background: on ? (lit?.decoy ? '#ef4444' : COLORS[i]) : undefined,
                borderColor: on ? 'transparent' : undefined,
                color: on ? '#fff' : undefined,
              }}
              aria-label={`Pad ${LABELS[i]}${on ? (lit?.decoy ? ' — red, do not press' : ' — lit') : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                press(i);
              }}
              disabled={phase === 'idle' || phase === 'done'}
            >
              <span className="cz-emoji">{LABELS[i]}</span>
            </button>
          );
        })}
      </div>
      {(phase === 'idle' || phase === 'done') && (
        <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={shell.paused}>
          {phase === 'done' ? 'Test again' : 'Start'}
        </button>
      )}
    </div>
  );
}
