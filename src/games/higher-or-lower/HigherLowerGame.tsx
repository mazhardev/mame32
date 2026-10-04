import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { judge, odds, points } from './engine';
import type { Guess } from './engine';

const LIVES = { easy: 3, normal: 2, hard: 1 } as const;

function freshDeck(): Card[] {
  return shuffleDeck(buildDeck(1, true));
}

export default function HigherLowerGame() {
  const shell = useGameShell();
  const width = useCardWidth(3, 110);
  const [deck, setDeck] = useState<Card[]>(freshDeck);
  const [pos, setPos] = useState(0);
  const [lives, setLives] = useState<number>(LIVES[shell.difficulty]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const best = useRef(0);
  const started = useRef(false);

  const restart = useCallback(() => {
    setDeck(freshDeck());
    setPos(0);
    setLives(LIVES[shell.difficulty]);
    setScore(0);
    setStreak(0);
    setNote(null);
    setOver(false);
    best.current = 0;
    started.current = false;
  }, [shell.difficulty]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const current = deck[pos];
  const unseen = deck.slice(pos + 1);

  const end = (finalScore: number, reason: string) => {
    setOver(true);
    shell.play('gameOver');
    void reportProgress('higher-or-lower.streak', best.current);
    void reportProgress('higher-or-lower.score', finalScore);
    shell.endRound({
      score: finalScore,
      won: pos >= 50,
      title: reason,
      details: [
        { label: 'Best streak', value: String(best.current) },
        { label: 'Cards seen', value: String(pos + 1) },
      ],
    });
  };

  const guess = (g: Guess) => {
    if (over || shell.paused || pos >= deck.length - 1) return;
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    const chance = odds(current, unseen, g);
    const next = deck[pos + 1];
    const result = judge(current, next, g);
    setPos(pos + 1);
    if (result === 'right' || (result === 'tie' && shell.difficulty === 'easy')) {
      const gain = result === 'tie' ? 5 : points(chance);
      const s = streak + 1;
      best.current = Math.max(best.current, s);
      setStreak(s);
      setScore(score + gain);
      setNote(result === 'tie' ? 'Same rank — a free pass on Easy (+5).' : `Right! +${gain}${chance < 0.3 ? ' — a bold call!' : ''}`);
      shell.play(chance < 0.3 ? 'coin' : 'success');
      if (chance < 0.25 && result === 'right') void reportProgress('higher-or-lower.bold', 1);
      if (pos + 1 >= deck.length - 1) {
        void reportProgress('higher-or-lower.deck', 1);
        end(score + gain + 200, 'You made it through the whole deck!');
      }
      return;
    }
    setStreak(0);
    const left = lives - 1;
    setLives(left);
    shell.play('failure');
    setNote(result === 'tie' ? 'Same rank — that counts as a miss.' : 'Wrong!');
    if (left <= 0) end(score, `Out of lives with ${score} points.`);
  };

  const hi = current ? Math.round(odds(current, unseen, 'higher') * 100) : 0;
  const lo = current ? Math.round(odds(current, unseen, 'lower') * 100) : 0;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Score', value: score },
          { label: 'Streak', value: streak },
          { label: 'Lives', value: '❤️'.repeat(Math.max(0, lives)) || '—' },
          { label: 'Cards left', value: unseen.length },
        ]}
      />
      <StatusBar>{note ?? 'Will the next card be higher or lower? Aces are high.'}</StatusBar>
      <Felt>
        <div className="card-row" style={{ gap: 18, alignItems: 'center' }}>
          {pos > 0 && <PlayingCard card={deck[pos - 1]} width={Math.round(width * 0.7)} dimmed />}
          {current && <PlayingCard card={current} width={width} />}
          <PlayingCard card={{ ...(deck[pos + 1] ?? current), faceUp: false }} width={width} ariaLabel="Next card, face down" />
        </div>
      </Felt>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-primary" onClick={() => guess('higher')} disabled={over || shell.paused} style={{ minWidth: 130 }}>
          ⬆ Higher {shell.difficulty !== 'hard' && <small style={{ opacity: 0.75 }}>({hi}%)</small>}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => guess('lower')} disabled={over || shell.paused} style={{ minWidth: 130 }}>
          ⬇ Lower {shell.difficulty !== 'hard' && <small style={{ opacity: 0.75 }}>({lo}%)</small>}
        </button>
      </div>
    </BoardLayout>
  );
}
