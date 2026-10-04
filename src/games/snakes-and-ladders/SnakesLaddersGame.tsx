import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, ModePicker, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { Die } from '../_shared/board/Dice';
import { cellOf, jumpsFor, step } from './engine';
import './snakes.css';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow'];
const TINTS = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#ddd6fe'];

interface Stats {
  ladders: number;
  snakes: number;
}

function centre(square: number) {
  const { row, col } = cellOf(square);
  return { x: col + 0.5, y: row + 0.5 };
}

function Ladder({ from, to }: { from: number; to: number }) {
  const a = centre(from);
  const b = centre(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 0.17;
  const ny = (dx / len) * 0.17;
  const rungs = Math.max(2, Math.round(len * 2.2));
  return (
    <g stroke="#8b5a2b" strokeWidth={0.07} strokeLinecap="round">
      <line x1={a.x + nx} y1={a.y + ny} x2={b.x + nx} y2={b.y + ny} />
      <line x1={a.x - nx} y1={a.y - ny} x2={b.x - nx} y2={b.y - ny} />
      {Array.from({ length: rungs }, (_, k) => {
        const t = (k + 0.5) / rungs;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        return <line key={k} x1={x + nx} y1={y + ny} x2={x - nx} y2={y - ny} strokeWidth={0.05} />;
      })}
    </g>
  );
}

function Snake({ from, to, hue }: { from: number; to: number; hue: number }) {
  const a = centre(from);
  const b = centre(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 0.7;
  const ny = (dx / len) * 0.7;
  const d = `M ${a.x} ${a.y} C ${a.x + dx * 0.33 + nx} ${a.y + dy * 0.33 + ny}, ${a.x + dx * 0.66 - nx} ${a.y + dy * 0.66 - ny}, ${b.x} ${b.y}`;
  const color = `hsl(${hue} 65% 42%)`;
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={0.22} strokeLinecap="round" opacity={0.9} />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.05} strokeDasharray="0.12 0.18" />
      <circle cx={a.x} cy={a.y} r={0.2} fill={color} />
      <circle cx={a.x - 0.07} cy={a.y - 0.05} r={0.04} fill="#fff" />
      <circle cx={a.x + 0.07} cy={a.y - 0.05} r={0.04} fill="#fff" />
    </g>
  );
}

