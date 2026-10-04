import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { strokeLength, toPath } from '../_shared/creative/drawings';
import { ROUNDS, TUNING, choicesFor, pickRounds, pointsFor, strokeProgress } from './engine';
import '../_shared/casual/casual.css';

export default function DrawingGuessGame() {
  const shell = useGameShell();
  const t = TUNING[shell.difficulty];
  const [rounds, setRounds] = useState(() => pickRounds(Math.random));
  const [round, setRound] = useState(0);
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState<null | { right: boolean; points: number }>(null);
  const [fastest, setFastest] = useState(1);
  const [correct, setCorrect] = useState(0);
  const [over, setOver] = useState(false);
  const started = useRef(false);
  const drawing = rounds[round];
  const choices = useMemo(
    () => (drawing ? choicesFor(drawing, t.options, Math.random) : []),
    [drawing, t.options],
  );

  const restart = useCallback(() => {
    setRounds(pickRounds(Math.random));
    setRound(0);
    setProgress(0);
    setScore(0);
    setWrong([]);
    setSolved(null);
    setFastest(1);
    setCorrect(0);
    setOver(false);
    started.current = false;
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  // Animate the sketch; after it is complete the player gets a few more seconds.
  useEffect(() => {
    if (solved || over || shell.paused) return;
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!document.hidden) setProgress((p) => p + dt / t.drawTime);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [over, shell, solved, t.drawTime, round]);

  const next = useCallback(() => {
    if (round + 1 >= ROUNDS) {
      setOver(true);
      void reportProgress('drawing-guess.first', correct > 0 ? 1 : 0);
      void reportProgress('drawing-guess.ten', correct);
      void reportProgress('drawing-guess.fast', fastest <= 0.25 ? 1 : 0);
      void incrementProgress('drawing-guess.total', correct);
      if (shell.difficulty === 'hard' && correct >= 8) void reportProgress('drawing-guess.hard', 1);
      shell.endRound({
        won: score >= 500,
        score,
        title: `${correct} of ${ROUNDS} sketches named`,
        details: [
          { label: 'Score', value: String(score) },
          {
            label: 'Fastest guess',
            value: fastest < 1 ? `${Math.round(fastest * 100)}% drawn` : '–',
          },
        ],
      });
      return;
    }
    setRound((r) => r + 1);
    setProgress(0);
    setWrong([]);
    setSolved(null);
  }, [correct, fastest, round, score, shell]);

  useEffect(() => {
    if (!solved) return;
    const id = window.setTimeout(next, 1300);
    return () => window.clearTimeout(id);
  }, [next, solved]);

  // Time out a little after the sketch is complete.
  useEffect(() => {
    if (!solved && !over && progress >= 1 + 3 / t.drawTime) {
      setSolved({ right: false, points: 0 });
      shell.play('failure');
    }
  }, [over, progress, shell, solved, t.drawTime]);

  const guess = useCallback(
    (name: string) => {
      if (!drawing || solved || over || shell.paused || wrong.includes(name)) return;
      if (name === drawing.name) {
        const pts = pointsFor(progress);
        setScore((s) => s + pts);
        setCorrect((c) => c + 1);
        setFastest((f) => Math.min(f, progress));
        setSolved({ right: true, points: pts });
        shell.play('success');
      } else {
        setWrong((w) => [...w, name]);
        setScore((s) => Math.max(0, s - 20));
        shell.play('failure');
      }
    },
    [drawing, over, progress, shell, solved, wrong],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < choices.length) guess(choices[i]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choices, guess]);

  const drawn = drawing ? strokeProgress(drawing, solved ? 1 : Math.min(1, progress)) : [];

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Sketch', value: `${Math.min(round + 1, ROUNDS)}/${ROUNDS}` },
          { label: 'Score', value: score },
          { label: 'Named', value: correct },
        ]}
      />
      <div className="cz-panel">
        <svg
          viewBox="-4 -4 108 108"
          style={{
            width: '100%',
            maxWidth: 360,
            background: '#fffdf5',
            borderRadius: 16,
            boxShadow: 'inset 0 0 0 2px #e7e5e4',
          }}
          role="img"
          aria-label={solved ? drawing?.name : 'A sketch being drawn'}
        >
          {drawing?.strokes.map((s, i) => {
            const len = strokeLength(s);
            return (
              <path
                key={i}
                d={toPath(s)}
                fill="none"
                stroke="#1c1917"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${len} ${len}`}
                strokeDashoffset={len - drawn[i]}
                visibility={drawn[i] > 0 ? 'visible' : 'hidden'}
              />
            );
          })}
        </svg>
        <div className="cz-status" aria-live="polite">
          {solved
            ? solved.right
              ? `Yes — it’s a ${drawing?.name}! +${solved.points}`
              : `It was a ${drawing?.name}.`
            : 'What is being drawn? Guess early for more points.'}
        </div>
      </div>
      <div className="cz-choices" style={{ ['--cz-cols' as string]: t.options > 4 ? 3 : 2 }}>
        {choices.map((c, i) => (
          <button
            key={c}
            type="button"
            className="cz-choice"
            disabled={!!solved || wrong.includes(c) || over}
            onClick={() => guess(c)}
            style={solved && c === drawing?.name ? { borderColor: '#16a34a' } : undefined}
          >
            <span>{c}</span>
            <kbd>{i + 1}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
