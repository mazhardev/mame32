import { lazy, useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameShell } from './GameShell';
import { useGameShell } from '@/game-engine/context';
import type { GameShellApi } from '@/game-engine/context';
import type { GameDefinition } from '@/types';
import { addPlayTime, getGameSettings, getBestHighScore, recordGameComplete, recordGameStart, setGameSettings } from '@/storage/StorageService';

vi.mock('@/storage/StorageService', () => ({
  addPlayTime: vi.fn().mockResolvedValue(undefined),
  getGameSettings: vi.fn().mockResolvedValue({ difficulty: 'normal' }),
  getBestHighScore: vi.fn().mockResolvedValue(null),
  recordGameComplete: vi.fn().mockResolvedValue({ isRecord: false, previousBest: null }),
  recordGameStart: vi.fn().mockResolvedValue(undefined),
  setGameSettings: vi.fn(),
}));
vi.mock('@/hooks/usePlatform', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/usePlatform')>();
  return {
    ...original,
    usePreferences: () => [{ difficulty: 'normal', sound: false, preferFullscreen }, vi.fn()],
  };
});
vi.mock('@/services/audio', () => ({ playSound: vi.fn(), unlockAudio: vi.fn(), vibrate: vi.fn() }));
vi.mock('@/achievements/AchievementService', () => ({
  evaluateGlobalAchievements: vi.fn().mockResolvedValue(undefined),
  reportHighScoreBeaten: vi.fn(),
}));
vi.mock('@/services/dailyChallenge', () => ({ reportRoundForChallenge: vi.fn().mockResolvedValue(false) }));

let api: GameShellApi;
let preferFullscreen = false;
let disablePause = false;
let renders = 0;
let mounts = 0;
function TestGame() {
  const shell = useGameShell();
  api = shell;
  renders++;
  useEffect(() => {
    mounts++;
  }, []);
  // Real board games configure capabilities in an effect depending on the API.
  useEffect(() => {
    if (disablePause && renders < 15) shell.setCapabilities({ pausable: false });
  }, [shell]);
  return <div>Test board</div>;
}
const game: GameDefinition = {
  id: 'test-game', title: 'Test game', shortDescription: '', fullDescription: '',
  category: 'board', difficulty: 'easy', tags: [], icon: '', controls: {},
  supportsTouch: true, supportsKeyboard: true, multiplayer: 'single',
  estimatedMinutes: 1, hasHighScore: true, hasAchievements: false, status: 'available',
  instructions: { howToPlay: ['Line up three marks.'], objective: 'Win the board.' },
  component: lazy(async () => ({ default: TestGame })),
};
const helpGame: GameDefinition = {
  ...game,
  controls: { touch: ['Tap a square'], keyboard: ['Arrow keys move'] },
};

async function mount(def: GameDefinition = game) {
  const view = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><GameShell game={def} /></MemoryRouter>);
  await screen.findByText('Test board');
  return view;
}

function visibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  fireEvent(document, new Event('visibilitychange'));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(1000);
  vi.mocked(getGameSettings).mockResolvedValue({ gameId: 'test-game', difficulty: 'normal' });
  vi.mocked(getBestHighScore).mockResolvedValue(null);
  vi.mocked(recordGameComplete).mockResolvedValue({ isRecord: false, previousBest: null });
  visibility('visible');
  disablePause = false;
  preferFullscreen = false;
  renders = 0;
  mounts = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GameShell lifecycle', () => {
  it('settles when a game repeatedly declares unchanged capabilities', async () => {
    disablePause = true;
    await mount();
    // The capability update lands in a passive effect after the lazy mount.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Pause game' })).not.toBeInTheDocument(),
    );
    expect(renders).toBeLessThan(10);
  });

  it('does not count time spent viewing a game before starting', async () => {
    const view = await mount();
    vi.mocked(Date.now).mockReturnValue(8000);
    view.unmount();
    expect(addPlayTime).not.toHaveBeenCalled();
  });

  it('excludes manual pauses and hidden time from an active round', async () => {
    const view = await mount();
    act(() => api.startRound());
    vi.mocked(Date.now).mockReturnValue(2000);
    act(() => api.setPaused(true));
    vi.mocked(Date.now).mockReturnValue(5000);
    visibility('hidden');
    visibility('visible');
    expect(api.paused).toBe(true);
    act(() => api.setPaused(false));
    vi.mocked(Date.now).mockReturnValue(6000);
    visibility('hidden');
    vi.mocked(Date.now).mockReturnValue(9000);
    visibility('visible');
    vi.mocked(Date.now).mockReturnValue(10000);
    view.unmount();
    expect(addPlayTime).toHaveBeenCalledTimes(1);
    expect(addPlayTime).toHaveBeenCalledWith('test-game', 3000);
  });

  it('records duplicate start/end callbacks only once per round', async () => {
    await mount();
    act(() => { api.startRound(); api.startRound(); });
    await act(async () => { api.endRound({ score: 20 }); api.endRound({ score: 20 }); });
    expect(recordGameStart).toHaveBeenCalledTimes(1);
    expect(recordGameComplete).toHaveBeenCalledTimes(1);
  });

  it('discards a delayed result after restart', async () => {
    let finish!: (value: { isRecord: boolean; previousBest: number | null }) => void;
    vi.mocked(recordGameComplete).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await mount();
    act(() => api.startRound());
    act(() => api.endRound({ title: 'Old round', score: 20 }));
    act(() => api.requestRestart());
    await act(async () => { finish({ isRecord: false, previousBest: null }); });
    expect(screen.queryByText('Old round')).not.toBeInTheDocument();
    expect(api.paused).toBe(false);
  });

  it('keeps a restarted game paused while the tab is hidden', async () => {
    await mount();
    visibility('hidden');
    act(() => api.requestRestart());
    expect(api.paused).toBe(true);
    visibility('visible');
    expect(api.paused).toBe(false);
  });

  it('does not count result-screen time after clearing a result', async () => {
    const view = await mount();
    act(() => api.startRound());
    vi.mocked(Date.now).mockReturnValue(2000);
    await act(async () => api.endRound({ score: 20 }));
    vi.mocked(Date.now).mockReturnValue(9000);
    act(() => api.clearResult());
    vi.mocked(Date.now).mockReturnValue(15000);
    view.unmount();
    expect(addPlayTime).toHaveBeenCalledTimes(1);
    expect(addPlayTime).toHaveBeenCalledWith('test-game', 1000);
  });

  it('does not intercept browser shortcuts or repeated keydown events', async () => {
    await mount();
    const restart = vi.fn();
    act(() => api.registerRestart(restart));
    fireEvent.keyDown(window, { key: 'r', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'r', metaKey: true });
    fireEvent.keyDown(window, { key: 'r', repeat: true });
    expect(restart).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'r' });
    expect(restart).toHaveBeenCalledTimes(1);
  });
});

describe('GameShell result screen', () => {
  it('offers a game-supplied next action that dismisses the result', async () => {
    await mount();
    const next = vi.fn();
    act(() => api.startRound());
    await act(async () => api.endRound({ won: true, score: 5, next: { label: 'Next level →', action: next } }));
    const button = await screen.findByRole('button', { name: 'Next level →' });
    fireEvent.click(button);
    expect(next).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Next level →' })).not.toBeInTheDocument();
  });
});

describe('GameShell difficulty picker', () => {
  const picker = () => screen.queryByRole('combobox', { name: 'Difficulty' });

  it('switches at once and starts a fresh game when no round is running', async () => {
    await mount();
    await waitFor(() => expect(picker()).toHaveValue('normal'));
    fireEvent.change(picker()!, { target: { value: 'hard' } });
    expect(api.difficulty).toBe('hard');
    expect(setGameSettings).toHaveBeenCalledWith('test-game', { difficulty: 'hard' });
    await waitFor(() => expect(mounts).toBe(2));
  });

  it('asks before abandoning a round in progress', async () => {
    await mount();
    act(() => api.startRound());
    fireEvent.change(picker()!, { target: { value: 'easy' } });
    expect(screen.getByText('Switch to Easy?')).toBeInTheDocument();
    expect(api.paused).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(api.difficulty).toBe('normal');
    expect(api.paused).toBe(false);
    expect(mounts).toBe(1);

    fireEvent.change(picker()!, { target: { value: 'easy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start new game' }));
    expect(api.difficulty).toBe('easy');
    expect(api.paused).toBe(false);
    await waitFor(() => expect(mounts).toBe(2));
  });

  it('is hidden for games with their own picker or no difficulty levels', async () => {
    await mount({ ...game, difficultyPicker: 'in-game' });
    expect(picker()).not.toBeInTheDocument();
    cleanup();
    await mount({ ...game, difficultyPicker: 'none' });
    expect(picker()).not.toBeInTheDocument();
  });
});

