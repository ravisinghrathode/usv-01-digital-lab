import React from 'react';

/**
 * Only the ungoverned Engineering Sessions presentation is recovered here.
 * Links retain all original staff authentication and engineering approval gates.
 */
export function StartupRecovery() {
  return <main role="alert" style={{fontFamily:'system-ui, sans-serif',maxWidth:720,margin:'9vh auto',padding:'2rem',color:'#183242',lineHeight:1.6}}>
    <p style={{fontSize:13,fontWeight:700,letterSpacing:'.09em'}}>NAVAL AI LAB / RECOVERY</p>
    <h1 style={{fontSize:'clamp(1.5rem,4vw,2.4rem)',lineHeight:1.2}}>Engineering Sessions could not open.</h1>
    <p>The new interface encountered a startup error. You can still attempt to access the preserved engineering workbench or previous studio. Neither link bypasses authentication or approval controls.</p>
    <p><a href="/legacy.html" style={{fontWeight:700,color:'#066b78'}}>Open original engineering lab</a> · <a href="/dockyard2.html" style={{color:'#066b78'}}>Open previous design studio</a></p>
    <p style={{fontSize:14}}>If these also fail, check the host's deployment and application logs. No engineering approval is implied by this recovery screen.</p>
  </main>;
}

type BoundaryProps = {children:React.ReactNode};
type BoundaryState = {failed:boolean};

export class StartupBoundary extends React.Component<BoundaryProps,BoundaryState> {
  state:BoundaryState={failed:false};
  static getDerivedStateFromError(_error:unknown):BoundaryState {return {failed:true};}
  componentDidCatch(error:unknown,info:React.ErrorInfo) {
    console.error('[Naval AI Lab] Engineering Sessions render failure',error,info.componentStack);
  }
  render(){return this.state.failed?<StartupRecovery/>:this.props.children;}
}
