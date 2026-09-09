import { useEffect, useRef, useState } from 'react';
import { PageMeta } from '@/components/PageMeta';
import { usePreferences } from '@/hooks/usePlatform';
import {
  exportData,
  getProfile,
  importData,
  resetAchievements,
  resetEverything,
  resetGameData,
  resetProgress,
  resetScores,
  setNickname,
  storageAvailable,
} from '@/storage/StorageService';
import { invalidateAchievementCache } from '@/achievements/AchievementService';
import { getPlayableGames } from '@/data/gameCatalog';
import { playSound, unlockAudio } from '@/services/audio';
import { useToast } from '@/app/ToastProvider';
import { sanitizeNickname } from '@/utils/format';
import type { DifficultySetting } from '@/types';

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = usePreferences();
  const [nickname, setNick] = useState(() => getProfile().nickname);
  const [resetGameId, setResetGameId] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const dbState = storageAvailable();
  const games = getPlayableGames();

  useEffect(() => {
    const id = window.setTimeout(() => {
      const clean = sanitizeNickname(nickname);
      if (clean && clean !== getProfile().nickname) setNickname(clean);
    }, 500);
    return () => window.clearTimeout(id);
  }, [nickname]);

  const confirmAnd = async (message: string, fn: () => Promise<void>, done: string) => {
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      await fn();
      invalidateAchievementCache();
      toast.push({ icon: '🧹', title: done });
    } finally {
      setBusy(false);
    }
  };

  const doExport = async () => {
    const bundle = await exportData();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `browser-arcade-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.push({ icon: '💾', title: 'Save data exported' });
  };

  const doImport = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.push({ icon: '⚠️', title: 'Import failed', body: 'That file is not valid JSON.' });
        return;
      }
      const result = await importData(parsed);
      invalidateAchievementCache();
      if (result.ok) {
        toast.push({
          icon: '✅',
          title: 'Save data imported',
          body: 'Your scores, progress and settings have been restored.',
        });
      } else {
        toast.push({ icon: '⚠️', title: 'Import failed', body: result.error });
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="container stack" style={{ maxWidth: 780 }}>
      <PageMeta title="Settings" description="Sound, theme, accessibility and local data controls." />
      <div>
        <h1 style={{ fontSize: '1.6rem' }}>Settings</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          Preferences are stored in this browser.
        </p>
      </div>

      {!dbState.available && (
        <div className="notice notice-warning">
          <strong>Limited storage.</strong> {dbState.error} Scores and progress will not be saved in
          this browser session.
        </div>
      )}

      <section className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-2)' }}>Player</h2>
        <div className="settings-row">
          <div>
            <div className="label">Nickname</div>
            <div className="desc">Shown on your local profile. No account required.</div>
          </div>
          <input
            className="input"
            style={{ maxWidth: 200 }}
            value={nickname}
            maxLength={20}
            aria-label="Nickname"
            onChange={(e) => setNick(e.target.value)}
          />
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-2)' }}>Audio</h2>
        <div className="settings-row">
          <div>
            <div className="label">Sound effects</div>
            <div className="desc">Generated in the browser with the Web Audio API.</div>
          </div>
          <Toggle
            label="Sound effects"
            checked={prefs.sound}
            onChange={(v) => {
              setPrefs({ sound: v });
              if (v) {
                unlockAudio();
                playSound('select');
              }
            }}
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Background music</div>
            <div className="desc">Ambient loops in games that provide them.</div>
          </div>
          <Toggle label="Music" checked={prefs.music} onChange={(v) => setPrefs({ music: v })} />
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Volume</div>
            <div className="desc">{Math.round(prefs.volume * 100)}%</div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={prefs.volume}
            aria-label="Volume"
            style={{ maxWidth: 180 }}
            onChange={(e) => setPrefs({ volume: Number(e.target.value) })}
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Vibration</div>
            <div className="desc">Haptic feedback on supported mobile devices.</div>
          </div>
          <Toggle
            label="Vibration"
            checked={prefs.vibration}
            onChange={(v) => setPrefs({ vibration: v })}
          />
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-2)' }}>Gameplay</h2>
        <div className="settings-row">
          <div>
            <div className="label">Default difficulty</div>
            <div className="desc">Used when a game is opened for the first time.</div>
          </div>
          <select
            className="select"
            style={{ maxWidth: 160 }}
            value={prefs.difficulty}
            aria-label="Default difficulty"
            onChange={(e) => setPrefs({ difficulty: e.target.value as DifficultySetting })}
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Prefer fullscreen</div>
            <div className="desc">Ask for fullscreen automatically on canvas games.</div>
          </div>
          <Toggle
            label="Prefer fullscreen"
            checked={prefs.preferFullscreen}
            onChange={(v) => setPrefs({ preferFullscreen: v })}
          />
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-2)' }}>Appearance</h2>
        <div className="settings-row">
          <div>
            <div className="label">Theme</div>
            <div className="desc">System follows your operating system setting.</div>
          </div>
          <div className="chip-row">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                className={`chip${prefs.theme === t ? ' selected' : ''}`}
                onClick={() => setPrefs({ theme: t })}
                aria-pressed={prefs.theme === t}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Reduced motion</div>
            <div className="desc">Minimises animations and transitions site-wide.</div>
          </div>
          <Toggle
            label="Reduced motion"
            checked={prefs.reducedMotion}
            onChange={(v) => setPrefs({ reducedMotion: v })}
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Show FPS</div>
            <div className="desc">Developer overlay on canvas games.</div>
          </div>
          <Toggle label="Show FPS" checked={prefs.showFps} onChange={(v) => setPrefs({ showFps: v })} />
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-2)' }}>Save data</h2>
        <div className="notice notice-warning" style={{ marginBottom: 'var(--space-3)' }}>
          Clearing your browser or site storage removes scores, progress, achievements, coins and
          preferences. Export a backup first.
        </div>
        <div className="row wrap">
          <button className="btn" onClick={doExport} disabled={busy}>
            💾 Export save data
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            📥 Import save data
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void doImport(file);
            }}
          />
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-2)' }}>Reset</h2>
        <div className="settings-row">
          <div>
            <div className="label">Reset one game</div>
            <div className="desc">Clears scores, statistics and saved progress for that game.</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <select
              className="select"
              style={{ maxWidth: 190 }}
              value={resetGameId}
              aria-label="Game to reset"
              onChange={(e) => setResetGameId(e.target.value)}
            >
              <option value="">Choose a game…</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
            <button
              className="btn btn-danger"
              disabled={!resetGameId || busy}
              onClick={() =>
                confirmAnd(
                  'Reset all saved data for this game? This cannot be undone.',
                  () => resetGameData(resetGameId),
                  'Game data reset',
                )
              }
            >
              Reset
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Reset achievements</div>
            <div className="desc">Locks every achievement again. Coins are kept.</div>
          </div>
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() =>
              confirmAnd(
                'Reset all achievements? This cannot be undone.',
                resetAchievements,
                'Achievements reset',
              )
            }
          >
            Reset
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Reset scores</div>
            <div className="desc">Clears every high score and score history entry.</div>
          </div>
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() =>
              confirmAnd('Reset all high scores? This cannot be undone.', resetScores, 'Scores reset')
            }
          >
            Reset
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Reset progress</div>
            <div className="desc">Removes saved games and in-progress levels.</div>
          </div>
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() =>
              confirmAnd(
                'Delete all saved game progress? This cannot be undone.',
                resetProgress,
                'Progress reset',
              )
            }
          >
            Reset
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="label">Reset everything</div>
            <div className="desc">Deletes all local data and returns the site to a fresh state.</div>
          </div>
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() =>
              confirmAnd(
                'Delete ALL local data — profile, scores, achievements, coins and settings? This cannot be undone.',
                resetEverything,
                'All data reset',
              )
            }
          >
            Reset all
          </button>
        </div>
      </section>
    </div>
  );
}
