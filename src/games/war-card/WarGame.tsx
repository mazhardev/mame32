import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard, CardPlaceholder } from '../_shared/cards/PlayingCard';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { battle, deal } from './engine';
import type { Battle, WarState } from './engine';

const ROUNDS = { easy: 30, normal: 75, hard: 250 } as const;

export default function WarGame() {
  const shell = useGameShell();
  const limit = ROUNDS[shell.difficulty];
  const width = useCardWidth(5, 84);
  const [s, setS] = useState<WarState>(deal);
  const [last, setLast] = useState<Battle | null>(null);
  const [auto, setAuto] = useState(false);
  const [over, setOver] = useState(false);
  const stats = useRef({ wars: 0, biggest: 0 });

  const restart = useCallback(() => {
    setS(deal());
    setLast(null);
    setAuto(false);
    setOver(false);
    stats.current = { wars: 0, biggest: 0 };
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, limit]);

  const flip = useCallback(() => {
    if (over) return;
    if (s.round === 0) shell.startRound();
    const b = battle(s);
    setS(b.state);
    setLast(b);
    const wars = b.stages.length - 1;
    if (wars) {
      stats.current.wars += wars;
      shell.play('explosion');
      if (b.winner === 'you') {
        void reportProgress('war-card.war', 1);
        if (wars >= 2) void reportProgress('war-card.double', 1);
      }
    } else shell.play(b.winner === 'you' ? 'card' : 'blip');
    const done = !b.state.you.length || !b.state.cpu.length || b.state.round >= limit;
    if (done) {
      setOver(true);
      setAuto(false);
      const mine = b.state.you.length;
      const won = mine > 26;
      const text = !b.state.cpu.length ? 'You won every card!' : !mine ? 'The computer took every card.' : won ? `You finish ahead with ${mine} cards!` : mine === 26 ? 'A perfect tie — 26 cards each.' : `The computer finishes ahead, ${52 - mine}–${mine}.`;
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) void reportProgress('war-card.win', 1);
      if (!b.state.cpu.length) void reportProgress('war-card.all', 1);
      shell.endRound({
        score: mine * 10,
        won,
        lost: mine < 26,
        draw: mine === 26,
        title: text,
        details: [
          { label: 'Rounds', value: String(b.state.round) },
          { label: 'Wars', value: String(stats.current.wars) },
        ],
      });
    }
  }, [limit, over, s, shell]);

  useEffect(() => {
    if (!auto || over || shell.paused) return;
    const id = window.setTimeout(flip, last && last.stages.length > 1 ? 1300 : 650);
    return () => window.clearTimeout(id);
  }, [auto, flip, last, over, shell.paused]);

  const stage = last?.stages[last.stages.length - 1];
  const status = over
    ? `Game over after ${s.round} rounds.`
    : !last
      ? `Flip to play. Most cards after ${limit} rounds wins${shell.difficulty === 'hard' ? ' (or take all 52)' : ''}.`
      : `${last.stages.length > 1 ? `WAR ×${last.stages.length - 1}! ` : ''}${last.winner === 'you' ? 'You take' : 'Computer takes'} ${last.pot} cards.`;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Your cards', value: s.you.length },
          { label: 'Computer', value: s.cpu.length },
          { label: 'Round', value: `${s.round}/${limit}` },
        ]}
      />
      <StatusBar>{status}</StatusBar>
      <Felt>
        <div className="card-row" style={{ gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="muted-on-felt">Computer</div>
            {s.cpu.length ? <PlayingCard card={{ ...s.cpu[0], faceUp: false }} width={width} /> : <CardPlaceholder width={width} />}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {stage ? (
              <>
                <PlayingCard card={{ ...stage[1], faceUp: true }} width={width} dimmed={last?.winner === 'you'} />
                <PlayingCard card={{ ...stage[0], faceUp: true }} width={width} dimmed={last?.winner === 'cpu'} />
              </>
            ) : (
              <>
                <CardPlaceholder width={width} />
                <CardPlaceholder width={width} />
              </>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="muted-on-felt">You</div>
            {s.you.length ? <PlayingCard card={{ ...s.you[0], faceUp: false }} width={width} onClick={flip} ariaLabel="Your deck — flip a card" /> : <CardPlaceholder width={width} />}
          </div>
        </div>
      </Felt>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={flip} disabled={over || shell.paused}>
          Flip
        </button>
        <button type="button" className="btn" onClick={() => setAuto((a) => !a)} disabled={over}>
          {auto ? '⏸ Stop auto' : '⏩ Auto-play'}
        </button>
      </div>
    </BoardLayout>
  );
}
