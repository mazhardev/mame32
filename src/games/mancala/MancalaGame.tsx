import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { maybeRandom, searchBest } from '../_shared/board/search';
import { STORE, initial, isOver, legal, mancalaGame, sow } from './engine';
import type { MancalaState } from './engine';
import './mancala.css';

const DEPTH = { easy: 2, normal: 6, hard: 11 } as const;
const RANDOM = { easy: 0.4, normal: 0.08, hard: 0 } as const;
const TOP = [12, 11, 10, 9, 8, 7];
const BOTTOM = [0, 1, 2, 3, 4, 5];
const nameFor = (mode: PlayMode, p: 1 | 2) => (mode === 'ai' ? (p === 1 ? 'You' : 'Computer') : `Player ${p}`);

export default function MancalaGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const [state, setState] = useState<MancalaState>(initial);
  const [sown, setSown] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const restart = useCallback(() => {
    setState(initial());
    setSown([]);
    setMessage(null);
    setStarted(false);
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const over = isOver(state);
  const moves = useMemo(() => legal(state), [state]);
  const aiTurn = mode === 'ai' && state.turn === 2 && !over;
  const name = (p: 1 | 2) => nameFor(mode, p);

  const apply = useCallback(
    (pit: number) => {
      if (!started) {
        setStarted(true);
        shell.startRound();
      }
      const r = sow(state, pit);
      const mover = state.turn;
      const who = nameFor(mode, mover);
      setState(r.state);
      setSown([pit, ...r.path]);
      shell.play(r.captured ? 'coin' : 'click');
      if (mode === 'ai' && mover === 1 && r.captured >= 8) void reportProgress('mancala.capture', 1);
      if (isOver(r.state)) {
        const a = r.state.pits[STORE[1]];
        const b = r.state.pits[STORE[2]];
        const winner = a === b ? 0 : a > b ? 1 : 2;
        const text =
          winner === 0
            ? `Draw, ${a}–${b}`
            : `${nameFor(mode, winner)} ${mode === 'ai' && winner === 1 ? 'win' : 'wins'} ${Math.max(a, b)}–${Math.min(a, b)}`;
        setMessage(text);
        const youWon = mode === 'ai' && winner === 1;
        shell.play(mode === 'ai' && !youWon ? 'gameOver' : 'levelComplete');
        if (youWon) {
          void reportProgress('mancala.win', 1);
          if (shell.difficulty === 'hard') void reportProgress('mancala.hard', 1);
        }
        shell.endRound({
          score: youWon ? a * 20 : 0,
          won: mode === 'ai' ? youWon : undefined,
          lost: mode === 'ai' ? winner === 2 : undefined,
          draw: winner === 0,
          title: text,
          details: [
            { label: nameFor(mode, 1), value: String(a) },
            { label: nameFor(mode, 2), value: String(b) },
          ],
        });
        return;
      }
      if (r.extraTurn) setMessage(`${who} landed in the store — ${who === 'You' ? 'go' : 'goes'} again!`);
      else if (r.captured) setMessage(`${who} captured ${r.captured} seeds!`);
      else setMessage(null);
    },
    [mode, shell, started, state],
  );

  useComputerTurn(
    aiTurn && !shell.paused,
    () => maybeRandom(moves, searchBest(mancalaGame, state, DEPTH[shell.difficulty], 700), RANDOM[shell.difficulty]),
    apply,
    state,
    700,
  );

  const canPlay = (i: number) => !over && !shell.paused && !aiTurn && moves.includes(i);

  const pit = (i: number) => (
    <button
      type="button"
      className={`mancala-pit ${canPlay(i) ? 'can' : ''} ${sown.includes(i) ? 'sown' : ''}`}
      disabled={!canPlay(i)}
      onClick={() => apply(i)}
      aria-label={`Pit with ${state.pits[i]} seeds${canPlay(i) ? ', play' : ''}`}
    >
      <span className="mancala-seeds" aria-hidden="true">
        {Array.from({ length: Math.min(state.pits[i], 12) }, (_, k) => (
          <i key={k} />
        ))}
      </span>
      <b>{state.pits[i]}</b>
    </button>
  );

  const idle = aiTurn
    ? 'Computer is thinking…'
    : mode === 'ai'
      ? 'Your turn — pick a pit on the bottom row'
      : `Player ${state.turn} — pick a pit on the ${state.turn === 1 ? 'bottom' : 'top'} row`;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: name(1), value: state.pits[6] },
          { label: name(2), value: state.pits[13] },
        ]}
      />
      <ModePicker mode={mode} onChange={setMode} disabled={started && !over} />
      <StatusBar>{message ?? idle}</StatusBar>
      <div className="mancala" role="group" aria-label="Mancala board">
        <div
          className={`mancala-store ${sown.includes(13) ? 'sown' : ''}`}
          style={{ gridColumn: 1, gridRow: '1 / span 2' }}
          aria-label={`${name(2)} store: ${state.pits[13]}`}
        >
          {state.pits[13]}
        </div>
        {TOP.map((i, k) => (
          <div key={i} style={{ gridRow: 1, gridColumn: k + 2 }}>
            {pit(i)}
          </div>
        ))}
        <div
          className={`mancala-store ${sown.includes(6) ? 'sown' : ''}`}
          style={{ gridColumn: 8, gridRow: '1 / span 2' }}
          aria-label={`${name(1)} store: ${state.pits[6]}`}
        >
          {state.pits[6]}
        </div>
        {BOTTOM.map((i, k) => (
          <div key={i} style={{ gridRow: 2, gridColumn: k + 2 }}>
            {pit(i)}
          </div>
        ))}
      </div>
    </BoardLayout>
  );
}
