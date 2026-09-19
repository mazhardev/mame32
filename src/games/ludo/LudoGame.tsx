import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { Die } from '../_shared/board/Dice';
import { HOME, SAFE, START, chooseToken, hasWon, initial, movable, move, passTurn } from './engine';
import type { Color, LudoState } from './engine';

const HEX: Record<Color, string> = { 0: '#ef4444', 1: '#22c55e', 2: '#eab308', 3: '#3b82f6' };
const NAME: Record<Color, string> = { 0: 'Red', 1: 'Green', 2: 'Yellow', 3: 'Blue' };
const SEATS: Record<number, Color[]> = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };

// Main track as [row, col], clockwise from red's start square.
const TRACK: [number, number][] = [
  ...[1, 2, 3, 4, 5].map((c) => [6, c] as [number, number]),
  ...[5, 4, 3, 2, 1, 0].map((r) => [r, 6] as [number, number]),
  [0, 7],
  [0, 8],
  ...[1, 2, 3, 4, 5].map((r) => [r, 8] as [number, number]),
  ...[9, 10, 11, 12, 13, 14].map((c) => [6, c] as [number, number]),
  [7, 14],
  [8, 14],
  ...[13, 12, 11, 10, 9].map((c) => [8, c] as [number, number]),
  ...[9, 10, 11, 12, 13, 14].map((r) => [r, 8] as [number, number]),
  [14, 7],
  [14, 6],
  ...[13, 12, 11, 10, 9].map((r) => [r, 6] as [number, number]),
  ...[5, 4, 3, 2, 1, 0].map((c) => [8, c] as [number, number]),
  [7, 0],
  [6, 0],
];
const HOME_COL: Record<Color, [number, number][]> = {
  0: [1, 2, 3, 4, 5].map((c) => [7, c]),
  1: [1, 2, 3, 4, 5].map((r) => [r, 7]),
  2: [13, 12, 11, 10, 9].map((c) => [7, c]),
  3: [13, 12, 11, 10, 9].map((r) => [r, 7]),
};
const YARD: Record<Color, [number, number]> = { 0: [0, 0], 1: [0, 9], 2: [9, 9], 3: [9, 0] };
const FINISH: Record<Color, [number, number]> = { 0: [6.75, 7.5], 1: [7.5, 6.75], 2: [8.25, 7.5], 3: [7.5, 8.25] };

function tokenPos(c: Color, i: number, p: number): [number, number] {
  if (p === -1) {
    const [r0, c0] = YARD[c];
    return [c0 + 2 + (i % 2) * 2, r0 + 2 + Math.floor(i / 2) * 2];
  }
  if (p === HOME) {
    const [x, y] = FINISH[c];
    return [x + ((i % 2) - 0.5) * 0.45, y + (Math.floor(i / 2) - 0.5) * 0.45];
  }
  const [r, col] = p <= 50 ? TRACK[(START[c] + p) % 52] : HOME_COL[c][p - 51];
  return [col + 0.5, r + 0.5];
}

type Phase = 'roll' | 'move' | 'wait' | 'over';

