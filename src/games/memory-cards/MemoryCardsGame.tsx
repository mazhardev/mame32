import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import type { Card } from '../_shared/cards/deck';
import { Felt, useCardWidth } from '../_shared/cards/table';
import { dealPairs, matches } from './engine';

const SETUP = { easy: { pairs: 6, cols: 4 }, normal: { pairs: 10, cols: 5 }, hard: { pairs: 15, cols: 6 } } as const;

export default function MemoryCardsGame() {
  const shell = useGameShell();
  const { pairs, cols } = SETUP[shell.difficulty];
  const width = useCardWidth(cols, 78);
  const [cards, setCards] = useState<Card[]>(() => dealPairs(pairs));
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [misses, setMisses] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [over, setOver] = useState(false);
  const started = useRef(false);
  const seen = useRef(new Set<string>());

  const restart = useCallback(() => {
    setCards(dealPairs(pairs));
    setOpen([]);
    setFound(new Set());
    setMoves(0);
    setMisses(0);
    setSeconds(0);
    setOver(false);
    started.current = false;
    seen.current = new Set();
  }, [pairs]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  useEffect(() => {
    if (!started.current || over || shell.paused) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [over, shell.paused, moves]);

  const flip = (i: number) => {
    if (over || shell.paused || open.length === 2 || open.includes(i) || found.has(cards[i].id)) return;
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    shell.play('card');
    const now = [...open, i];
    setOpen(now);
    if (now.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = now.map((k) => cards[k]);
    if (matches(a, b)) {
      const f = new Set(found);
      f.add(a.id);
      f.add(b.id);
      window.setTimeout(() => {
        setFound(f);
        setOpen([]);
        shell.play('success');
        if (f.size === cards.length) finish(misses);
      }, 350);
    } else {
      // A miss only counts if you had already seen the partner of one of the cards.
      const known = [a, b].some((c) => cards.some((o) => matches(c, o) && seen.current.has(o.id)));
      const m = misses + (known ? 1 : 0);
      if (known) setMisses(m);
      window.setTimeout(() => setOpen([]), 850);
    }
    seen.current.add(a.id);
    seen.current.add(b.id);
  };

  const finish = (missCount: number) => {
    setOver(true);
    shell.play('levelComplete');
    const score = Math.max(50, pairs * 60 - missCount * 25 + Math.max(0, pairs * 12 - seconds) * 3);
    void reportProgress('memory-cards.clear', 1);
    if (missCount === 0) void reportProgress('memory-cards.perfect', 1);
    if (pairs === 15) void reportProgress('memory-cards.big', 1);
    if (seconds <= pairs * 5) void reportProgress('memory-cards.fast', 1);
    shell.endRound({
      score,
      won: true,
      title: 'All pairs found!',
      details: [
        { label: 'Moves', value: String(moves + 1) },
        { label: 'Memory slips', value: String(missCount) },
        { label: 'Time', value: `${seconds}s` },
      ],
    });
  };

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Pairs', value: `${found.size / 2}/${pairs}` },
          { label: 'Moves', value: moves },
          { label: 'Slips', value: misses },
          { label: 'Time', value: `${seconds}s` },
        ]}
      />
      <StatusBar>Find pairs of the same rank and colour — like 7♥ and 7♦.</StatusBar>
      <Felt>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${width}px)`, gap: 6 }}>
          {cards.map((c, i) => {
            const shown = open.includes(i) || found.has(c.id);
            return (
              <div key={c.id} style={{ visibility: found.has(c.id) && !open.includes(i) ? 'hidden' : 'visible' }}>
                <PlayingCard card={{ ...c, faceUp: shown }} width={width} onClick={shown ? undefined : () => flip(i)} ariaLabel={shown ? undefined : `Face-down card ${i + 1}`} />
              </div>
            );
          })}
        </div>
      </Felt>
    </BoardLayout>
  );
}
