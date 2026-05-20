import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppProvider from './providers/AppProvider';
import './index.css';
import './i18n';              // initialise i18next (side-effect import)
import i18n from './i18n';
import { useSettingsStore, useSessionStore, useScriptStore } from './store';
import { initStorage } from './store/storage';

async function bootstrap() {
  // Load persisted data from tauri-plugin-store into memory cache
  await initStorage();

  // Manually rehydrate all persisted stores now that storage is ready
  await Promise.all([
    useSessionStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
    useScriptStore.persist.rehydrate(),
  ]);

  // Apply persisted locale before first render so there's no flash of wrong language
  const savedLocale = useSettingsStore.getState().locale;
  if (savedLocale && savedLocale !== i18n.language) {
    i18n.changeLanguage(savedLocale);
  }
  document.documentElement.lang = i18n.language === 'zh-CN' ? 'zh-CN' : 'en';

  // Apply persisted theme before first render so there's no flash of wrong theme
  const savedTheme = useSettingsStore.getState().theme ?? 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>,
  );

  const hideStartupSplash = () => {
    const splash = document.getElementById('startup-splash');
    if (!splash) {
      return;
    }
    const splashAt = (window as Window & { __startupSplashAt?: number }).__startupSplashAt ?? Date.now();
    const minVisibleMs = 900;
    const elapsed = Date.now() - splashAt;
    const waitMs = Math.max(0, minVisibleMs - elapsed);
    window.setTimeout(() => {
      splash.classList.add('fade-out');
      window.setTimeout(() => splash.remove(), 260);
    }, waitMs);
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(hideStartupSplash);
  });
}

bootstrap().catch((err: unknown) => { window.console.error(err); });
