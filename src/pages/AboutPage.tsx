import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/PageMeta';
import { site } from '@/config/site';
import { TOTAL_PLANNED, TOTAL_PLAYABLE } from '@/data/gameCatalog';

export default function AboutPage() {
  return (
    <div className="container stack" style={{ maxWidth: 780 }}>
      <PageMeta title="About" description={site.description} />
      <h1 style={{ fontSize: '1.6rem' }}>About {site.siteName}</h1>

      <div className="card stack" style={{ gap: 'var(--space-4)' }}>
        <p>{site.description}</p>
        <p className="muted small">
          {TOTAL_PLAYABLE} of {TOTAL_PLANNED} catalogued games are playable today. Games still being
          built are listed as <span className="badge badge-planned">Planned</span> so the catalog
          never claims something works when it does not.
        </p>

        <div>
          <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>How it works</h2>
          <ul className="muted small">
            <li>Everything runs in your browser — there is no server, database or account.</li>
            <li>Games are code-split, so opening the home page does not download the whole catalog.</li>
            <li>Once loaded, the site is installable and works offline as a PWA.</li>
            <li>Computer opponents run locally; nothing is sent anywhere.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>Original work</h2>
          <p className="muted small">
            Some games take inspiration from classic arcade mechanics, but all names, graphics,
            sounds and level layouts here are original. No copyrighted assets or branding are used.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>Coins</h2>
          <p className="muted small">
            Coins are a local reward for playing. They have no real-world value, cannot be bought,
            and never leave your device. Casino-style games are simulations that use virtual points
            only.
          </p>
        </div>

        <div className="row wrap">
          <Link className="btn btn-primary" to="/games">
            Browse games
          </Link>
          <Link className="btn" to="/privacy">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
