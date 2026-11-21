import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are self-hosted (no third-party requests). Newsreader (optical sizes)
// for headlines, Inter (optical sizing, tabular figures) for everything people
// read, JetBrains Mono for term sheets, formulas and scores. Only the subsets a
// page uses are downloaded (unicode-range); the latin Newsreader and Inter
// files are preloaded from index.html by the plugin in vite.config.js.
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/newsreader/opsz.css';
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
