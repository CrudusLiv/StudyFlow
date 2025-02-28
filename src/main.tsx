import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {GoogleOAuthProvider} from '@react-oauth/google';



ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId='{CLIENT_ID}'>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
