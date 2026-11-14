import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './studio/clarity.css';
import { EngineeringContextProvider } from './studio/engineeringContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EngineeringContextProvider><App /></EngineeringContextProvider>
  </React.StrictMode>
);
