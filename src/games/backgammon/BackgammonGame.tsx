import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import { Die } from '../_shared/board/Dice';
import { applyStep, barPos, chooseSequence, endTurn, initial, pipCount, result, sequences } from './engine';
import type { BGState, Step } from './engine';

const LIGHT = '#f5f0e6';
const DARK = '#1f2937';
const R = 0.44;
type Phase = 'roll' | 'move' | 'ai' | 'over';

const colX = (k: number) => (k < 6 ? 0.3 + k : 7.3 + (k - 6)) + 0.5;
/** Screen column and row for a point index. */
function place(i: number): { x: number; top: boolean } {
  if (i >= 12) return { x: colX(i - 12), top: true };
  return { x: colX(11 - i), top: false };
}
const OFF_X = 14.1;

function Hit({ label, onActivate, active, children }: { label: string; onActivate: () => void; active: boolean; children: ReactNode }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };
  return (
    <g role="button" tabIndex={active ? 0 : -1} aria-label={label} onClick={onActivate} onKeyDown={onKey} style={{ cursor: active ? 'pointer' : 'default', outline: 'none' }}>
      {children}
    </g>
  );
}

const roll2 = (): [number, number] => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
const same = (a: Step, b: Step) => a.from === b.from && a.to === b.to && a.die === b.die;

