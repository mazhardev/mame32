import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { applyCall, flip, newState } from './engine';
import type { Side } from './engine';
import '../_shared/casual/casual.css';

export default function CoinTossGame() {
  const shell = useGameShell();
  const [state, setState] = useState(() => newState(shell.difficulty));
  const [flipping, setFlipping] = useState(false);
  const [face, setFace] = useState<Side | null>(null);
  const [message, setMessage] = useState('Heads or tails?');
  const timer = useRef<number>();
  const done = state.lives <= 0;

  const restart = useCallback(() => {
    window.clearTimeout(timer.current);
    setState(newState(shell.difficulty));
    setFlipping(false);
    setFace(null);
    setMessage('Heads or tails?');
  }, [shell.difficulty]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const call = useCallback(
    (side: Side) => {
      if (flipping || done || shell.paused) return;
      if (state.history.length === 0) shell.startRound();
      const result = flip(Math.random);
      setFlipping(true);
      setFace(null);
      setMessage('Flipping…');
      shell.play('whoosh');
      timer.current = window.setTimeout(() => {
        const next = applyCall(state, side, result);
        setState(next);
        setFace(result);
        setFlipping(false);
        const right = side === result;
        setMessage(right ? `${result === 'heads' ? 'Heads' : 'Tails'} — correct!` : `${result === 'heads' ? 'Heads' : 'Tails'} — wrong call`);
        shell.play(right ? 'coin' : 'failure');
        if (next.lives <= 0) {
          void reportProgress('coin-toss.streak-3', next.bestStreak);
          void reportProgress('coin-toss.streak-6', next.bestStreak);
          void reportProgress('coin-toss.correct-15', next.correct);
          void incrementProgress('coin-toss.total', next.correct);
          shell.endRound({
            score: next.correct * 10 + next.bestStreak * 5,
            title: 'Out of lives',
            details: [
              { label: 'Correct calls', value: String(next.correct) },
              { label: 'Best streak', value: String(next.bestStreak) },
              { label: 'Tosses', value: String(next.history.length) },
            ],
          });
        }
      }, 900);
    },
    [done, flipping, shell, state],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'h' || k === 'arrowleft') call('heads');
      else if (k === 't' || k === 'arrowright') call('tails');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [call]);

  const heads = state.history.filter((h) => h.result === 'heads').length;

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Correct', value: state.correct },
          { label: 'Streak', value: state.streak },
          { label: 'Lives', value: '❤'.repeat(Math.max(0, state.lives)) || '–' },
        ]}
      />
      <div className="cz-panel" aria-live="polite">
        <div className={`cz-big${flipping ? ' cz-flip' : ''}`} style={{ display: 'inline-block' }} aria-label={face ?? 'coin'}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '1.6em',
              height: '1.6em',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #fde68a, #d97706)',
              color: '#78350f',
              fontSize: '0.7em',
              fontWeight: 800,
              boxShadow: 'inset 0 0 0 6px rgba(120,53,15,0.25)',
            }}
          >
            {flipping ? '' : face === 'heads' ? 'H' : face === 'tails' ? 'T' : '?'}
          </span>
        </div>
        <div className="cz-status">{message}</div>
      </div>
      <div className="cz-choices" style={{ ['--cz-cols' as string]: 2 }}>
        {(['heads', 'tails'] as const).map((side) => (
          <button key={side} type="button" className="cz-choice" disabled={flipping || done || shell.paused} onClick={() => call(side)}>
            <span className="cz-emoji" aria-hidden="true">
              {side === 'heads' ? '👑' : '🦅'}
            </span>
            <span style={{ textTransform: 'capitalize' }}>{side}</span>
            <kbd>{side === 'heads' ? 'H or ←' : 'T or →'}</kbd>
          </button>
        ))}
      </div>
      {state.history.length > 0 && (
        <p className="small muted" style={{ textAlign: 'center' }}>
          This session: {heads} heads, {state.history.length - heads} tails. Every toss is a fresh 50/50.
        </p>
      )}
    </div>
  );
}
