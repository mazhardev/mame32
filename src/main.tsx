import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app/App';
import { runMigrations } from './storage/StorageService';
import './styles/global.css';

runMigrations();

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      {/* Hash routing keeps deep links working on any static host with no rewrites. */}
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  );
}
