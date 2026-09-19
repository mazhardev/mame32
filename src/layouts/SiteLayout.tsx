import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ConsentBanner } from '@/components/ConsentBanner';
import { SearchBox } from '@/components/SearchBox';
import { site } from '@/config/site';
import { getProfile, subscribe } from '@/storage/StorageService';
import { formatNumber } from '@/utils/format';
import { TOTAL_PLAYABLE } from '@/data/gameCatalog';

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
          </div>
          <nav className="footer-links" aria-label="Footer">
            <Link to="/games/">All Games</Link>
            <Link to="/favorites/">Favorites</Link>
            <Link to="/statistics/">Statistics</Link>
            <Link to="/settings/">Settings</Link>
            <Link to="/privacy/">Privacy</Link>
            <Link to="/about/">About</Link>
          </nav>
        </div>
      </footer>
      <ConsentBanner />
    </div>
  );
}
