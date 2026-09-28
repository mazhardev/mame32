import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '@/utils/random';
import type { Board, Config } from './engine';
import { findRuns } from './engine';
import { Match3Board } from './Match3Board';
import type { Skin } from './Match3Board';
import { useMatch3 } from './useMatch3';

const cfg: Config = { w: 5, h: 5, colors: 5, specials: true };
let id = 1;
const build = (rows: string[]): Board => rows.join('').split('').map((ch) => ({ id: id++, color: Number(ch), special: 'none' }));
const skin: Skin = { colors: ['a', 'b', 'c', 'd', 'e'], names: ['a', 'b', 'c', 'd', 'e'], face: () => null };

function Harness({ initial, events }: { initial: Board; events: string[] }) {
  const m3 = useMatch3(cfg, () => initial, createRng('h').next, {
    onAccepted: () => events.push('accepted'),
    onStep: (_, i) => events.push(`step${i}`),
    onSettled: (b) => events.push(findRuns(cfg, b).length ? 'settled-with-runs' : 'settled'),
    onInvalid: () => events.push('invalid'),
  });
  return (
    <Match3Board
      cfg={cfg}
      board={m3.board}
      popping={m3.popping}
      spawned={m3.spawned}
      skin={skin}
      disabled={m3.busy}
      onSwap={(a, b) => void m3.swap(a, b)}
      label="test board"
    />
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('match-three board flow', () => {
  it('plays a keyboard swap through accept, cascade steps and settle', async () => {
    const events: string[] = [];
    render(<Harness initial={build(['11213', '23432', '34023', '40340', '02402'])} events={events} />);
    const board = screen.getByRole('application');
    board.focus();
    // Cursor starts on cell 0: move to cell 2, pick it up, swap right.
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    fireEvent.keyDown(board, { key: 'Enter' });
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(events[0]).toBe('accepted');
    expect(events).toContain('step0');
    expect(events[events.length - 1]).toBe('settled');
  });

  it('bounces back an illegal swap without accepting it', async () => {
    const events: string[] = [];
    render(<Harness initial={build(['11213', '23432', '34023', '40340', '02402'])} events={events} />);
    const board = screen.getByRole('application');
    board.focus();
    fireEvent.keyDown(board, { key: 'ArrowDown' }); // cell 5
    fireEvent.keyDown(board, { key: 'Enter' });
    fireEvent.keyDown(board, { key: 'ArrowRight' }); // swap 5 and 6: no match
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(events).toEqual(['invalid']);
  });
});
