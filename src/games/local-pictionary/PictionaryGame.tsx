'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { Sketchpad, UNITS } from '../_shared/creative/Sketchpad';
import type { InkStroke } from '../_shared/creative/Sketchpad';
import { TIMER, award, cleanName, drawWord } from './words';
import type { Player } from './words';
import '../_shared/casual/casual.css';
import '../_shared/creative/creative.css';

type Phase = 'setup' | 'pass' | 'reveal' | 'draw' | 'guessed' | 'end';
const INKS = ['#1f2937', '#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#ffffff'];

export default function PictionaryGame() {
  const shell = useGameShell();
  const total = TIMER[shell.difficulty];
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3']);
  const [turnsEach, setTurnsEach] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<Phase>('setup');
  const [turn, setTurn] = useState(0);
  const [word, setWord] = useState('');
  const [left, setLeft] = useState(total);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [ink, setInk] = useState(INKS[0]);
  const [guessed, setGuessed] = useState<{ by: number | null } | null>(null);
  const [peek, setPeek] = useState(false);
  const used = useRef(new Set<string>());
  const drawer = players.length ? turn % players.length : 0;
  const lastTurn = players.length * turnsEach - 1;

  const restart = useCallback(() => {
    setPhase('setup');
    setTurn(0);
    setStrokes([]);
    setGuessed(null);
    used.current = new Set();
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  useEffect(() => {
    if (phase !== 'draw' || shell.paused) return;
    if (left <= 0) {
      setGuessed({ by: null });
      setPhase('guessed');
      shell.play('failure');
      return;
    }
    const id = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    if (left <= 5) shell.play('tick');
    return () => window.clearTimeout(id);
  }, [left, phase, shell]);

  const start = () => {
    const list = names.map((n, i) => ({ name: cleanName(n, `Player ${i + 1}`), score: 0 }));
    setPlayers(list);
    setTurn(0);
    setPhase('pass');
    shell.startRound();
  };

  const reveal = () => {
    const w = drawWord(shell.difficulty, used.current, Math.random);
    used.current.add(w);
    setWord(w);
    setPhase('reveal');
  };

  const begin = () => {
    setStrokes([]);
    setLeft(total);
    setPhase('draw');
    shell.play('select');
  };

  const success = (by: number) => {
    setPlayers((ps) => award(ps, drawer, by, left, total));
    setGuessed({ by });
    setPhase('guessed');
    shell.play('success');
    void reportProgress('local-pictionary.guess', 1);
    if (left >= total - 15) void reportProgress('local-pictionary.quick', 1);
  };

  const nextTurn = () => {
    if (turn >= lastTurn) {
      setPhase('end');
      const ranked = [...players].sort((a, b) => b.score - a.score);
      void reportProgress('local-pictionary.party', 1);
      void incrementProgress('local-pictionary.words', players.length * turnsEach);
      if (players.length >= 4) void reportProgress('local-pictionary.crowd', 1);
      shell.endRound({
        won: true,
        score: ranked[0]?.score ?? 0,
        title:
          ranked.length > 1 && ranked[0].score === ranked[1].score
            ? 'It’s a tie!'
            : `${ranked[0]?.name} wins!`,
        details: ranked.map((p, i) => ({
          label: `${i + 1}. ${p.name}`,
          value: `${p.score} point${p.score === 1 ? '' : 's'}`,
        })),
      });
      return;
    }
    setTurn((t) => t + 1);
    setGuessed(null);
    setPhase('pass');
  };

  if (phase === 'setup') {
    return (
      <div className="cz">
        <div className="cz-panel" style={{ alignItems: 'stretch', textAlign: 'left' }}>
          <strong>Who’s playing?</strong>
          <p className="small muted" style={{ margin: 0 }}>
            Take turns drawing on this device while everyone else shouts out guesses. Use names or
            team names.
          </p>
          {names.map((n, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              <input
                value={n}
                maxLength={16}
                aria-label={`Player ${i + 1} name`}
                onChange={(e) => setNames((ns) => ns.map((x, j) => (j === i ? e.target.value : x)))}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  font: 'inherit',
                }}
              />
              {names.length > 2 && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setNames((ns) => ns.filter((_, j) => j !== i))}
                  aria-label={`Remove ${n}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {names.length < 8 && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setNames((ns) => [...ns, `Player ${ns.length + 1}`])}
            >
              + Add player
            </button>
          )}
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="small">Turns each:</span>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`btn btn-sm ${turnsEach === n ? 'btn-primary' : ''}`}
                onClick={() => setTurnsEach(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={start}>
            Start the game
          </button>
        </div>
      </div>
    );
  }

  const current = players[drawer];
  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Turn', value: `${Math.min(turn + 1, lastTurn + 1)}/${lastTurn + 1}` },
          { label: 'Drawing', value: current?.name ?? '' },
          { label: 'Time', value: phase === 'draw' ? `${left}s` : '–' },
        ]}
      />
      <div className="cz-panel">
        {phase === 'pass' && (
          <>
            <div className="cz-big">🤫</div>
            <div className="cz-status">
              Pass the device to {current.name}. Everyone else, look away!
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={reveal}>
              I’m {current.name} — show my word
            </button>
          </>
        )}
        {phase === 'reveal' && (
          <>
            <div className="small muted">Your word is</div>
            <div style={{ fontSize: 'clamp(2rem, 9vw, 3.2rem)', fontWeight: 800 }}>{word}</div>
            <div className="small muted">No letters, numbers or talking — just draw!</div>
            <button type="button" className="btn btn-primary btn-lg" onClick={begin}>
              Hide it and start drawing
            </button>
          </>
        )}
        {(phase === 'draw' || phase === 'guessed') && (
          <>
            <div
              className="idle-progress"
              style={{
                width: '100%',
                height: 8,
                borderRadius: 999,
                background: 'var(--surface-2)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(left / total) * 100}%`,
                  height: '100%',
                  background: left <= 10 ? '#ef4444' : 'var(--brand)',
                  transition: 'width 1s linear',
                }}
              />
            </div>
            <Sketchpad
              strokes={strokes}
              onChange={setStrokes}
              color={ink}
              width={ink === '#ffffff' ? UNITS / 25 : UNITS / 110}
              disabled={phase !== 'draw' || shell.paused}
              ariaLabel={`${current.name}'s drawing`}
            />
            {phase === 'draw' ? (
              <>
                <div className="cr-row" style={{ justifyContent: 'center' }}>
                  {INKS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="cr-swatch"
                      style={{ background: c, width: 34 }}
                      aria-label={c === '#ffffff' ? 'Eraser' : `Ink ${c}`}
                      aria-pressed={ink === c}
                      onClick={() => setInk(c)}
                    >
                      {c === '#ffffff' ? '🧽' : ''}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setStrokes((s) => s.slice(0, -1))}
                    disabled={!strokes.length}
                  >
                    ↶
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onPointerDown={() => setPeek(true)}
                    onPointerUp={() => setPeek(false)}
                    onPointerLeave={() => setPeek(false)}
                  >
                    {peek ? word : 'Hold to peek'}
                  </button>
                </div>
                <div className="small muted">Someone guessed right? Tap their name:</div>
                <div className="cr-row" style={{ justifyContent: 'center' }}>
                  {players.map((p, i) =>
                    i === drawer ? null : (
                      <button
                        key={i}
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => success(i)}
                      >
                        {p.name} got it!
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setGuessed({ by: null });
                      setPhase('guessed');
                    }}
                  >
                    Give up
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="cz-status">
                  {guessed?.by !== null && guessed?.by !== undefined
                    ? `${players[guessed.by].name} guessed “${word}”!`
                    : `Nobody got it — the word was “${word}”.`}
                </div>
                <button type="button" className="btn btn-primary" onClick={nextTurn}>
                  {turn >= lastTurn ? 'See the scores' : 'Next turn'}
                </button>
              </>
            )}
          </>
        )}
        {phase === 'end' && (
          <div className="cz-status">Thanks for playing! Press Play again for a rematch.</div>
        )}
      </div>
      <div className="cz-history" aria-label="Scores">
        {players.map((p, i) => (
          <span key={i} className={`cz-pill${i === drawer && phase !== 'end' ? ' win' : ''}`}>
            {p.name}: {p.score}
          </span>
        ))}
      </div>
    </div>
  );
}
