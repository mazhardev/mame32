import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ConsentBanner } from '@/components/ConsentBanner';
import { SearchBox } from '@/components/SearchBox';
import { site } from '@/config/site';
import { getProfile, subscribe } from '@/storage/StorageService';
import { formatNumber } from '@/utils/format';
import { TOTAL_PLAYABLE } from '@/data/gameCatalog';
import { CATEGORIES } from '@/data/categories';
import { FEATURED_TOPICS, getTopic, hubLinkText, type TopicEntry } from '@/data/topicIndex';

const FOOTER_TOPICS = FEATURED_TOPICS.map(getTopic)
  .filter((t): t is TopicEntry => !!t)
  .slice(0, 6);
/** "Brain Games" already ends in "Games". */
const categoryLabel = (name: string) => (/games$/i.test(name) ? name : `${name} Games`);

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/games/', label: 'Games' },
  { to: '/categories/', label: 'Categories' },
  { to: '/achievements/', label: 'Achievements' },
  { to: '/statistics/', label: 'Statistics' },
];

function useCoins() {
  const [coins, setCoins] = useState(() => getProfile().totalCoins);
  useEffect(() => subscribe('profile', () => setCoins(getProfile().totalCoins)), []);
  return coins;
}

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const coins = useCoins();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo" aria-label={`${site.siteName} home`}>
            <span className="logo-mark" aria-hidden="true">
              🕹
            </span>
            <span>{site.siteName}</span>
          </Link>

          <nav className="main-nav" aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <SearchBox />

          <div className="header-actions">
            <span className="coin-pill" title="Local coins — no real-world value">
              <span aria-hidden="true">🪙</span>
              {formatNumber(coins)}
            </span>
            <Link to="/settings/" className="icon-btn" aria-label="Settings">
              ⚙️
            </Link>
            <button
              className="menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-drawer">
          <SearchBox autoFocus onNavigate={() => setMenuOpen(false)} />
          <div style={{ height: 8 }} />
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/favorites/" className="nav-link">
            Favorites
          </NavLink>
          <NavLink to="/settings/" className="nav-link">
            Settings
          </NavLink>
        </div>
      )}

      <main id="main" className="page">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <strong>{site.siteName}</strong>
            <div style={{ marginTop: 4 }}>
              {TOTAL_PLAYABLE} playable games · everything runs in your browser.
            </div>
            <div style={{ marginTop: 4 }}>
              Support:{' '}
              <a href={`mailto:${site.supportEmail}`} className="footer-email">
                {site.supportEmail}
              </a>
            </div>
          </div>
          <nav className="footer-links" aria-label="Game categories">
            {CATEGORIES.map((c) => (
              <Link key={c.id} to={`/categories/${c.slug}/`}>
                {categoryLabel(c.name)}
              </Link>
            ))}
          </nav>
          <nav className="footer-links" aria-label="Popular topics">
            {FOOTER_TOPICS.map((c) => (
              <Link key={c.slug} to={`/collections/${c.slug}/`}>
                {hubLinkText(c.name).replace(/^./, (ch) => ch.toUpperCase())}
              </Link>
            ))}
          </nav>
          <nav className="footer-links" aria-label="Footer">
            <Link to="/games/">All Games</Link>
            <Link to="/collections/2-player-games/">2 Player Games</Link>
            <Link to="/collections/games-against-computer/">Games vs Computer</Link>
            <Link to="/collections/mobile-games/">Mobile Games</Link>
            <Link to="/privacy/">Privacy</Link>
            <Link to="/about/">About</Link>
            <Link to="/contact/">Contact &amp; Support</Link>
          </nav>
        </div>
      </footer>
      <ConsentBanner />
    </div>
  );
}
