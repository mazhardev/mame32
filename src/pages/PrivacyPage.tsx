import { PageMeta } from '@/components/PageMeta';
import { site } from '@/config/site';

export default function PrivacyPage() {
  return (
    <div className="container stack" style={{ maxWidth: 780 }}>
      <PageMeta
        title="Privacy"
        description="How GamesPlayLand stores your data: entirely in your own browser, with no account and no server."
      />
      <h1 style={{ fontSize: '1.6rem' }}>Privacy</h1>

      <div className="card stack" style={{ gap: 'var(--space-4)' }}>
        <p>
          Game progress, scores, achievements and preferences are stored locally in your browser.
          This website does not require an account.
        </p>
        <div>
          <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>What is stored</h2>
          <ul className="muted small">
            <li>Your nickname and local player profile</li>
            <li>High scores, statistics and score history</li>
            <li>Saved game progress and settings</li>
            <li>Achievements, coins and favorites</li>
            <li>Interface preferences such as theme and sound</li>
          </ul>
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>Where it is stored</h2>
          <p className="muted small">
            Small preferences use <code className="mono">localStorage</code>. Larger records use
            IndexedDB in a database named <code className="mono">{site.dbName}</code>. Both live only
            on this device.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>What leaves your browser</h2>
          <p className="muted small">
            Nothing. There is no backend, no analytics and no third-party API. After the site has
            loaded once it works fully offline.
          </p>
        </div>
        <div className="notice notice-warning">
          <strong>Clearing browser or site data will delete your progress</strong> — including
          scores, achievements, coins and preferences. Use Settings → Export Save Data to keep a
          backup file.
        </div>
      </div>
    </div>
  );
}
