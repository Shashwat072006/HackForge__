// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function prepareApp() {
  const useRealBackend = import.meta.env.VITE_USE_REAL_BACKEND === 'true';
  if (!useRealBackend) {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
      });
      console.log('✅ MSW Mock Service Worker active (Mock Mode)');
    } catch (e) {
      console.warn('MSW could not start:', e);
    }
  } else {
    console.log('⚡ Connected directly to Spring Boot backend:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api');
  }
}

prepareApp().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
