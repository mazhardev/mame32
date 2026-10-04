'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress, incrementProgress } from '@/achievements/AchievementService';
import { MOVES, computerMove, judge } from './engine';
import type { Move, Outcome } from './engine';
import '../_shared/casual/casual.css';

const ICON: Record<Move, string> = { rock: '✊', paper: '✋', scissors: '✌️' };
const KEYS: Record<string, Move> = { r: 'rock', p: 'paper', s: 'scissors', '1': 'rock', '2': 'paper', '3': 'scissors' };
const TARGET = 5;

export default function RockPaperScissorsGame() {
  const shell = useGameShell();
  const [history, setHistory] = useState<{ player: Move; computer: Move; outcome: Outcome }[]>([]);
  const [shown, setShown] = useState<{ player: Move; computer: Move; outcome: Outcome } | null>(null);
  const [done, setDone] = useState(false);
  const streak = useRef(0);
  const best = useRef(0);

  const wins = history.filter((h) => h.outcome === 'win').length;
  const losses = history.filter((h) => h.outcome === 'loss').length;

  const restart = useCallback(() => {
    setHistory([]);
    setShown(null);
    setDone(false);
    streak.current = 0;
    best.current = 0;
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [shell.difficulty, restart]);

  const play = useCallback(
    (player: Move) => {
      if (done || shell.paused) return;
      if (history.length === 0) shell.startRound();
      const computer = computerMove(history.map((h) => h.player), shell.difficulty, Math.random);
      const outcome = judge(player, computer);
      const round = { player, computer, outcome };
      const next = [...history, round];
      setHistory(next);
      setShown(round);
      streak.current = outcome === 'win' ? streak.current + 1 : outcome === 'loss' ? 0 : streak.current;
      best.current = Math.max(best.current, streak.current);
      shell.play(outcome === 'win' ? 'success' : outcome === 'loss' ? 'failure' : 'click');
      const w = next.filter((h) => h.outcome === 'win').length;
      const l = next.filter((h) => h.outcome === 'loss').length;
      if (w >= TARGET || l >= TARGET) {
        setDone(true);
        const won = w >= TARGET;
        if (won) {
          void reportProgress('rock-paper-scissors.first', 1);
          if (shell.difficulty === 'hard') void reportProgress('rock-paper-scissors.hard', 1);
          if (l === 0) void reportProgress('rock-paper-scissors.flawless', 1);
          void incrementProgress('rock-paper-scissors.matches', 1);
        }
        void reportProgress('rock-paper-scissors.streak', best.current);
        shell.endRound({
          won,
          lost: !won,
          score: won ? 100 + (TARGET - l) * 20 : w * 10,
          title: won ? 'You win the match!' : 'The computer wins',
          details: [
            { label: 'Score', value: `${w} – ${l}` },
            { label: 'Rounds', value: String(next.length) },
            { label: 'Best win streak', value: String(best.current) },
          ],
        });
      }
    },
    [done, history, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m = KEYS[e.key.toLowerCase()];
      if (m && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        play(m);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play]);

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'You', value: wins },
          { label: 'Computer', value: losses },
          { label: 'First to', value: TARGET },
        ]}
      />
      <div className="cz-panel" aria-live="polite">
        <div className="row" style={{ gap: 'var(--space-6)', justifyContent: 'center' }}>
          <div>
            <div className="cz-big" key={`p${history.length}`}>{shown ? ICON[shown.player] : '❔'}</div>
            <div className="small muted">You</div>
          </div>
          <div className="cz-status">vs</div>
          <div>
            <div className="cz-big" key={`c${history.length}`}>{shown ? ICON[shown.computer] : '🤖'}</div>
            <div className="small muted">Computer</div>
          </div>
        </div>
        <div className="cz-status">
          {shown ? (shown.outcome === 'win' ? 'You win the round!' : shown.outcome === 'loss' ? 'Computer wins the round' : 'Draw') : 'Make your move'}
        </div>
      </div>
      <div className="cz-choices">
        {MOVES.map((m, i) => (
          <button key={m} type="button" className="cz-choice" disabled={done || shell.paused} onClick={() => play(m)}>
            <span className="cz-emoji" aria-hidden="true">
              {ICON[m]}
            </span>
            <span style={{ textTransform: 'capitalize' }}>{m}</span>
            <kbd>{m[0].toUpperCase()} or {i + 1}</kbd>
          </button>
        ))}
      </div>
      <div className="cz-history" aria-label="Previous rounds">
        {history.slice(-12).map((h, i) => (
          <span key={i} className={`cz-pill ${h.outcome}`}>
            {ICON[h.player]} {ICON[h.computer]}
          </span>
        ))}
      </div>
    </div>
  );
}
