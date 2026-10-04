import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { strokeLength, toPath } from '../_shared/creative/drawings';
import { DOTS, PICTURES, makePuzzle, pickPictures, tap } from './engine';
import '../_shared/casual/casual.css';

export default function ConnectDotsGame() {
  const shell = useGameShell();
  const count = DOTS[shell.difficulty];
  const [pictures, setPictures] = useState(() => pickPictures(Math.random));
  const [index, setIndex] = useState(0);
  const [next, setNext] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState(-1);
  const [revealed, setRevealed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [over, setOver] = useState(false);
  const started = useRef(false);
  const puzzle = useMemo(() => makePuzzle(pictures[index], count), [count, index, pictures]);
  const total = puzzle.dots.length;
  const done = next >= total;

  const restart = useCallback(() => {
    setPictures(pickPictures(Math.random));
    setIndex(0);
    setNext(0);
    setMistakes(0);
    setRevealed(false);
    setSeconds(0);
    setOver(false);
    started.current = false;
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  useEffect(() => {
    if (!started.current || over || shell.paused) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [over, shell.paused, next]);

  const press = useCallback(
    (i: number) => {
      if (done || over || shell.paused) return;
      if (!started.current) {
        started.current = true;
        shell.startRound();
      }
      if (tap(next, i) === 'connect') {
        setNext(next + 1);
        shell.play(next + 1 === total ? 'success' : 'blip');
        if (next + 1 === total)
          window.setTimeout(() => setRevealed(true), puzzle.closed ? 250 : 50);
      } else {
        setMistakes((m) => m + 1);
        setShake(i);
        window.setTimeout(() => setShake(-1), 300);
        shell.play('failure');
      }
    },
    [done, next, over, puzzle.closed, shell, total],
  );

  const nextPicture = useCallback(() => {
    if (index + 1 >= PICTURES) {
      setOver(true);
      void reportProgress('connect-dots-drawing.first', 1);
      void incrementProgress('connect-dots-drawing.pictures', PICTURES);
      if (mistakes === 0) void reportProgress('connect-dots-drawing.perfect', 1);
      if (shell.difficulty === 'hard') void reportProgress('connect-dots-drawing.hard', 1);
      shell.endRound({
        won: true,
        score: Math.max(50, PICTURES * 200 - mistakes * 20 - seconds * 2),
        title: 'All pictures revealed!',
        details: [
          { label: 'Pictures', value: pictures.map((p) => p.name).join(', ') },
          { label: 'Wrong taps', value: String(mistakes) },
          { label: 'Time', value: `${Math.floor(seconds / 60)}m ${seconds % 60}s` },
        ],
      });
      return;
    }
    setIndex((x) => x + 1);
    setNext(0);
    setRevealed(false);
  }, [index, mistakes, pictures, seconds, shell]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === 'Enter' || e.key === ' ') &&
        revealed &&
        !over &&
        (e.target as HTMLElement | null)?.tagName !== 'BUTTON'
      ) {
        e.preventDefault();
        nextPicture();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextPicture, over, revealed]);

  const lines = puzzle.dots.slice(0, next);
  const highlight = shell.difficulty !== 'hard';
  const fontSize = count > 20 ? 3.2 : 4;

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Picture', value: `${index + 1}/${PICTURES}` },
          { label: 'Dot', value: `${Math.min(next + 1, total)}/${total}` },
          { label: 'Wrong taps', value: mistakes },
        ]}
      />
      <div className="cz-panel">
        <svg
          viewBox="-6 -6 112 112"
          style={{
            width: '100%',
            maxWidth: 480,
            background: '#fff',
            borderRadius: 16,
            touchAction: 'manipulation',
          }}
          role="group"
          aria-label="Dots to connect"
        >
          {lines.length > 1 && (
            <path
              d={toPath(lines)}
              fill="none"
              stroke="#4f46e5"
              strokeWidth={1.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {done && puzzle.closed && (
            <path
              d={toPath([puzzle.dots[total - 1], puzzle.dots[0]])}
              stroke="#4f46e5"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          )}
          {revealed &&
            puzzle.drawing.strokes
              .slice(1)
              .map((s, k) => (
                <path
                  key={k}
                  d={toPath(s)}
                  fill="none"
                  stroke="#1c1917"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={strokeLength(s)}
                  strokeDashoffset={0}
                  style={{ transition: 'stroke-dashoffset 0.6s' }}
                />
              ))}
          {puzzle.dots.map(([x, y], i) => {
            const isNext = i === next && !done;
            const connected = i < next;
            return (
              <g
                key={i}
                role="button"
                tabIndex={connected || done ? -1 : 0}
                aria-label={`Dot ${i + 1}${isNext ? ' (next)' : ''}`}
                onClick={() => press(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    press(i);
                  }
                }}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                <circle cx={x} cy={y} r={4.5} fill="transparent" />
                {isNext && highlight && (
                  <circle cx={x} cy={y} r={3.4} fill="rgba(250,204,21,0.6)" />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={shake === i ? 2.4 : 1.6}
                  fill={connected ? '#4f46e5' : shake === i ? '#ef4444' : '#0f172a'}
                />
                {!done && (
                  <text
                    x={puzzle.labels[i][0]}
                    y={puzzle.labels[i][1]}
                    fontSize={fontSize}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={connected ? '#a5b4fc' : '#334155'}
                    fontWeight={isNext && highlight ? 800 : 500}
                  >
                    {i + 1}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="cz-status" aria-live="polite">
          {revealed
            ? `It’s ${/^[AEIOU]/.test(puzzle.drawing.name) ? 'an' : 'a'} ${puzzle.drawing.name}!`
            : `Tap the dots in order, starting at 1.`}
        </div>
        {revealed && (
          <button type="button" className="btn btn-primary" onClick={nextPicture}>
            {index + 1 >= PICTURES ? 'Finish' : 'Next picture'}
          </button>
        )}
      </div>
    </div>
  );
}
