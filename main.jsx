import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './public/calm-theme.css';
import './src/ui/modern-ui.css';
import './src/ui/precision-ui.css';

window.__thisPwaInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__thisPwaInstallPrompt = event;
  window.dispatchEvent(new CustomEvent('this-pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  window.__thisPwaInstallPrompt = null;
  window.dispatchEvent(new CustomEvent('this-pwa-installed'));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('THiS CRM service worker registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')).render(<App />);

import './src/ui/checklists.css';
