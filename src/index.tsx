import React from 'react';

import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from 'react-query';

import { Toaster } from 'react-hot-toast';



import App from './App';

import AppErrorBoundary from './components/AppErrorBoundary/AppErrorBoundary';

import ChunkLoadErrorBoundary from './components/ChunkLoadErrorBoundary/ChunkLoadErrorBoundary';

import { CrmThemeProvider } from './context/CrmThemeProvider';

import { AuthProvider } from './context/AuthProvider';

import { ensureFreshBuild } from './utils/buildVersionCheck';
import { isChunkLoadError } from './utils/lazyWithRetry';

import './index.css';



const queryClient = new QueryClient({

  defaultOptions: {

    queries: {

      refetchOnWindowFocus: false,

      retry: 1,

    },

  },

});



const migrateHashRouteToHistory = () => {

  if (typeof window === 'undefined') {

    return;

  }



  const { hash, pathname, search } = window.location;

  if (hash.startsWith('#/')) {

    const nextPath = hash.slice(1) || '/';

    window.history.replaceState(null, '', `${nextPath}${search}`);

  } else if (hash === '#/' || hash === '#') {

    window.history.replaceState(null, '', `${pathname || '/'}${search}`);

  }

};



migrateHashRouteToHistory();

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason && reason.message ? String(reason.message) : String(reason || '');
    const isChunkLike =
      isChunkLoadError(event.reason) ||
      message.toLowerCase().includes('useauth must be used within an authprovider') ||
      message.toLowerCase().includes("reading 'usecontext'") ||
      message.toLowerCase().includes('minified react error #321') ||
      message.toLowerCase().includes('invalid hook call');
    if (!isChunkLike) {
      return;
    }

    if (sessionStorage.getItem('crm_chunk_reload_once') === '1') {
      return;
    }

    event.preventDefault();
    sessionStorage.setItem('crm_chunk_reload_once', '1');
    const url = new URL(window.location.href);
    url.searchParams.set('_v', String(Date.now()));
    window.location.replace(url.toString());
  });
}

const root = ReactDOM.createRoot(

  document.getElementById('root') as HTMLElement

);



const renderApp = () => {

  root.render(

    <React.StrictMode>

      <AppErrorBoundary>

        <ChunkLoadErrorBoundary>

        <QueryClientProvider client={queryClient}>

          <BrowserRouter

            future={{

              v7_startTransition: true,

              v7_relativeSplatPath: true,

            }}

          >

            <CrmThemeProvider>

              <AuthProvider>

                <App />

                <Toaster

                  position="top-right"

                  toastOptions={{

                    duration: 4000,

                    style: {

                      background: '#363636',

                      color: '#fff',

                    },

                  }}

                />

              </AuthProvider>

            </CrmThemeProvider>

          </BrowserRouter>

        </QueryClientProvider>

        </ChunkLoadErrorBoundary>

      </AppErrorBoundary>

    </React.StrictMode>

  );

};



void ensureFreshBuild().finally(renderApp);

