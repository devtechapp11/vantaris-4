import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are self-hosted (no third-party requests): Archivo and Martian Mono,
// both with their width axis, imported by styles/typography.css. Only the
// subsets a page uses are downloaded (unicode-range); the latin files are
// preloaded by vite.config.js.
import './styles/tokens.css';
import './styles/typography.css';
import './styles/base.css';
import './styles/components.css';
import './styles/shell.css';
import './styles/midas.css';
import App from './App.jsx';
import { installFeel } from './app/feel';

installFeel();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
