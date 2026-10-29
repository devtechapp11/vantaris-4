import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are self-hosted (no third-party requests). Inter's optical-size axis
// gives headlines the tighter "Display" cut automatically. Only the subsets a
// page actually uses are downloaded (unicode-range); the latin files are
// preloaded from index.html by the plugin in vite.config.js.
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/shell.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
