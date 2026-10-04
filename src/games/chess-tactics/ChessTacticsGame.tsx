import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { ChessBoard } from '../_shared/chess/ChessBoard';
import { Chess, parseSquare, toUci } from '../_shared/chess/engine';
import { TACTICS } from '../_shared/chess/puzzles';
import type { TacticPuzzle } from '../_shared/chess/puzzles';

const ROUND = 10;
const SECONDS = { easy: 60, normal: 40, hard: 25 } as const;
type Phase = 'ready' | 'solve' | 'feedback' | 'done';

function pickRound(): TacticPuzzle[] {
  const pool = [...TACTICS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(ROUND, pool.length));
}

export default function ChessTacticsGame() {
  const shell = useGameShell();
  const limit = SECONDS[shell.difficulty];
  const chess = useRef(new Chess()).current;
  const [round, setRound] = useState<TacticPuzzle[]>(pickRound);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [left, setLeft] = useState<number>(limit);
  const [version, setVersion] = useState(0);
  const [marks, setMarks] = useState<number[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const tally = useRef({ correct: 0, bonus: 0, streak: 0, best: 0 });

  const show = useCallback(
    (p: TacticPuzzle) => {
      chess.load(p.fen);
      setMarks([]);
      setLast(null);
      setVersion((v) => v + 1);
    },
    [chess],
  );

  const restart = useCallback(() => {
    const r = pickRound();
    setRound(r);
    setIndex(0);
    setPhase('ready');
    setLeft(limit);
    setNote(null);
    tally.current = { correct: 0, bonus: 0, streak: 0, best: 0 };
    show(r[0]);
  }, [limit, show]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const finishRound = useCallback(() => {
    setPhase('done');
    const { correct, bonus, best } = tally.current;
    shell.play(correct >= 7 ? 'levelComplete' : 'gameOver');
    void reportProgress('chess-tactics.round', 1);
    void reportProgress('chess-tactics.score', correct);
    void reportProgress('chess-tactics.streak', best);
    if (correct === round.length && shell.difficulty === 'hard') void reportProgress('chess-tactics.perfect', 1);
    shell.endRound({
      score: correct * 100 + bonus,
      won: correct >= Math.ceil(round.length * 0.7),
      title: `${correct} of ${round.length} tactics found`,
      details: [
        { label: 'Time bonus', value: String(bonus) },
        { label: 'Best streak', value: String(best) },
      ],
    });
  }, [round.length, shell]);

  const advance = useCallback(() => {
    const next = index + 1;
    if (next >= round.length) return finishRound();
    setIndex(next);
    setLeft(limit);
    setNote(null);
    show(round[next]);
    setPhase('solve');
  }, [finishRound, index, limit, round, show]);

  const judge = useCallback(
    (uci: string | null) => {
      const p = round[index];
      const ok = uci !== null && p.accept.includes(uci);
      const t = tally.current;
      if (ok) {
        t.correct++;
        t.bonus += left * 2;
        t.streak++;
        t.best = Math.max(t.best, t.streak);
        shell.play('success');
        setNote(`Correct! That wins about ${Math.round(p.gain / 100)} pawn${Math.round(p.gain / 100) === 1 ? '' : 's'} of material.`);
      } else {
        t.streak = 0;
        shell.play('failure');
        const best = p.accept[0];
        setMarks([parseSquare(best.slice(0, 2)), parseSquare(best.slice(2, 4))]);
        setNote(uci === null ? 'Time’s up! The winning move is highlighted.' : 'Not the best move — the winning move is highlighted.');
      }
      setPhase('feedback');
    },
    [index, left, round, shell],
  );

  useEffect(() => {
    if (phase !== 'solve' || shell.paused) return;
    if (left <= 0) {
      judge(null);
      return;
    }
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [judge, left, phase, shell.paused]);

  const begin = () => {
    shell.startRound();
    setPhase('solve');
  };

  const onMove = (m: number) => {
    if (phase !== 'solve') return;
    const uci = toUci(m);
    chess.play(m);
    setLast(m);
    setVersion((v) => v + 1);
    judge(uci);
  };

  const p = round[index];
  const orientation = (p?.fen.split(' ')[1] === 'b' ? -1 : 1) as 1 | -1;
  const side = orientation === 1 ? 'White' : 'Black';
  const status =
    phase === 'ready'
      ? `${round.length} positions, ${limit} seconds each. Find the move that wins material.`
      : phase === 'done'
        ? `Round over: ${tally.current.correct} of ${round.length}.`
        : (note ?? `${side} to play and win material.`);

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Position', value: `${Math.min(index + 1, round.length)}/${round.length}` },
          { label: 'Correct', value: tally.current.correct },
          { label: 'Time', value: phase === 'solve' ? left : '—' },
        ]}
      />
      <StatusBar>{status}</StatusBar>
      <ChessBoard chess={chess} orientation={orientation} movable={phase === 'solve' && !shell.paused ? chess.turn : null} onMove={onMove} lastMove={last} marks={marks} version={version} />
      <div style={{ display: 'flex', gap: 8 }}>
        {phase === 'ready' && (
          <button type="button" className="btn btn-primary" onClick={begin} disabled={!p}>
            ▶ Start
          </button>
        )}
        {phase === 'feedback' && (
          <button type="button" className="btn btn-primary" onClick={advance}>
            {index + 1 >= round.length ? 'Finish' : 'Next position ▶'}
          </button>
        )}
      </div>
    </BoardLayout>
  );
}
