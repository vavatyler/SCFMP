import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CooperativeProvider } from './context/CooperativeContext.jsx';
import './index.css';
import './i18n.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CooperativeProvider>
          <App />
        </CooperativeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