export default function BackgammonGame() {
  const shell = useGameShell();
  const [s, setS] = useState<BGState>(initial);
  const [turnStart, setTurnStart] = useState<BGState>(initial);
  const [phase, setPhase] = useState<Phase>('roll');
  const [dice, setDice] = useState<[number, number]>([3, 5]);
  const [rolling, setRolling] = useState(false);
  const [seqs, setSeqs] = useState<Step[][]>([]);
  const [played, setPlayed] = useState<Step[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);
  const hits = useRef(0);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const restart = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const s0 = initial();
    setS(s0);
    setTurnStart(s0);
    setPhase('roll');
    setPlayed([]);
    setSeqs([]);
    setSel(null);
    setMessage(null);
    started.current = false;
    hits.current = 0;
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = (st: BGState) => {
    const r = result(st);
    if (!r) return false;
    setPhase('over');
    const won = r.winner === 1;
    const kind = r.value === 3 ? 'a backgammon' : r.value === 2 ? 'a gammon' : 'the game';
    const text = won ? `You win ${kind}!` : `The computer wins ${kind}.`;
    setMessage(text);
    shell.play(won ? 'levelComplete' : 'gameOver');
    if (won) {
      void reportProgress('backgammon.win', 1);
      if (shell.difficulty === 'hard') void reportProgress('backgammon.hard', 1);
      if (r.value >= 2) void reportProgress('backgammon.gammon', 1);
    }
    shell.endRound({
      score: won ? r.value * (shell.difficulty === 'hard' ? 800 : shell.difficulty === 'normal' ? 500 : 300) : 0,
      won,
      lost: !won,
      title: text,
      details: [
        { label: 'Your checkers off', value: String(st.off[1]) },
        { label: 'Computer checkers off', value: String(st.off[2]) },
        { label: 'Points', value: String(r.value) },
      ],
    });
    return true;
  };

  const passToComputer = (st: BGState) => {
    const next = endTurn(st);
    setS(next);
    setTurnStart(next);
    setPlayed([]);
    setSeqs([]);
    setSel(null);
    setPhase('ai');
  };

  const onRoll = () => {
    if (phase !== 'roll' || shell.paused) return;
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    const d = roll2();
    setDice(d);
    setRolling(true);
    shell.play('pop');
    later(() => {
      setRolling(false);
      const q = sequences(s, d);
      if (!q[0].length) {
        setMessage(`You rolled ${d[0]}–${d[1]} but have no legal move.`);
        later(() => passToComputer(s), 1100);
        setPhase('ai');
        return;
      }
      setSeqs(q);
      setPlayed([]);
      setTurnStart(s);
      setMessage(null);
      setPhase('move');
    }, 450);
  };

  // Moves still available after the steps already played this turn.
  const matching = seqs.filter((q) => played.every((p, k) => q[k] && same(q[k], p)));
  const options: Step[] = [];
  for (const q of matching) {
    const n = q[played.length];
    if (n && !options.some((o) => same(o, n))) options.push(n);
  }
  const sources = new Set(options.map((o) => o.from));
  const dests = sel === null ? [] : options.filter((o) => o.from === sel);

  const playStep = (st: Step) => {
    const next = applyStep(s, st);
    const nowPlayed = [...played, st];
    setS(next);
    setPlayed(nowPlayed);
    setSel(null);
    shell.play(st.hit ? 'hit' : 'click');
    if (st.hit) void reportProgress('backgammon.hits', ++hits.current);
    if (finish(next)) return;
    const more = seqs.some((q) => q.length > nowPlayed.length && nowPlayed.every((p, k) => same(q[k], p)));
    if (!more) later(() => passToComputer(next), 450);
  };

  const onSource = (from: number) => {
    if (phase !== 'move' || shell.paused) return;
    if (sel !== null) {
      const d = dests.find((o) => o.to === from || (from === -99 && (o.to < 0 || o.to > 23)));
      if (d) return playStep(d);
    }
    if (sources.has(from)) {
      setSel(sel === from ? null : from);
    } else setSel(null);
  };

  const undo = () => {
    if (phase !== 'move' || !played.length) return;
    setS(turnStart);
    setPlayed([]);
    setSel(null);
  };

  // Computer turn: roll, choose a whole sequence, then play it step by step.
  useComputerTurn(
    phase === 'ai' && s.turn === 2 && !shell.paused,
    () => true,
    () => {
      const d = roll2();
      setDice(d);
      setRolling(true);
      shell.play('pop');
      later(() => {
        setRolling(false);
        const seq = chooseSequence(s, d, shell.difficulty);
        if (!seq.length) {
          setMessage(`Computer rolled ${d[0]}–${d[1]} and cannot move. Your turn: roll.`);
          later(() => {
            const back = endTurn(s);
            setS(back);
            setTurnStart(back);
            setPhase('roll');
          }, 900);
          return;
        }
        setMessage(`Computer rolled ${d[0]}–${d[1]}.`);
        let cur = s;
        seq.forEach((st, k) => {
          later(() => {
            cur = applyStep(cur, st);
            setS(cur);
            shell.play(st.hit ? 'hit' : 'click');
            if (k === seq.length - 1) {
              if (finish(cur)) return;
              const back = endTurn(cur);
              later(() => {
                setS(back);
                setTurnStart(back);
                setPhase('roll');
                setMessage(seq.some((x) => x.hit) ? 'The computer hit your checker — it is on the bar. Your turn: roll.' : `Computer played ${d[0]}–${d[1]}. Your turn: roll.`);
              }, 350);
            }
          }, 450 * (k + 1));
        });
      }, 450);
    },
    `${phase}-${s.turn}`,
    600,
  );

  const checkers = (i: number) => {
    const n = s.points[i];
    const { x, top } = place(i);
    const count = Math.abs(n);
    const fill = n > 0 ? LIGHT : DARK;
    return Array.from({ length: Math.min(count, 5) }, (_, k) => {
      const y = top ? 0.3 + R + k * 2 * R : 11.7 - R - k * 2 * R;
      return (
        <g key={k}>
          <circle cx={x} cy={y} r={R} fill={fill} stroke={n > 0 ? '#78716c' : '#000'} strokeWidth={0.05} />
          {k === 4 && count > 5 && (
            <text x={x} y={y + 0.16} textAnchor="middle" fontSize={0.45} fontWeight={700} fill={n > 0 ? DARK : LIGHT}>
              {count}
            </text>
          )}
        </g>
      );
    });
  };

  const status =
    message && phase !== 'move'
      ? message
      : phase === 'roll'
        ? 'Your turn — roll the dice.'
        : phase === 'move'
          ? sel === null
            ? `Move ${dice[0] === dice[1] ? `four ${dice[0]}s` : `${dice[0]} and ${dice[1]}`}: pick a checker.`
            : 'Now pick a highlighted point.'
          : phase === 'ai'
            ? 'Computer is playing…'
            : (message ?? '');

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Your pips', value: pipCount(s, 1) },
          { label: 'Computer pips', value: pipCount(s, 2) },
          { label: 'Borne off', value: `${s.off[1]}–${s.off[2]}` },
        ]}
      />
      <StatusBar>{status}</StatusBar>
      <svg viewBox="0 0 15 12" style={{ width: '100%', maxWidth: 700, touchAction: 'manipulation', userSelect: 'none', borderRadius: 10, boxShadow: 'var(--shadow-md)' }} role="group" aria-label="Backgammon board">
        <rect width={15} height={12} fill="#7c4a2d" />
        <rect x={0.3} y={0.3} width={6} height={11.4} fill="#d9b88f" />
        <rect x={7.3} y={0.3} width={6} height={11.4} fill="#d9b88f" />
        <rect x={13.6} y={0.3} width={1.1} height={11.4} fill="#5b3620" rx={0.1} />
        {Array.from({ length: 24 }, (_, i) => {
          const { x, top } = place(i);
          const isSrc = phase === 'move' && sources.has(i);
          const isDest = dests.some((o) => o.to === i);
          const color = (i + (top ? 0 : 1)) % 2 ? '#a0522d' : '#f3e2c7';
          const tip = top ? 5.1 : 6.9;
          const base = top ? 0.3 : 11.7;
          return (
            <Hit key={i} label={`Point ${i + 1}${s.points[i] ? `, ${Math.abs(s.points[i])} ${s.points[i] > 0 ? 'white' : 'dark'}` : ''}${isDest ? ', move here' : isSrc ? ', can move' : ''}`} onActivate={() => onSource(i)} active={isSrc || isDest}>
              <rect x={x - 0.5} y={top ? 0.3 : 6.1} width={1} height={5.6} fill="transparent" />
              <polygon points={`${x - 0.48},${base} ${x + 0.48},${base} ${x},${tip}`} fill={color} stroke={isDest ? '#facc15' : sel === i ? '#22c55e' : 'none'} strokeWidth={0.12} />
              {checkers(i)}
              {isSrc && sel === null && <circle cx={x} cy={top ? 5.6 : 6.4} r={0.12} fill="#22c55e" />}
              <text x={x} y={top ? 0.22 : 11.95} textAnchor="middle" fontSize={0.22} fill="#f3e2c7">
                {i + 1}
              </text>
            </Hit>
          );
        })}
        {/* Bar */}
        <Hit label={`Bar: ${s.bar[1]} white, ${s.bar[2]} dark`} onActivate={() => onSource(barPos(1))} active={phase === 'move' && sources.has(barPos(1))}>
          {Array.from({ length: s.bar[2] }, (_, k) => (
            <circle key={`b2${k}`} cx={6.8} cy={4.9 - k * 0.9} r={R} fill={DARK} stroke="#000" strokeWidth={0.05} />
          ))}
          {Array.from({ length: s.bar[1] }, (_, k) => (
            <circle key={`b1${k}`} cx={6.8} cy={7.1 + k * 0.9} r={R} fill={LIGHT} stroke={sel === barPos(1) ? '#22c55e' : '#78716c'} strokeWidth={sel === barPos(1) ? 0.12 : 0.05} />
          ))}
        </Hit>
        {/* Bear-off tray */}
        <Hit label={`Borne off: you ${s.off[1]}, computer ${s.off[2]}${dests.some((o) => o.to < 0) ? ', bear off here' : ''}`} onActivate={() => onSource(-99)} active={dests.some((o) => o.to < 0)}>
          <rect x={13.6} y={6.1} width={1.1} height={5.6} fill={dests.some((o) => o.to < 0) ? 'rgba(250,204,21,0.35)' : 'transparent'} />
          {Array.from({ length: s.off[1] }, (_, k) => (
            <rect key={`o1${k}`} x={OFF_X - 0.4} y={11.5 - k * 0.34} width={0.8} height={0.28} fill={LIGHT} rx={0.05} />
          ))}
          {Array.from({ length: s.off[2] }, (_, k) => (
            <rect key={`o2${k}`} x={OFF_X - 0.4} y={0.5 + k * 0.34} width={0.8} height={0.28} fill="#111" stroke="#444" strokeWidth={0.03} rx={0.05} />
          ))}
        </Hit>
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Die value={dice[0]} rolling={rolling} />
        <Die value={dice[1]} rolling={rolling} />
        <button type="button" className="btn btn-primary" onClick={onRoll} disabled={phase !== 'roll' || shell.paused}>
          🎲 Roll
        </button>
        <button type="button" className="btn" onClick={undo} disabled={phase !== 'move' || !played.length}>
          ↶ Undo
        </button>
      </div>
    </BoardLayout>
  );
}