describe('GameShell full-screen play', () => {
  const expandButton = () => screen.getByRole('button', { name: 'Play full screen' });
  const shellEl = (view: ReturnType<typeof render>) =>
    view.container.querySelector('.game-shell') as HTMLElement;

  afterEach(() => {
    delete (Element.prototype as Partial<Element>).requestFullscreen;
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: undefined });
    window.history.replaceState(null, '');
  });

  it('offers full screen even where the Fullscreen API is missing (iPhone)', async () => {
    const view = await mount();
    act(() => fireEvent.click(expandButton()));
    expect(shellEl(view)).toHaveClass('expanded');
    expect(document.documentElement).toHaveClass('game-expanded');
    expect(api.isFullscreen).toBe(true);
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toHaveAttribute('aria-pressed', 'true');

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' })));
    expect(shellEl(view)).not.toHaveClass('expanded');
    expect(document.documentElement).not.toHaveClass('game-expanded');
  });

  it('also requests browser fullscreen where it is available', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    (Element.prototype as Partial<Element>).requestFullscreen = request;
    const view = await mount();
    act(() => fireEvent.click(expandButton()));
    expect(request).toHaveBeenCalledWith({ navigationUI: 'hide' });
    expect(request.mock.contexts[0]).toBe(shellEl(view));
  });

  it('exits with Escape, the F key and the browser Back button', async () => {
    const view = await mount();
    act(() => fireEvent.keyDown(window, { key: 'f' }));
    expect(shellEl(view)).toHaveClass('expanded');
    act(() => fireEvent.keyDown(window, { key: 'Escape' }));
    expect(shellEl(view)).not.toHaveClass('expanded');

    act(() => fireEvent.click(expandButton()));
    act(() => fireEvent.keyDown(window, { key: 'F' }));
    expect(shellEl(view)).not.toHaveClass('expanded');

    act(() => fireEvent.click(expandButton()));
    // Back pops the history entry that expanded play pushed.
    act(() => {
      window.history.replaceState(null, '');
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });
    expect(shellEl(view)).not.toHaveClass('expanded');
  });

  it('restores the page when the game is left while expanded', async () => {
    const view = await mount();
    act(() => fireEvent.click(expandButton()));
    view.unmount();
    expect(document.documentElement).not.toHaveClass('game-expanded');
  });

  it('shows how to play inside full screen and pauses meanwhile', async () => {
    await mount(helpGame);
    act(() => api.startRound());
    act(() => fireEvent.click(expandButton()));
    act(() => fireEvent.click(screen.getByRole('link', { name: 'How to play' })));

    const dialog = screen.getByRole('dialog', { name: 'How to play' });
    expect(dialog).toHaveTextContent('Win the board.');
    expect(dialog).toHaveTextContent('Line up three marks.');
    expect(dialog).toHaveTextContent('Tap a square');
    expect(dialog).toHaveTextContent('Arrow keys move');
    expect(api.paused).toBe(true);
    // The help replaces the pause card rather than stacking on it.
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Back to the game' })));
    expect(screen.queryByRole('dialog', { name: 'How to play' })).not.toBeInTheDocument();
    expect(api.paused).toBe(false);
  });

  it('opens games full screen when the player prefers it', async () => {
    preferFullscreen = true;
    const view = await mount();
    expect(shellEl(view)).toHaveClass('expanded');
  });
});
