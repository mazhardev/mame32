import { useEffect, useMemo, useState } from 'react';
import { PageMeta } from '@/components/PageMeta';
import {
  getAchievementRegistry,
  getAchievementState,
} from '@/achievements/AchievementService';
import { getGame } from '@/data/gameCatalog';
import type { AchievementRecord } from '@/types';
import { formatRelative } from '@/utils/format';
import { subscribe } from '@/storage/StorageService';

type Filter = 'all' | 'unlocked' | 'locked' | 'global' | 'game';

export default function AchievementsPage() {
  const [records, setRecords] = useState<AchievementRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const registry = useMemo(() => getAchievementRegistry(), []);

  useEffect(() => {
    const load = () => void getAchievementState().then(setRecords);
    load();
    return subscribe('achievements', load);
  }, []);

  const unlockedCount = records.filter((r) => r.unlocked).length;
  const percent = records.length ? Math.round((unlockedCount / records.length) * 100) : 0;

  const visible = records.filter((r) => {
    if (filter === 'unlocked') return r.unlocked;
    if (filter === 'locked') return !r.unlocked;
    if (filter === 'global') return r.gameId === null;
    if (filter === 'game') return r.gameId !== null;
    return true;
  });

  const sorted = visible.slice().sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0);
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${records.length})` },
    { key: 'unlocked', label: `Unlocked (${unlockedCount})` },
    { key: 'locked', label: `Locked (${records.length - unlockedCount})` },
    { key: 'global', label: 'Platform' },
    { key: 'game', label: 'Game specific' },
  ];

  return (
    <div className="container stack">
      <PageMeta
        title="Achievements"
        description="Track unlocked and locked achievements across every game, stored locally."
      />
      <div>
        <h1 style={{ fontSize: '1.6rem' }}>Achievements</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          {unlockedCount} of {records.length} unlocked
        </p>
        <div className="progress-track" style={{ marginTop: 10, maxWidth: 420 }}>
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="tiny faint" style={{ marginTop: 4 }}>
          {percent}% complete
        </div>
      </div>

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip${filter === f.key ? ' selected' : ''}`}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sorted.length ? (
        <div className="achievement-grid">
          {sorted.map((rec) => {
            const def = registry.get(rec.achievementId);
            if (!def) return null;
            const game = def.gameId ? getGame(def.gameId) : null;
            const pct = rec.target ? Math.min(100, (rec.progress / rec.target) * 100) : 0;
            return (
              <div
                key={rec.achievementId}
                className={`achievement ${rec.unlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="ach-icon" aria-hidden="true">
                  {rec.unlocked ? (def.icon ?? '🏆') : '🔒'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{def.name}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>
                    {def.description}
                  </div>
                  {game && (
                    <div className="tiny faint" style={{ marginTop: 4 }}>
                      {game.title}
                    </div>
                  )}
                  {rec.unlocked ? (
                    <div className="tiny faint" style={{ marginTop: 6 }}>
                      Unlocked {formatRelative(rec.unlockedAt)}
                      {def.coins ? ` · +${def.coins} coins` : ''}
                    </div>
                  ) : (
                    rec.target > 1 && (
                      <div style={{ marginTop: 8 }}>
                        <div className="progress-track" style={{ height: 6 }}>
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="tiny faint" style={{ marginTop: 3 }}>
                          {rec.progress} / {rec.target}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="emoji">🏆</div>
          <p>No achievements match this filter.</p>
        </div>
      )}
    </div>
  );
}
