import React from 'react';
import { createRoot } from 'react-dom/client';
import NavalDesignStudioApp from './App';
import './dockyard.css';

const root=document.getElementById('root');
if(!root)throw Error('Naval Design Studio application root not found.');
createRoot(root).render(<React.StrictMode><NavalDesignStudioApp/></React.StrictMode>);
