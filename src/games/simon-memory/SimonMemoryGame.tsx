import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { checkInput, extend } from './engine';
const COLORS = ['#166534', '#991b1b', '#854d0e', '#1e40af'];
const NAMES = ['Green', 'Red', 'Gold', 'Blue'];
type Phase = 'idle' | 'showing' | 'input' | 'finished';
export default function SimonMemoryGame() {
  const shell = useGameShell();
  const live = useRef(shell);
  live.current = shell;
  const [sequence, setSequence] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [flash, setFlash] = useState<number | null>(null);
  const reset = useCallback(() => {
    setSequence([]);
    setInput([]);
    setPhase('idle');
    setFlash(null);
  }, []);
  useEffect(() => {
    shell.registerRestart(reset);
  }, [shell, reset]);
  const speed = { easy: 700, normal: 550, hard: 400 }[shell.difficulty];
  useEffect(() => {
    if (phase !== 'showing' || shell.paused) {
      setFlash(null);
      return;
    }
    const timers: number[] = [];
    sequence.forEach((pad, i) => {
      timers.push(
        window.setTimeout(
          () => {
            if (document.visibilityState === 'hidden') return;
            setFlash(pad);
            live.current.play(
              ['blip', 'pop', 'select', 'tick'][pad] as 'blip' | 'pop' | 'select' | 'tick',
            );
          },
          500 + i * speed,
        ),
      );
      timers.push(window.setTimeout(() => setFlash(null), 500 + i * speed + speed * 0.65));
    });
    timers.push(
      window.setTimeout(
        () => {
          setInput([]);
          setPhase('input');
        },
        500 + sequence.length * speed,
      ),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [phase, sequence, speed, shell.paused]);
  const press = useCallback(
    (pad: number) => {
      if (phase !== 'input' || shell.paused) return;
      const outcome = checkInput(sequence, input, pad);
      shell.play('blip');
      if (outcome === 'wrong') {
        setPhase('finished');
        shell.endRound({
          title: 'Sequence ended',
          score: (sequence.length - 1) * 100,
          lost: true,
          details: [{ label: 'Longest sequence', value: String(sequence.length - 1) }],
        });
        return;
      }
      if (outcome === 'complete') {
        void reportProgress('simon-memory.level', sequence.length);
        void reportProgress('simon-memory.level-eight', sequence.length);
        if (sequence.length >= 12) {
          setPhase('finished');
          void reportProgress('simon-memory.master', 1);
          shell.endRound({ title: 'Memory master!', score: 1200, won: true });
          return;
        }
        setInput([]);
        setSequence(extend(sequence));
        setPhase('showing');
      } else setInput([...input, pad]);
    },
    [phase, shell, sequence, input],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !e.repeat &&
        !e.ctrlKey &&
        !e.metaKey &&
        /^[1-4]$/.test(e.key) &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        press(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [press]);
  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 16, padding: 16 }}>
      <GameHud
        items={[
          { label: 'Sequence', value: sequence.length },
          { label: 'Your inputs', value: `${input.length} / ${sequence.length}` },
        ]}
      />
      <p role="status">
        {phase === 'idle'
          ? 'Watch, remember, repeat.'
          : phase === 'showing'
            ? 'Watch the pattern…'
            : phase === 'input'
              ? 'Your turn — repeat the pattern.'
              : 'Round complete'}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
          gap: 12,
          width: 'min(100%,400px)',
        }}
      >
        {COLORS.map((color, i) => (
          <button
            key={color}
            aria-label={`${NAMES[i]} pad ${i + 1}${flash === i ? ', lit' : ''}`}
            disabled={phase !== 'input' || shell.paused}
            onClick={() => press(i)}
            style={{
              aspectRatio: '1',
              borderRadius: 24,
              background: flash === i ? '#fff' : color,
              color: flash === i ? '#111' : 'white',
              border: flash === i ? '6px solid var(--brand)' : '6px solid transparent',
              fontSize: 'clamp(1.3rem,6vw,2.4rem)',
              opacity: phase === 'showing' && flash !== i ? 0.55 : 1,
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {phase === 'idle' && (
        <button
          className="btn btn-primary"
          onClick={() => {
            shell.startRound();
            setSequence(extend([]));
            setPhase('showing');
          }}
        >
          Start sequence
        </button>
      )}
      <p className="small muted">Use pads or keys 1–4. Reach a sequence of 12 to win.</p>
    </div>
  );
}