export default function SnakesLaddersGame() {
  const shell = useGameShell();
  const level = shell.difficulty;
  const jumps = useMemo(() => jumpsFor(level), [level]);
  const [mode, setMode] = useState<PlayMode>('ai');
  const [players, setPlayers] = useState(2);
  const [pos, setPos] = useState<number[]>([0, 0]);
  const [current, setCurrent] = useState(0);
  const [die, setDie] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const stats = useRef<Stats>({ ladders: 0, snakes: 0 });
  const rolls = useRef(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => clearTimers, []);

  const restart = useCallback(() => {
    clearTimers();
    setPos(Array(players).fill(0));
    setCurrent(0);
    setDie(1);
    setRolling(false);
    setBusy(false);
    setWinner(null);
    setMessage(null);
    setStarted(false);
    stats.current = { ladders: 0, snakes: 0 };
    rolls.current = 0;
  }, [players]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode, level]);

  const isHuman = (p: number) => mode === 'local' || p === 0;
  const nameOf = (p: number) => (mode === 'ai' ? (p === 0 ? 'You' : `Computer ${COLOR_NAMES[p]}`) : COLOR_NAMES[p]);

  const finish = (p: number) => {
    setWinner(p);
    const youWon = mode === 'ai' && p === 0;
    const text = mode === 'ai' ? (youWon ? 'You reached 100 first!' : `${nameOf(p)} reached 100 first.`) : `${COLOR_NAMES[p]} wins!`;
    setMessage(text);
    shell.play(mode === 'ai' && !youWon ? 'gameOver' : 'levelComplete');
    if (youWon) {
      void reportProgress('snakes-and-ladders.win', 1);
      if (stats.current.snakes === 0) void reportProgress('snakes-and-ladders.charmed', 1);
      if (players === 4) void reportProgress('snakes-and-ladders.crowd', 1);
    }
    shell.endRound({
      score: youWon ? Math.max(100, 1000 - rolls.current * 15) : 0,
      won: mode === 'ai' ? youWon : undefined,
      lost: mode === 'ai' ? !youWon : undefined,
      title: text,
      details:
        mode === 'ai'
          ? [
              { label: 'Your rolls', value: String(rolls.current) },
              { label: 'Ladders climbed', value: String(stats.current.ladders) },
              { label: 'Snakes hit', value: String(stats.current.snakes) },
            ]
          : [],
    });
  };

  const roll = () => {
    if (busy || winner !== null) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const who = current;
    const value = 1 + Math.floor(Math.random() * 6);
    setBusy(true);
    setRolling(true);
    setDie(value);
    shell.play('pop');
    if (who === 0 && mode === 'ai') rolls.current++;
    later(() => {
      setRolling(false);
      const s = step(pos[who] || 0, value, level, jumps);
      const name = nameOf(who);
      setPos((p) => p.map((v, i) => (i === who ? s.landing : v)));
      if (s.kind === 'blocked') setMessage(`${name} rolled ${value} — needs exactly ${100 - pos[who]} to finish.`);
      else if (s.kind === 'bounce') setMessage(`${name} rolled ${value} and bounced back from 100.`);
      else setMessage(`${name} rolled ${value}.`);
      const settle = () => {
        if (s.final === 100) return finish(who);
        setCurrent((who + 1) % players);
        setBusy(false);
      };
      if (s.final !== s.landing) {
        later(() => {
          setPos((p) => p.map((v, i) => (i === who ? s.final : v)));
          const up = s.final > s.landing;
          if (who === 0) {
            if (up) stats.current.ladders++;
            else stats.current.snakes++;
          }
          if (mode === 'ai' && who === 0 && up && s.final - s.landing >= 25) void reportProgress('snakes-and-ladders.big-climb', 1);
          shell.play(up ? 'powerup' : 'whoosh');
          setMessage(`${name} ${up ? 'climbed a ladder' : 'slid down a snake'} to ${s.final}!`);
          later(settle, 450);
        }, 550);
      } else {
        later(settle, 350);
      }
    }, 450);
  };

  useComputerTurn(!isHuman(current) && !busy && winner === null && !shell.paused, () => true, roll, `${current}-${busy}`, 700);

  const layout = pos.map((p, i) => {
    const sameSquare = pos.map((q, k) => [q, k] as const).filter(([q]) => q === p);
    const slot = sameSquare.findIndex(([, k]) => k === i);
    const { row, col } = p === 0 ? { row: 10, col: -0.2 + i * 0.5 } : cellOf(p);
    const off = p !== 0 && sameSquare.length > 1 ? [(slot % 2) * 0.36 - 0.18, Math.floor(slot / 2) * 0.36 - 0.18] : [0, 0];
    return { x: col + 0.5 + off[0], y: row + 0.5 + off[1] };
  });

  return (
    <BoardLayout>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <ModePicker mode={mode} onChange={setMode} disabled={started && winner === null} localLabel="Pass & play" />
        <div className="seg" role="radiogroup" aria-label="Number of players">
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={players === n} className={players === n ? 'on' : ''} disabled={started && winner === null} onClick={() => setPlayers(n)}>
              {n} players
            </button>
          ))}
        </div>
      </div>
      <StatusBar>{message ?? (isHuman(current) ? `${nameOf(current)} — roll the die` : `${nameOf(current)} is rolling…`)}</StatusBar>
      <div className="snl-board-wrap">
        <div className="snl-board" role="img" aria-label={`Board. ${pos.map((p, i) => `${nameOf(i)} on ${p || 'start'}`).join(', ')}`}>
          {Array.from({ length: 100 }, (_, k) => {
            const row = Math.floor(k / 10);
            const col = k % 10;
            const fromBottom = 9 - row;
            const n = fromBottom * 10 + (fromBottom % 2 === 0 ? col + 1 : 10 - col);
            return (
              <div key={k} className="snl-cell" style={{ background: TINTS[(row + col) % TINTS.length] }}>
                {n}
              </div>
            );
          })}
        </div>
        <svg className="snl-overlay" viewBox="0 0 10 11" aria-hidden="true">
            {Object.entries(jumps).map(([f, t]) =>
              Number(t) > Number(f) ? <Ladder key={f} from={Number(f)} to={Number(t)} /> : null,
            )}
            {Object.entries(jumps).map(([f, t], k) =>
              Number(t) < Number(f) ? <Snake key={f} from={Number(f)} to={Number(t)} hue={(k * 47) % 360} /> : null,
            )}
            {layout.map((p, i) => (
              <circle
                key={i}
                className="snl-token"
                cx={p.x}
                cy={p.y}
                r={0.26}
                fill={COLORS[i]}
                stroke={current === i && winner === null ? '#fff' : '#111'}
                strokeWidth={current === i && winner === null ? 0.08 : 0.04}
              />
            ))}
        </svg>
      </div>
      <div className="snl-controls">
        <Die value={die} rolling={rolling} color={COLORS[current]} />
        <button type="button" className="btn btn-primary" onClick={roll} disabled={busy || winner !== null || !isHuman(current) || shell.paused}>
          🎲 Roll
        </button>
      </div>
      <div className="snl-legend">
        {pos.map((p, i) => (
          <span key={i}>
            <i style={{ background: COLORS[i] }} /> {nameOf(i)}: {p || 'start'}
          </span>
        ))}
      </div>
    </BoardLayout>
  );
}
