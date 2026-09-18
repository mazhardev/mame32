import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GameShell } from '@/components/game/GameShell';
import { GAME_REGISTRY } from './registry';
import { PLANNED_GAMES } from '@/data/plannedGames';

vi.mock('@/services/audio', () => ({
  playSound: vi.fn(),
  unlockAudio: vi.fn(),
  vibrate: vi.fn(),
}));

/**
 * jsdom has no canvas. A permissive 2D context lets canvas games run their
 * render paths: every method is a no-op that returns another stub, and
 * property writes are remembered.
 */
function stubContext(): CanvasRenderingContext2D {
  const store: Record<string | symbol, unknown> = {};
  const fn: () => unknown = () => handle;
  const handle: unknown = new Proxy(fn, {
    get(_t, prop) {
      if (prop in store) return store[prop];
      if (prop === 'width' || prop === 'height') return 0;
      if (prop === 'data') return new Uint8ClampedArray(4);
      if (prop === Symbol.toPrimitive) return () => 0;
      return handle;
    },
    set(_t, prop, value) {
      store[prop] = value;
      return true;
    },
    apply: () => handle,
  });
  return handle as CanvasRenderingContext2D;
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return stubContext();
  } as unknown as HTMLCanvasElement['getContext'];
  HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
});

afterEach(() => cleanup());

describe('every registered game', () => {
  it('has a unique id that matches a catalog entry', () => {
    const ids = GAME_REGISTRY.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    const planned = new Set(PLANNED_GAMES.map((g) => g.id));
    for (const id of ids) expect(planned.has(id), `${id} is not in plannedGames.ts`).toBe(true);
    const achievementIds = GAME_REGISTRY.flatMap((g) => (g.achievements ?? []).map((a) => a.id));
    expect(new Set(achievementIds).size).toBe(achievementIds.length);
  });

  it.each(GAME_REGISTRY.map((g) => [g.id, g] as const))(
    '%s has instructions and achievements',
    (_id, game) => {
      expect(game.instructions.howToPlay.length).toBeGreaterThan(0);
      expect(game.instructions.objective).not.toBe('');
      expect(game.shortDescription.length).toBeGreaterThan(10);
      for (const a of game.achievements ?? []) expect(a.gameId).toBe(game.id);
    },
  );

  it.each(GAME_REGISTRY.map((g) => [g.id, g] as const))(
    '%s mounts and survives a first interaction',
    async (_id, game) => {
      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <GameShell game={game} />
        </MemoryRouter>,
      );
      await waitFor(() => expect(screen.queryByText(/^Loading /)).not.toBeInTheDocument(), {
        timeout: 4000,
      });
      const stage = document.querySelector('.game-stage');
      expect(stage).not.toBeNull();
      // Press the first few enabled controls inside the game (not the toolbar).
      const buttons = Array.from(
        stage!.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
      ).slice(0, 3);
      for (const b of buttons) {
        await act(async () => {
          fireEvent.click(b);
        });
      }
      const canvas = stage!.querySelector('canvas');
      if (canvas) {
        await act(async () => {
          fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
          fireEvent.pointerUp(canvas, { clientX: 12, clientY: 12, pointerId: 1 });
        });
      }
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(screen.queryByText(/encountered an error/i)).not.toBeInTheDocument();
    },
  );
});
