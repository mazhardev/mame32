import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import { runMigrations } from './storage/StorageService';
import './styles/global.css';

// Earlier builds used hash routing (/#/games/snake). Rewrite those links to
// real paths so bookmarks and shared links keep working.
if (window.location.hash.startsWith('#/')) {
  const [path, query] = window.location.hash.slice(1).split('?');
  const slashed = path.endsWith('/') ? path : `${path}/`;
  window.history.replaceState(null, '', query ? `${slashed}?${query}` : slashed);
}

runMigrations();

const container = document.getElementById('root');
if (container) {
  // Replaces the prerendered crawler markup (scripts/prerender.ts) with the app.
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
