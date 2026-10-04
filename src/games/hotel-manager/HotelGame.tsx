'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  AMENITIES,
  BUILD,
  CLEAN_PER_KEEPER,
  MAX_ROOMS,
  NIGHTS,
  RENOVATE,
  ROOM_INFO,
  TUNING,
  WINDOW,
  accept,
  buildRoom,
  buyAmenity,
  decline,
  dirtyArrivals,
  endDay,
  fits,
  hire,
  newHotel,
  occupant,
  rating,
  renovate,
  upkeep,
  validHotel,
  wages,
} from './engine';
import type { Hotel, RoomType } from './engine';
import './hotel.css';

const COLORS = [
  '#60a5fa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#a78bfa',
  '#f87171',
  '#2dd4bf',
  '#fb923c',
];
const colorFor = (name: string) =>
  COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const stars = (r: number) => `${r.toFixed(1)}★`;

export default function HotelGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const t = TUNING[d];
  const [h, setH] = useState<Hotel>(() => newHotel(Math.floor(Math.random() * 1e9), d));
  const [selected, setSelected] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('hotel-manager', validHotel);
  const [pending, setPending] = useState<Hotel | null>(null);

  useEffect(() => {
    if (save.saved && save.saved.day <= NIGHTS) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    setH(newHotel(Math.floor(Math.random() * 1e9), d));
    setSelected(null);
    setPending(null);
    setStarted(false);
    setDone(false);
    save.clear();
  }, [d, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const act = (fn: () => boolean | void, sound: 'click' | 'coin' | 'success' = 'click') => {
    if (done || pending || shell.paused) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const ok = fn();
    shell.play(ok === false ? 'failure' : sound);
    refresh();
  };

  const req = h.requests.find((r) => r.id === selected) ?? null;

  const placeIn = (roomIndex: number) =>
    act(() => {
      if (!req) return false;
      const ok = accept(h, req.id, roomIndex);
      if (ok) {
        setSelected(null);
        void reportProgress('hotel-manager.first', 1);
        if (h.rooms[roomIndex].type === 'suite' && req.wanted === 'suite')
          void reportProgress('hotel-manager.suite', 1);
      }
      return ok;
    }, 'success');

  const nextDay = () =>
    act(() => {
      const rep = endDay(h, d);
      setSelected(null);
      shell.play(rep.dirty ? 'failure' : 'coin');
      const full = h.rooms.every((r) => occupant(r, h.day - 1) !== null);
      if (full) void reportProgress('hotel-manager.full', 1);
      void incrementProgress('hotel-manager.guests', rep.reviews.length);
      if (rating(h) >= 4.5) void reportProgress('hotel-manager.stars', 1);
      if (h.day > NIGHTS) {
        const won = h.cash >= t.goal;
        setDone(true);
        save.clear();
        if (won) void reportProgress('hotel-manager.goal', 1);
        if (won && d === 'hard') void reportProgress('hotel-manager.hard', 1);
        shell.endRound({
          won,
          lost: !won,
          score: Math.max(0, h.cash),
          title: won ? `A full house: ${h.cash} coins!` : `The month ends with ${h.cash} coins`,
          details: [
            { label: 'Goal', value: `${t.goal} coins` },
            { label: 'Guests', value: String(h.guests) },
            { label: 'Rating', value: stars(rating(h)) },
            { label: 'Rooms', value: String(h.rooms.length) },
          ],
        });
        return;
      }
      h.savedAt = Date.now();
      save.persist(JSON.parse(JSON.stringify(h)) as Hotel, {
        percent: Math.round(((h.day - 1) / NIGHTS) * 100),
        label: `Night ${h.day} of ${NIGHTS} · ${h.cash} coins`,
      });
    }, 'coin');

  const nights = Array.from({ length: WINDOW }, (_, i) => h.day + i).filter((n) => n <= NIGHTS);
  const dirty = h.rooms.filter((r) => !r.clean).length;
  const arrivalsDirty = dirtyArrivals(h);

  return (
    <div className="hotel">
      <GameHud
        items={[
          { label: 'Night', value: `${Math.min(h.day, NIGHTS)}/${NIGHTS}` },
          { label: 'Cash', value: h.cash },
          { label: 'Goal', value: t.goal },
          { label: 'Rating', value: stars(rating(h)) },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Night ${pending.day} of ${NIGHTS} · ${pending.cash} coins`}
          onContinue={() => {
            setH(pending);
            setPending(null);
            save.dismiss();
          }}
          onNew={restart}
        />
      )}
      {h.log[0] && <div className="hotel-log small">{h.log[0]}</div>}

      <section aria-label="Booking requests">
        <h3 className="hotel-h">
          Booking requests {req ? '— now tap a room row' : '— tap one to place it'}
        </h3>
        <div className="hotel-requests">
          {h.requests.length === 0 && <span className="muted small">No requests right now.</span>}
          {h.requests
            .slice()
            .sort((a, b) => a.from - b.from)
            .map((r) => (
              <div key={r.id} className={`hotel-req${selected === r.id ? ' on' : ''}`}>
                <button
                  type="button"
                  className="hotel-req-main"
                  aria-pressed={selected === r.id}
                  onClick={() => setSelected(selected === r.id ? null : r.id)}
                >
                  <span className="hotel-req-icon">{ROOM_INFO[r.wanted].icon}</span>
                  <span>
                    <strong>{r.guest}</strong> <span className="muted small">{r.note}</span>
                    <br />
                    <span className="small">
                      {ROOM_INFO[r.wanted].name} · night {r.from}
                      {r.to - r.from > 1 ? `–${r.to - 1}` : ''} ({r.to - r.from}n)
                    </span>
                  </span>
                  <span className="hotel-rate">
                    {r.rate}
                    <span className="small muted">/night</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="hotel-decline"
                  aria-label={`Decline ${r.guest}`}
                  onClick={() =>
                    act(() => {
                      decline(h, r.id);
                      if (selected === r.id) setSelected(null);
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      </section>

      <section aria-label="Room calendar" className="hotel-cal-wrap">
        <table className="hotel-cal">
          <caption className="small muted">
            Room calendar · nights across, underlined = tonight
          </caption>
          <thead>
            <tr>
              <th scope="col">Room</th>
              {nights.map((n) => (
                <th
                  key={n}
                  scope="col"
                  className={n === h.day ? 'tonight' : ''}
                  aria-label={n === h.day ? `Tonight, night ${n}` : `Night ${n}`}
                >
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {h.rooms.map((room, i) => {
              const ok = req ? fits(h, i, req) : false;
              return (
                <tr
                  key={i}
                  className={req ? (ok ? 'fit' : 'nofit') : ''}
                  onClick={() => req && placeIn(i)}
                >
                  <th scope="row">
                    <button
                      type="button"
                      className="hotel-room"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (req) placeIn(i);
                      }}
                      aria-label={`Room ${i + 1}, ${ROOM_INFO[room.type].name}, ${room.clean ? 'clean' : 'needs cleaning'}${req ? (ok ? ', available' : ', not available') : ''}`}
                    >
                      {ROOM_INFO[room.type].icon} {i + 1}
                      <span className="hotel-clean" title={room.clean ? 'Clean' : 'Needs cleaning'}>
                        {room.clean ? '✨' : '🧹'}
                      </span>
                    </button>
                  </th>
                  {nights.map((n) => {
                    const b = occupant(room, n);
                    const preview = req && n >= req.from && n < req.to;
                    return (
                      <td
                        key={n}
                        className={preview ? (ok ? 'pv ok' : 'pv bad') : ''}
                        style={b ? { background: colorFor(b.guest) } : undefined}
                        title={b ? `${b.guest} · ${b.rate}/night` : ''}
                      >
                        {b ? b.guest.slice(0, 3) : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="hotel-panel" aria-label="Staff">
        <div>
          <strong>🧹 Housekeepers: {h.keepers}</strong>
          <div className="small muted">
            Clean {h.keepers * CLEAN_PER_KEEPER} rooms a day · {dirty} dirty
            {arrivalsDirty > 0 && (
              <span className="hotel-warn"> · {arrivalsDirty} arriving tonight need cleaning</span>
            )}
          </div>
        </div>
        <div className="hotel-btns">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => act(() => hire(h, -1))}
            aria-label="Fewer housekeepers"
          >
            −
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => act(() => hire(h, 1))}
            aria-label="More housekeepers"
          >
            +
          </button>
        </div>
        <div className="small muted">
          Daily costs: wages {wages(h, d)} + upkeep {upkeep(h)}
        </div>
      </section>

      <section className="hotel-shop" aria-label="Improvements">
        {(['standard', 'deluxe', 'suite'] as RoomType[]).map((type) => (
          <button
            key={type}
            type="button"
            className="hotel-buy"
            disabled={h.rooms.length >= MAX_ROOMS || h.cash < BUILD[type] || done}
            onClick={() =>
              act(() => {
                const ok = buildRoom(h, type);
                if (ok) void reportProgress('hotel-manager.rooms', h.rooms.length);
                return ok;
              }, 'success')
            }
          >
            {ROOM_INFO[type].icon} New {ROOM_INFO[type].name.toLowerCase()}
            <span className="small muted">{BUILD[type]}c</span>
          </button>
        ))}
        {AMENITIES.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`hotel-buy${h.amenities.includes(a.id) ? ' owned' : ''}`}
            disabled={h.amenities.includes(a.id) || h.cash < a.cost || done}
            onClick={() => act(() => buyAmenity(h, a.id), 'success')}
            title={a.desc}
          >
            {a.icon} {a.name}
            <span className="small muted">
              {h.amenities.includes(a.id) ? 'Open' : `${a.cost}c · ${a.desc}`}
            </span>
          </button>
        ))}
        {h.rooms.map((room, i) =>
          RENOVATE[room.type] !== undefined && h.cash >= (RENOVATE[room.type] ?? Infinity) ? (
            <button
              key={`r${i}`}
              type="button"
              className="hotel-buy"
              onClick={() => act(() => renovate(h, i), 'success')}
              disabled={done}
            >
              ⬆️ Renovate room {i + 1}
              <span className="small muted">
                to {room.type === 'standard' ? 'deluxe' : 'suite'} · {RENOVATE[room.type]}c
              </span>
            </button>
          ) : null,
        )}
      </section>

      <div className="hotel-actions">
        <button type="button" className="btn btn-primary" onClick={nextDay} disabled={done}>
          🌙 {h.day >= NIGHTS ? 'Final night' : 'End the day'}
        </button>
      </div>
    </div>
  );
}
