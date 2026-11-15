import { useEffect, useState } from 'react';
import type { ApproverIdentity } from '../core/types/safety';
import { authenticatedFetch, getCurrentUser, subscribeAuthState, validateSession } from '../core/auth/authClient';
import { illustrativeSnapshot, parseServerSnapshot, type Snapshot } from './domain';

export type SnapshotStatus='illustrative'|'loading'|'connected'|'unavailable';
export function useSnapshot() {
  const [snapshot,setSnapshot]=useState<Snapshot>(illustrativeSnapshot);
  const [status,setStatus]=useState<SnapshotStatus>('illustrative');
  const [user,setUser]=useState<ApproverIdentity|null>(getCurrentUser);
  const [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true,rev=0;
    const unsubscribe=subscribeAuthState(next=>{
      const version=++rev;
      if(!mounted)return;
      setUser(next);
      if(!next){setSnapshot(illustrativeSnapshot);setStatus('illustrative');setError('');return;}
      setStatus('loading');setError('');
      authenticatedFetch('/api/data/snapshot')
        .then(async res=>{
          if(!res.ok)throw Error('Engineering snapshot unavailable (HTTP '+res.status+').');
          return parseServerSnapshot(await res.json());
        })
        .then(data=>{if(mounted&&rev===version){setSnapshot(data);setStatus('connected');}})
        .catch(err=>{
          if(mounted&&rev===version){
            // A failure must not make illustrative seed records appear authoritative.
            setSnapshot(illustrativeSnapshot);setStatus('unavailable');
            setError(err instanceof Error?err.message:'Unable to load current engineering records.');
          }
        });
    });
    void validateSession().catch(()=>{});
    return()=>{mounted=false;rev++;unsubscribe();};
  },[]);
  return {snapshot,status,user,error};
}
