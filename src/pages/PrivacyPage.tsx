import { PageMeta } from '@/components/PageMeta';
import { site } from '@/config/site';

export default function PrivacyPage() {
  return (
    <div className="container stack" style={{ maxWidth: 780 }}>
      <PageMeta
        title="Privacy"
        description="How GamesPlayLand handles your data: game progress stays in your browser, with no account and no server. Optional Google Analytics counts visits."
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
            Your game data never does — there is no backend, no account and no game server, and the
            games work offline once loaded.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>Analytics</h2>
          <p className="muted small">
            This site uses Google Analytics to count visits and see which games are played. It
            receives page views and simple game events (which game started or finished, the
            difficulty, score and result), plus the technical details Google Analytics collects
            automatically, such as browser, device type and approximate location. It never receives
            your nickname, saves or other stored data.
          </p>
          <p className="muted small">
            Analytics cookies are only set if you choose <strong>Allow</strong>. Until you choose,
            Google may receive cookieless measurements under its Consent Mode. If you choose{' '}
            <strong>No thanks</strong>, nothing is sent at all. You can change your choice at any
            time in Settings → Privacy. Advertising features are always off. See Google’s privacy
            policy at policies.google.com/privacy.
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
