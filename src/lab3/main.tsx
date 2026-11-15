import React from 'react';
import {createRoot} from 'react-dom/client';
import NavalAiLabApp from './App';
import './styles.css';

const root=document.getElementById('root');
if(!root)throw Error('Naval AI Lab application root not found');
createRoot(root).render(<React.StrictMode><NavalAiLabApp/></React.StrictMode>);
