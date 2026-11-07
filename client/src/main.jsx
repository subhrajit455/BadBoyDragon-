import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

const isDesktop =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' ||
    /electron/i.test(navigator.userAgent) ||
    Boolean(window.electronAPI?.isElectron));

const RouterComponent = isDesktop ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterComponent>
        <AuthProvider>
          <App />
        </AuthProvider>
      </RouterComponent>
    </QueryClientProvider>
  </React.StrictMode>
);
