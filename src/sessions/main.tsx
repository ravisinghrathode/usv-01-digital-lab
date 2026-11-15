import React from 'react';
import {createRoot} from 'react-dom/client';
import {legacyRootRedirect} from '../dockyard2/domain';
import {StartupBoundary,StartupRecovery} from './StartupRecovery';
import './styles.css';
import './fidelity.css';
import './v2/design.css';
import './live.css';

const root=document.getElementById('root');
if(!root)throw Error('Engineering Sessions application root not found.');
const legacy=legacyRootRedirect(window.location.search);
if(legacy)window.location.replace(legacy);
else {
  const appRoot=createRoot(root);
  // Isolate the large session UI from the bootloader. A failed feature chunk
  // must not strand operators on a blank screen or hide the governed lab link.
  void import('./App')
    .then(({default:EngineeringSessionsApp})=>{
      appRoot.render(<React.StrictMode><StartupBoundary><EngineeringSessionsApp/></StartupBoundary></React.StrictMode>);
    })
    .catch(error=>{
      console.error('[Naval AI Lab] Engineering Sessions startup failure',error);
      appRoot.render(<StartupRecovery/>);
    });
}
