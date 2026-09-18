import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReactionTimerGame from './ReactionTimerGame';

let restart: () => void;
let clock = 0;
let shell = {
  paused: false,
  startRound: vi.fn(),
  endRound: vi.fn(),
  play: vi.fn(),
  registerRestart: (callback: () => void) => {
    restart = callback;
  },
};
vi.mock('@/game-engine/context', () => ({ useGameShell: () => shell }));
vi.mock('@/achievements/AchievementService', () => ({
  reportProgress: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.useFakeTimers();
  clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.spyOn(Math, 'random').mockReturnValue(0);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  shell = {
    paused: false,
    startRound: vi.fn(),
    endRound: vi.fn(),
    play: vi.fn(),
    registerRestart: (callback) => {
      restart = callback;
    },
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function pad() {
  return screen.getByRole('button', { name: /Reaction pad:/ });
}
function advance(ms: number) {
  clock += ms;
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('Reaction Timer integration', () => {
  it('completes a five-trial round once with the correct score and summary', () => {
    render(<ReactionTimerGame />);
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(pad(), { key: 'Enter' });
      expect(pad()).toHaveAccessibleName('Reaction pad: WAIT');
      advance(1600);
      expect(pad()).toHaveAccessibleName('Reaction pad: GO!');
      advance(250);
      fireEvent.keyDown(pad(), { key: ' ' });
    }
    expect(shell.startRound).toHaveBeenCalledTimes(1);
    expect(shell.endRound).toHaveBeenCalledTimes(1);
    expect(shell.endRound).toHaveBeenCalledWith(expect.objectContaining({ score: 750, won: true }));
    expect(pad()).toBeDisabled();
  });

  it('cancels a pending signal on pause and restarts that trial without penalty', () => {
    const view = render(<ReactionTimerGame />);
    fireEvent.click(pad());
    shell.paused = true;
    view.rerender(<ReactionTimerGame />);
    advance(5000);
    shell.paused = false;
    view.rerender(<ReactionTimerGame />);
    expect(pad()).toHaveAccessibleName('Reaction pad: NEXT TRIAL');
    expect(screen.getByRole('status')).toHaveTextContent('Trial paused');
    fireEvent.click(pad());
    advance(1600);
    expect(pad()).toHaveAccessibleName('Reaction pad: GO!');
    expect(shell.startRound).toHaveBeenCalledTimes(1);
  });

  it('resets false starts and cancels old timers when the toolbar restarts', () => {
    render(<ReactionTimerGame />);
    fireEvent.click(pad());
    fireEvent.click(pad());
    expect(screen.getByRole('status')).toHaveTextContent('Too soon');
    fireEvent.click(pad());
    act(() => restart());
    advance(5000);
    expect(pad()).toHaveAccessibleName('Reaction pad: START');
    expect(shell.endRound).not.toHaveBeenCalled();
    fireEvent.click(pad());
    expect(shell.startRound).toHaveBeenCalledTimes(2);
  });

  it('ignores held keys and clears the signal timeout when unmounted', () => {
    const view = render(<ReactionTimerGame />);
    fireEvent.keyDown(pad(), { key: 'Enter', repeat: true });
    expect(shell.startRound).not.toHaveBeenCalled();
    fireEvent.keyDown(pad(), { key: 'Enter' });
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
