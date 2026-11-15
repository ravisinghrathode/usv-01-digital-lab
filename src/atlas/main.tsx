import React from 'react';
import {createRoot} from 'react-dom/client';
import AtlasLab from './App';
import './styles.css';

const root=document.getElementById('root');
if(!root)throw Error('Atlas Lab application root missing.');
createRoot(root).render(<React.StrictMode><AtlasLab/></React.StrictMode>);
