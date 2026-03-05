import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';              // initialise i18next (side-effect import)
import i18n from './i18n';
import { useAppStore } from './store';

// Apply persisted locale before first render so there's no flash of wrong language
const savedLocale = useAppStore.getState().locale;
if (savedLocale && savedLocale !== i18n.language) {
  i18n.changeLanguage(savedLocale);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

const hideStartupSplash = () => {
  const splash = document.getElementById('startup-splash');
  if (!splash) {
    return;
  }
  splash.classList.add('fade-out');
  window.setTimeout(() => splash.remove(), 260);
};

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(hideStartupSplash);
});
