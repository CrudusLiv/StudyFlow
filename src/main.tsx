import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  throw new Error('Missing VITE_GOOGLE_CLIENT_ID environment variable');
}

// Create root first
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// Wrap render in try-catch
try {
  root.render(
    <React.StrictMode>
      <GoogleOAuthProvider 
        clientId={GOOGLE_CLIENT_ID}
        onScriptLoadSuccess={() => console.log('Google script loaded successfully')}
        onScriptLoadError={() => console.error('Google script load error - check CSP and network')}
      >
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error rendering app:', error);
  // Render error fallback
  root.render(
    <div>
      <h1>Failed to load application</h1>
      <p>Please refresh the page or try again later.</p>
    </div>
  );
}
