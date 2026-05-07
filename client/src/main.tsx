/**
 * Main entry point for React app
 * TODO: Setup React root, render App component
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
