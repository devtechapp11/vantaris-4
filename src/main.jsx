import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are self-hosted (no third-party requests). Space Grotesk for display
// and headings, Inter for everything people read, JetBrains Mono for every
// figure. Only the subsets a page uses are downloaded (unicode-range); the
// latin Space Grotesk and Inter files are preloaded by vite.config.js.
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/space-grotesk/wght.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/shell.css';
import App from './App.jsx';
import { installFeel } from './app/feel';

installFeel();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