export default function LudoGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const [count, setCount] = useState(2);
  const [s, setS] = useState<LudoState>(() => initial(SEATS[2]));
  const [phase, setPhase] = useState<Phase>('roll');
  const [roll, setRoll] = useState(6);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const timers = useRef<number[]>([]);
  const captures = useRef(0);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const restart = useCallback(() => {
    clearTimers();
    setS(initial(SEATS[count]));
    setPhase('roll');
    setRoll(6);
    setMessage(null);
    setStarted(false);
    captures.current = 0;
  }, [count]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);

  const current = s.players[s.turn];
  const isHuman = (c: Color) => mode === 'local' || c === 0;
  const who = (c: Color) => (mode === 'ai' ? (c === 0 ? 'You' : `${NAME[c]} (computer)`) : NAME[c]);

  const finish = (winner: Color) => {
    setPhase('over');
    const youWon = mode === 'ai' && winner === 0;
    const text = mode === 'ai' ? (youWon ? 'All four tokens home — you win!' : `${NAME[winner]} got all four tokens home first.`) : `${NAME[winner]} wins!`;
    setMessage(text);
    shell.play(mode === 'ai' && !youWon ? 'gameOver' : 'levelComplete');
    if (youWon) {
      void reportProgress('ludo.win', 1);
      if (count === 4) void reportProgress('ludo.four', 1);
      if (shell.difficulty === 'hard') void reportProgress('ludo.hard', 1);
    }
    shell.endRound({
      score: youWon ? 500 * (count - 1) + captures.current * 50 : 0,
      won: mode === 'ai' ? youWon : undefined,
      lost: mode === 'ai' ? !youWon : undefined,
      title: text,
      details: mode === 'ai' ? [{ label: 'Your captures', value: String(captures.current) }] : [],
    });
  };

  const doMove = (token: number, value: number, st: LudoState) => {
    const c = st.players[st.turn];
    const r = move(st, token, value);
    setS(r.state);
    if (r.captured.length) {
      shell.play('hit');
      if (mode === 'ai' && c === 0) {
        captures.current += r.captured.length;
        void reportProgress('ludo.capture', captures.current);
      }
      setMessage(`${who(c)} captured ${r.captured.map((x) => NAME[x.color]).join(' and ')}! ${r.extraTurn ? 'Roll again.' : ''}`);
    } else if (r.finished) {
      shell.play('success');
      setMessage(`${who(c)} brought a token home! Roll again.`);
    } else {
      shell.play('click');
      setMessage(r.extraTurn ? `${who(c)} rolled a six — roll again.` : null);
    }
    if (hasWon(r.state, c)) return finish(c);
    setPhase('roll');
  };

  const doRoll = () => {
    if (phase !== 'roll') return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const value = 1 + Math.floor(Math.random() * 6);
    const st = s;
    const c = st.players[st.turn];
    setRoll(value);
    setRolling(true);
    setPhase('wait');
    shell.play('pop');
    later(() => {
      setRolling(false);
      if (value === 6 && st.sixes === 2) {
        setMessage(`${who(c)} rolled a third six — turn lost.`);
        setS(passTurn(st));
        later(() => setPhase('roll'), 700);
        return;
      }
      const options = movable(st, c, value);
      if (!options.length) {
        setMessage(`${who(c)} rolled ${value} — no move.`);
        setS(passTurn(st));
        later(() => setPhase('roll'), 800);
        return;
      }
      if (options.length === 1 || new Set(options.map((t) => st.tokens[c][t])).size === 1) {
        // Only one real choice: move it automatically.
        later(() => doMove(options[0], value, st), isHuman(c) ? 350 : 300);
        return;
      }
      setPhase('move');
    }, 450);
  };

  useComputerTurn(!isHuman(current) && phase === 'roll' && !shell.paused, () => true, doRoll, `${s.turn}-${phase}-${JSON.stringify(s.tokens)}`, 650);
  useComputerTurn(
    !isHuman(current) && phase === 'move' && !shell.paused,
    () => chooseToken(s, roll, shell.difficulty),
    (t: number) => doMove(t, roll, s),
    `${s.turn}-${phase}-${roll}`,
    450,
  );

  const options = phase === 'move' && isHuman(current) ? movable(s, current, roll) : [];
  const onToken = (c: Color, i: number) => {
    if (shell.paused || c !== current || !options.includes(i)) return;
    setPhase('wait');
    doMove(i, roll, s);
  };
  const onKey = (e: KeyboardEvent, c: Color, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToken(c, i);
    }
  };

  const status =
    phase === 'over'
      ? message
      : (message ? `${message} ` : '') +
        (isHuman(current)
          ? phase === 'move'
            ? `${who(current)}: pick a highlighted token to move ${roll}.`
            : phase === 'roll'
              ? `${who(current)}: roll the die.`
              : ''
          : phase === 'roll' || phase === 'move'
            ? `${NAME[current]} is playing…`
            : '');

  // Stack tokens that share a square.
  const placed = s.players.flatMap((c) => s.tokens[c].map((p, i) => ({ c, i, p, pos: tokenPos(c, i, p) })));
  const key = (pos: [number, number]) => `${pos[0].toFixed(2)},${pos[1].toFixed(2)}`;
  const groups = new Map<string, number>();

  return (
    <BoardLayout>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <ModePicker mode={mode} onChange={setMode} disabled={started && phase !== 'over'} localLabel="Pass & play" />
        <div className="seg" role="radiogroup" aria-label="Players">
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={count === n} className={count === n ? 'on' : ''} disabled={started && phase !== 'over'} onClick={() => setCount(n)}>
              {n} players
            </button>
          ))}
        </div>
      </div>
      <StatusBar>{status}</StatusBar>
      <svg viewBox="0 0 15 15" style={{ width: '100%', maxWidth: 560, touchAction: 'manipulation', userSelect: 'none', borderRadius: 10, boxShadow: 'var(--shadow-md)' }} role="group" aria-label="Ludo board">
        <rect width={15} height={15} fill="#f8fafc" />
        {([0, 1, 2, 3] as Color[]).map((c) => {
          const [r0, c0] = YARD[c];
          return (
            <g key={c}>
              <rect x={c0} y={r0} width={6} height={6} fill={HEX[c]} />
              <rect x={c0 + 0.8} y={r0 + 0.8} width={4.4} height={4.4} rx={0.5} fill="#fff" />
              {[0, 1, 2, 3].map((i) => (
                <circle key={i} cx={c0 + 2 + (i % 2) * 2} cy={r0 + 2 + Math.floor(i / 2) * 2} r={0.6} fill={HEX[c]} opacity={0.25} />
              ))}
              {HOME_COL[c].map(([r, col], k) => (
                <rect key={k} x={col} y={r} width={1} height={1} fill={HEX[c]} stroke="#94a3b8" strokeWidth={0.03} />
              ))}
            </g>
          );
        })}
        {TRACK.map(([r, c], idx) => {
          const startOf = ([0, 1, 2, 3] as Color[]).find((k) => START[k] === idx);
          return (
            <g key={idx}>
              <rect x={c} y={r} width={1} height={1} fill={startOf !== undefined ? HEX[startOf] : '#fff'} stroke="#94a3b8" strokeWidth={0.03} />
              {SAFE.has(idx) && startOf === undefined && (
                <text x={c + 0.5} y={r + 0.72} textAnchor="middle" fontSize={0.62} fill="#94a3b8">
                  ★
                </text>
              )}
            </g>
          );
        })}
        <polygon points="6,6 9,6 7.5,7.5" fill={HEX[1]} />
        <polygon points="9,6 9,9 7.5,7.5" fill={HEX[2]} />
        <polygon points="9,9 6,9 7.5,7.5" fill={HEX[3]} />
        <polygon points="6,9 6,6 7.5,7.5" fill={HEX[0]} />
        {placed.map(({ c, i, p, pos }) => {
          const k = key(pos);
          const n = groups.get(k) ?? 0;
          groups.set(k, n + 1);
          const shift = p === -1 || p === HOME ? 0 : n * 0.16;
          const active = c === current && options.includes(i);
          return (
            <g
              key={`${c}-${i}`}
              role="button"
              tabIndex={active ? 0 : -1}
              aria-label={`${NAME[c]} token ${i + 1}${p === -1 ? ' in the yard' : p === HOME ? ' home' : ''}${active ? ', can move' : ''}`}
              onClick={() => onToken(c, i)}
              onKeyDown={(e) => onKey(e, c, i)}
              style={{ cursor: active ? 'pointer' : 'default', outline: 'none', transition: 'transform 0.3s ease' }}
              transform={`translate(${(pos[0] + shift).toFixed(3)} ${(pos[1] - shift).toFixed(3)})`}
            >
              {active && <circle r={0.48} fill="none" stroke="#111827" strokeWidth={0.07} strokeDasharray="0.15 0.1" />}
              <circle r={p === HOME ? 0.2 : 0.36} fill={HEX[c]} stroke="#1f2937" strokeWidth={0.06} />
              <circle r={p === HOME ? 0.08 : 0.14} fill="rgba(255,255,255,0.7)" />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Die value={roll} rolling={rolling} color={HEX[current]} />
        <button type="button" className="btn btn-primary" onClick={doRoll} disabled={phase !== 'roll' || !isHuman(current) || shell.paused}>
          🎲 Roll
        </button>
      </div>
    </BoardLayout>
  );
}
