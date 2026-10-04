'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { PARTS, TRIALS, WINDOW_MS, batteryScore, judge, makeStimulus, partAverage } from './engine';
import type { Input, Part, Response, Stimulus } from './engine';
import '../_shared/casual/casual.css';

const TITLE: Record<Part, string> = { simple: 'Simple reaction', choice: 'Choice reaction', gonogo: 'Go / No-go' };
const HOW: Record<Part, string> = {
  simple: 'Tap or press Space as soon as the panel turns green.',
  choice: 'An arrow appears: press ← or → (or tap that side) to match it.',
  gonogo: 'Respond to GREEN only. When it turns RED, do nothing.',
};

type Phase = 'intro' | 'wait' | 'stim' | 'done';

export default function ReactionTestProGame() {
  const shell = useGameShell();
  const trials = TRIALS[shell.difficulty];
  const [partIndex, setPartIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [stim, setStim] = useState<Stimulus | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [note, setNote] = useState('');
  const shownAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const ref = useRef({ partIndex, phase, stim, responses });
  ref.current = { partIndex, phase, stim, responses };
  const part = PARTS[partIndex];
  const doneInPart = responses.filter((r) => r.part === part).length;

  const clear = () => window.clearTimeout(timer.current);

  const finish = useCallback(
    (all: Response[]) => {
      setPhase('done');
      const accuracy = all.filter((r) => r.correct).length / all.length;
      const simple = partAverage(all, 'simple');
      void reportProgress('reaction-test-pro.complete', 1);
      void reportProgress('reaction-test-pro.sharp', simple !== null && simple < 280 ? 1 : 0);
      void reportProgress('reaction-test-pro.disciplined', all.filter((r) => r.part === 'gonogo').every((r) => r.correct) ? 1 : 0);
      void incrementProgress('reaction-test-pro.sessions', 1);
      shell.play('levelComplete');
      shell.endRound({
        score: batteryScore(all),
        title: `Accuracy ${Math.round(accuracy * 100)}%`,
        details: PARTS.map((p) => {
          const avg = partAverage(all, p);
          const ok = all.filter((r) => r.part === p && r.correct).length;
          return { label: TITLE[p], value: `${avg !== null ? `${avg} ms` : '–'} · ${ok}/${trials}` };
        }),
      });
    },
    [shell, trials],
  );

  const next = useCallback(() => {
    clear();
    const cur = ref.current;
    const p = PARTS[cur.partIndex];
    const s = makeStimulus(p, Math.random);
    setStim(null);
    setPhase('wait');
    timer.current = window.setTimeout(() => {
      setStim(s);
      setPhase('stim');
      shownAt.current = performance.now();
      timer.current = window.setTimeout(() => respondRef.current({ kind: 'timeout' }), WINDOW_MS);
    }, s.delay);
  }, []);

  const respond = useCallback(
    (input: Input) => {
      const cur = ref.current;
      if (cur.phase !== 'wait' && cur.phase !== 'stim') return;
      clear();
      const s = cur.phase === 'stim' && cur.stim ? cur.stim : { part: PARTS[cur.partIndex], go: true, delay: 0 };
      const r = judge(s, cur.phase === 'wait' ? { kind: 'early' } : input);
      const all = [...cur.responses, r];
      setResponses(all);
      setNote(
        cur.phase === 'wait'
          ? 'Too early!'
          : r.correct
            ? r.ms !== null
              ? `${r.ms} ms`
              : 'Well held!'
            : !s.go
              ? 'That was red — hold still.'
              : input.kind === 'timeout'
                ? 'Too slow.'
                : 'Wrong side.',
      );
      shell.play(r.correct ? 'blip' : 'failure');
      const inPart = all.filter((x) => x.part === s.part).length;
      if (inPart >= trials) {
        if (cur.partIndex >= PARTS.length - 1) finish(all);
        else {
          setPartIndex(cur.partIndex + 1);
          setPhase('intro');
          setStim(null);
        }
      } else next();
    },
    [finish, next, shell, trials],
  );
  const respondRef = useRef(respond);
  respondRef.current = respond;

  const restart = useCallback(() => {
    clear();
    setPartIndex(0);
    setPhase('intro');
    setStim(null);
    setResponses([]);
    setNote('');
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [shell.difficulty, restart]);
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (shell.paused && (phase === 'wait' || phase === 'stim')) {
      clear();
      setPhase('intro');
      setStim(null);
      setNote('Paused — this part restarts from its next trial.');
    }
  }, [shell.paused, phase]);

  const beginPart = () => {
    if (shell.paused) return;
    if (responses.length === 0) shell.startRound();
    setNote('');
    next();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'wait' && phase !== 'stim') return;
      if (e.key === 'ArrowLeft') respond({ kind: 'press', side: 'left', ms: performance.now() - shownAt.current });
      else if (e.key === 'ArrowRight') respond({ kind: 'press', side: 'right', ms: performance.now() - shownAt.current });
      else if (e.key === ' ' || e.key === 'Enter') respond({ kind: 'press', ms: performance.now() - shownAt.current });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, respond]);

  const tapSide = (side: 'left' | 'right') => respond({ kind: 'press', side, ms: Math.round(performance.now() - shownAt.current) });

  const color =
    phase === 'stim' && stim
      ? stim.part === 'gonogo' && !stim.go
        ? '#ef4444'
        : stim.part === 'choice'
          ? '#3b82f6'
          : '#22c55e'
      : phase === 'wait'
        ? '#475569'
        : 'var(--surface)';

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Part', value: `${partIndex + 1} / 3` },
          { label: 'Trial', value: phase === 'done' ? '–' : `${Math.min(doneInPart + 1, trials)} / ${trials}` },
          { label: 'Correct', value: responses.filter((r) => r.correct).length },
        ]}
      />
      {phase === 'intro' ? (
        <div className="cz-panel">
          <div className="cz-status">
            Part {partIndex + 1}: {TITLE[part]}
          </div>
          <p className="small muted">{HOW[part]}</p>
          {note && <p className="small">{note}</p>}
          <button type="button" className="btn btn-primary btn-lg" onClick={beginPart} disabled={shell.paused}>
            {doneInPart ? 'Continue' : 'Begin'}
          </button>
        </div>
      ) : phase === 'done' ? (
        <div className="cz-panel">
          <div className="cz-status">Battery complete</div>
        </div>
      ) : (
        <div
          className="cz-panel"
          style={{ minHeight: 260, background: color, color: '#fff', justifyContent: 'center', cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation' }}
          onPointerDown={(e) => {
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            tapSide(e.clientX < r.left + r.width / 2 ? 'left' : 'right');
          }}
          role="button"
          aria-label={phase === 'wait' ? 'Wait…' : stim?.part === 'choice' ? `Arrow ${stim.side}` : stim?.go ? 'Go!' : 'Stop — do not respond'}
        >
          <div className="cz-big" aria-hidden="true">
            {phase === 'wait' ? '…' : stim?.part === 'choice' ? (stim.side === 'left' ? '←' : '→') : stim?.go ? 'GO' : 'STOP'}
          </div>
          <div className="cz-status">{note}</div>
        </div>
      )}
    </div>
  );
}
