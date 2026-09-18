import { lazy, useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameShell } from './GameShell';
import { useGameShell } from '@/game-engine/context';
import type { GameShellApi } from '@/game-engine/context';
import type { GameDefinition } from '@/types';
import { addPlayTime, getGameSettings, getBestHighScore, recordGameComplete, recordGameStart } from '@/storage/StorageService';

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
    usePreferences: () => [{ difficulty: 'normal', sound: false }, vi.fn()],
    useFullscreen: () => ({ isFullscreen: false, toggle: vi.fn(), supported: false }),
  };
});
vi.mock('@/services/audio', () => ({ playSound: vi.fn(), unlockAudio: vi.fn(), vibrate: vi.fn() }));
vi.mock('@/achievements/AchievementService', () => ({
  evaluateGlobalAchievements: vi.fn().mockResolvedValue(undefined),
  reportHighScoreBeaten: vi.fn(),
}));
vi.mock('@/services/dailyChallenge', () => ({ reportRoundForChallenge: vi.fn().mockResolvedValue(false) }));

let api: GameShellApi;
let disablePause = false;
let renders = 0;
function TestGame() {
  const shell = useGameShell();
  api = shell;
  renders++;
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
  instructions: { howToPlay: [], objective: '' },
  component: lazy(async () => ({ default: TestGame })),
};

async function mount() {
  const view = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><GameShell game={game} /></MemoryRouter>);
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
  renders = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GameShell lifecycle', () => {
  it('settles when a game repeatedly declares unchanged capabilities', async () => {
    disablePause = true;
    await mount();
    expect(screen.queryByRole('button', { name: 'Pause game' })).not.toBeInTheDocument();
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
