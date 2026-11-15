import React from 'react';
import {createRoot} from 'react-dom/client';
import EngineeringSessionsApp from './App';
import {legacyRootRedirect} from '../dockyard2/domain';
import './styles.css';
import './fidelity.css';
import './v2/design.css';

const root=document.getElementById('root');
if(!root)throw Error('Engineering Sessions application root not found.');
const legacy=legacyRootRedirect(window.location.search);
if(legacy)window.location.replace(legacy);
else createRoot(root).render(<React.StrictMode><EngineeringSessionsApp/></React.StrictMode>);
