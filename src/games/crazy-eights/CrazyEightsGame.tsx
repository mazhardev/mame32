import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar, useComputerTurn } from '../_shared/board/BoardUI';
import { PlayingCard } from '../_shared/cards/PlayingCard';
import { SUITS, SUIT_SYMBOL, cardLabel } from '../_shared/cards/deck';
import type { Card, Suit } from '../_shared/cards/deck';
import { Felt, Hand, useCardWidth } from '../_shared/cards/table';
import { canPlay, choose, deal, drawCard, favouriteSuit, handPoints, pass, playCard, top } from './engine';
import type { C8State } from './engine';

const NAMES = ['You', 'Ava', 'Ben', 'Cleo'];

export default function CrazyEightsGame() {
  const shell = useGameShell();
  const width = useCardWidth(8, 74, 40);
  const [players, setPlayers] = useState(3);
  const [s, setS] = useState<C8State>(() => deal(3));
  const [pending, setPending] = useState<Card | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const started = useRef(false);
  const eights = useRef(0);

  const restart = useCallback(() => {
    setS(deal(players));
    setPending(null);
    setNote(null);
    setOver(false);
    started.current = false;
    eights.current = 0;
  }, [players]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const begin = () => {
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
  };

  const after = (next: C8State, who: number, card: Card) => {
    setS(next);
    shell.play(card.rank === 8 ? 'powerup' : 'card');
    if (next.hands[who].length) return;
    setOver(true);
    const pts = next.hands.reduce((n, h, i) => (i === who ? n : n + handPoints(h)), 0);
    const won = who === 0;
    const text = won ? `You went out first and score ${pts}!` : `${NAMES[who]} went out first.`;
    setNote(text);
    shell.play(won ? 'levelComplete' : 'gameOver');
    if (won) {
      void reportProgress('crazy-eights.win', 1);
      if (players === 4) void reportProgress('crazy-eights.four', 1);
      if (card.rank === 8) void reportProgress('crazy-eights.finish8', 1);
    }
    shell.endRound({
      score: won ? pts * 5 : 0,
      won,
      lost: !won,
      title: text,
      details: next.hands.map((h, i) => ({ label: NAMES[i], value: `${h.length} cards` })),
    });
  };

  const humanPlay = (card: Card, suit?: Suit) => {
    begin();
    if (card.rank === 8) {
      eights.current++;
      void reportProgress('crazy-eights.eights', eights.current);
    }
    setPending(null);
    setNote(null);
    after(playCard(s, card, suit), 0, card);
  };

  const onCard = (card: Card) => {
    if (over || shell.paused || s.turn !== 0 || !canPlay(s, card)) return;
    if (card.rank === 8) {
      setPending(card);
      return;
    }
    humanPlay(card);
  };

  const onDraw = () => {
    if (over || shell.paused || s.turn !== 0) return;
    begin();
    if (!s.drew) {
      const next = drawCard(s);
      setS(next);
      shell.play('card');
      const got = next.hands[0][next.hands[0].length - 1];
      setNote(got && next.hands[0].length > s.hands[0].length ? `You drew ${cardLabel(got)}${canPlay(next, got) ? ' — you can play it.' : '.'}` : 'Nothing left to draw.');
    } else {
      setS(pass(s));
      setNote('You pass.');
    }
  };

  useComputerTurn(
    !over && s.turn !== 0 && !shell.paused,
    () => true,
    () => {
      const who = s.turn;
      const pick = choose(s, shell.difficulty);
      if (pick) {
        setNote(`${NAMES[who]} plays ${cardLabel(pick.card)}${pick.card.rank === 8 ? ` and names ${SUIT_SYMBOL[pick.suit ?? pick.card.suit]}` : ''}.`);
        after(playCard(s, pick.card, pick.suit), who, pick.card);
      } else if (!s.drew) {
        setS(drawCard(s));
        setNote(`${NAMES[who]} draws a card.`);
      } else {
        setS(pass(s));
        setNote(`${NAMES[who]} passes.`);
      }
    },
    `${s.turn}-${s.drew}-${s.discard.length}-${s.hands.map((h) => h.length).join()}`,
    650,
  );

  const topCard = top(s);
  const myTurn = s.turn === 0 && !over;
  const canAny = s.hands[0].some((c) => canPlay(s, c));

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Your cards', value: s.hands[0].length },
          { label: 'Stock', value: s.stock.length },
          { label: 'Suit to follow', value: SUIT_SYMBOL[s.suit] },
        ]}
      />
      <div className="seg" role="radiogroup" aria-label="Players">
        {[2, 3, 4].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={players === n} className={players === n ? 'on' : ''} disabled={started.current && !over} onClick={() => setPlayers(n)}>
            {n} players
          </button>
        ))}
      </div>
      <StatusBar>{note ?? (myTurn ? (canAny ? 'Your turn — match the suit or rank, or play an 8.' : s.drew ? 'Still no match — pass.' : 'No match — draw a card.') : `${NAMES[s.turn]} is thinking…`)}</StatusBar>
      <Felt>
        <div className="card-row" style={{ gap: 18 }}>
          {s.hands.slice(1).map((h, i) => (
            <div key={i} className={`chip-count`} style={{ outline: s.turn === i + 1 ? '2px solid #facc15' : undefined }}>
              {NAMES[i + 1]}: {h.length} 🂠
            </div>
          ))}
        </div>
        <div className="card-row" style={{ gap: 20, alignItems: 'center' }}>
          <PlayingCard card={{ ...topCard, faceUp: false }} width={width} onClick={myTurn && !canAny ? onDraw : undefined} ariaLabel={`Stock (${s.stock.length} cards) — draw`} />
          <div style={{ position: 'relative' }}>
            <PlayingCard card={topCard} width={width} />
            {topCard.rank === 8 && (
              <span className="chip-count" style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', fontSize: '1.1rem' }}>
                {SUIT_SYMBOL[s.suit]}
              </span>
            )}
          </div>
        </div>
        <Hand cards={s.hands[0]} width={width} playable={(c) => myTurn && canPlay(s, c)} onPick={onCard} label="Your hand" />
      </Felt>
      {pending && (
        <div className="bet-row" role="group" aria-label="Name a suit">
          <span>Name a suit:</span>
          {SUITS.map((suit) => (
            <button key={suit} type="button" className={`btn ${favouriteSuit(s.hands[0].filter((c) => c.id !== pending.id)) === suit ? 'btn-primary' : ''}`} onClick={() => humanPlay(pending, suit)} aria-label={suit}>
              <span style={{ color: suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : undefined, fontSize: '1.2rem' }}>{SUIT_SYMBOL[suit]}</span>
            </button>
          ))}
        </div>
      )}
      {myTurn && !canAny && (
        <button type="button" className="btn btn-primary" onClick={onDraw}>
          {s.drew ? 'Pass' : 'Draw a card'}
        </button>
      )}
    </BoardLayout>
  );
}
