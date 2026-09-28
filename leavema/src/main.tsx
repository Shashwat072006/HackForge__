// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function prepareApp() {
  if (import.meta.env.DEV || !import.meta.env.VITE_USE_REAL_BACKEND) {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
      });
      console.log('✅ MSW Mock Service Worker active');
    } catch (e) {
      console.warn('MSW could not start:', e);
    }
  }
}

prepareApp().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
