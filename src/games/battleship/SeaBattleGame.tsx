import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import { N, chooseShot, fire, randomFleet, remainingSizes } from './engine';
import type { Ship, Shots } from './engine';
import './sea.css';

type Phase = 'setup' | 'play' | 'over';

function Fleet({ ships, shots }: { ships: Ship[]; shots: Shots }) {
  return (
    <div className="sea-fleet">
      {ships.map((s) => (
        <span key={s.name} className={s.cells.every((c) => shots[c] === 'sunk') ? 'gone' : ''}>
          {s.name} ({s.cells.length})
        </span>
      ))}
    </div>
  );
}

export default function SeaBattleGame() {
  const shell = useGameShell();
  const [phase, setPhase] = useState<Phase>('setup');
  const [mine, setMine] = useState<Ship[]>(() => randomFleet());
  const [theirs, setTheirs] = useState<Ship[]>(() => randomFleet());
  const [myShots, setMyShots] = useState<Shots>({});
  const [theirShots, setTheirShots] = useState<Shots>({});
  const [turn, setTurn] = useState<'you' | 'ai'>('you');
  const [message, setMessage] = useState('Shuffle your fleet until you like it, then start the battle.');
  const [lastMine, setLastMine] = useState<number | null>(null);
  const [lastTheirs, setLastTheirs] = useState<number | null>(null);

  const restart = useCallback(() => {
    setPhase('setup');
    setMine(randomFleet());
    setTheirs(randomFleet());
    setMyShots({});
    setTheirShots({});
    setTurn('you');
    setLastMine(null);
    setLastTheirs(null);
    setMessage('Shuffle your fleet until you like it, then start the battle.');
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const start = () => {
    setPhase('play');
    shell.startRound();
    shell.play('click');
    setMessage('Your turn — fire at the enemy waters.');
  };

  const shotsFired = Object.keys(myShots).length;
  const hitsLanded = Object.values(myShots).filter((m) => m !== 'miss').length;

  const end = useCallback(
    (won: boolean, shotsTaken: Shots) => {
      setPhase('over');
      const fired = Object.keys(shotsTaken).length;
      const accuracy = Math.round((17 / Math.max(fired, 17)) * 100);
      const text = won ? `Victory! Enemy fleet sunk in ${fired} shots.` : 'Your fleet has been sunk.';
      setMessage(text);
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) {
        void reportProgress('battleship.win', 1);
        if (shell.difficulty === 'hard') void reportProgress('battleship.hard', 1);
        if (fired <= 50) void reportProgress('battleship.sharp', 1);
      }
      shell.endRound({
        score: won ? Math.max(100, 1500 - fired * 12) : Object.values(shotsTaken).filter((m) => m !== 'miss').length * 10,
        won,
        lost: !won,
        title: text,
        details: won
          ? [
              { label: 'Shots fired', value: String(fired) },
              { label: 'Accuracy', value: `${accuracy}%` },
            ]
          : [{ label: 'Enemy ship cells hit', value: String(Object.values(shotsTaken).filter((m) => m !== 'miss').length) }],
      });
    },
    [shell],
  );

  const onFire = (i: number) => {
    if (phase !== 'play' || turn !== 'you' || shell.paused || myShots[i]) return;
    const r = fire(theirs, myShots, i);
    setMyShots(r.shots);
    setLastTheirs(i);
    shell.play(r.mark === 'miss' ? 'blip' : r.mark === 'sunk' ? 'coin' : 'success');
    if (r.mark !== 'miss') shell.vibrate(r.mark === 'sunk' ? 60 : 25);
    if (r.allSunk) return end(true, r.shots);
    setMessage(r.sunk ? `You sank their ${r.sunk.name}!` : r.mark === 'hit' ? 'Hit!' : 'Miss.');
    setTurn('ai');
  };

  useComputerTurn(
    phase === 'play' && turn === 'ai' && !shell.paused,
    () => chooseShot(theirShots, remainingSizes(mine, theirShots), shell.difficulty),
    (i: number) => {
      const r = fire(mine, theirShots, i);
      setTheirShots(r.shots);
      setLastMine(i);
      if (r.allSunk) return end(false, myShots);
      setMessage(`${r.sunk ? `They sank your ${r.sunk.name}!` : r.mark === 'hit' ? 'They hit one of your ships.' : 'They missed.'} Your turn.`);
      setTurn('you');
    },
    theirShots,
    650,
  );

  const cellClass = (mark: Shots[number] | undefined, ship: boolean) => `sea-cell ${mark ?? ''} ${ship && !mark ? 'ship' : ''}`;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Shots', value: shotsFired },
          { label: 'Hits', value: hitsLanded },
          { label: 'Enemy ships left', value: remainingSizes(theirs, myShots).length },
        ]}
      />
      <StatusBar>{phase === 'play' && turn === 'ai' ? 'Enemy is aiming…' : message}</StatusBar>
      {phase === 'setup' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={() => setMine(randomFleet())}>
            🔀 Shuffle fleet
          </button>
          <button type="button" className="btn btn-primary" onClick={start}>
            ⚓ Start battle
          </button>
        </div>
      )}
      <div className="sea-boards">
        {phase !== 'setup' && (
          <div className="sea-board">
            <h3>Enemy waters</h3>
            <div className="sea-grid" role="grid" aria-label="Enemy waters — choose a cell to fire at">
              {Array.from({ length: N * N }, (_, i) => {
                const mark = myShots[i];
                const reveal = phase === 'over' && theirs.some((s) => s.cells.includes(i));
                return (
                  <button
                    key={i}
                    type="button"
                    className={`${cellClass(mark, reveal)} target ${lastTheirs === i ? 'last' : ''}`}
                    disabled={phase !== 'play' || turn !== 'you' || Boolean(mark)}
                    onClick={() => onFire(i)}
                    aria-label={`${String.fromCharCode(65 + (i % N))}${Math.floor(i / N) + 1}${mark ? `, ${mark}` : ''}`}
                  >
                    {mark === 'hit' || mark === 'sunk' ? '✕' : ''}
                  </button>
                );
              })}
            </div>
            <Fleet ships={theirs} shots={myShots} />
          </div>
        )}
        <div className="sea-board">
          <h3>Your fleet</h3>
          <div className="sea-grid" role="grid" aria-label="Your waters">
            {Array.from({ length: N * N }, (_, i) => {
              const mark = theirShots[i];
              const ship = mine.some((s) => s.cells.includes(i));
              return (
                <div
                  key={i}
                  className={`${cellClass(mark, ship)} ${lastMine === i ? 'last' : ''}`}
                  role="gridcell"
                  aria-label={`${String.fromCharCode(65 + (i % N))}${Math.floor(i / N) + 1}${ship ? ', your ship' : ''}${mark ? `, ${mark}` : ''}`}
                >
                  {mark === 'hit' || mark === 'sunk' ? '✕' : ''}
                </div>
              );
            })}
          </div>
          <Fleet ships={mine} shots={theirShots} />
        </div>
      </div>
    </BoardLayout>
  );
}
