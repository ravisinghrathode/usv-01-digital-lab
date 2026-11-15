import React from 'react';
import {createRoot} from 'react-dom/client';
import EngineeringSessionsApp from './App';
import './styles.css';

const root=document.getElementById('root');
if(!root)throw Error('Engineering Sessions application root not found.');
createRoot(root).render(<React.StrictMode><EngineeringSessionsApp/></React.StrictMode>);
