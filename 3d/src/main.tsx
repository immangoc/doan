import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { saveToken, getToken } from './services/apiClient.ts';
import './i18n';

// ── Token bootstrap (runs before React mounts) ──────────────────────────────
// do-an-full redirects here with ?token=<JWT> in the URL.
// We save it to localStorage and strip it from the URL immediately.
const params = new URLSearchParams(window.location.search);
const urlToken = params.get('token');
if (urlToken) {
  saveToken(urlToken);
  params.delete('token');
  const cleanPath =
    window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
  window.history.replaceState({}, '', cleanPath);
}

// ── Auth guard ──────────────────────────────────────────────────────────────
// If no token found anywhere and we're not already on /unauthorized, go there.
if (!getToken() && !window.location.pathname.startsWith('/unauthorized')) {
  window.location.replace('/unauthorized');
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
