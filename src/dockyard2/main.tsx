import React from 'react';
import { createRoot } from 'react-dom/client';
import DockyardApp from './App';
import './dockyard.css';

const root=document.getElementById('root');
if(!root)throw Error('Dockyard 2.0 application root not found.');
createRoot(root).render(<React.StrictMode><DockyardApp/></React.StrictMode>);
