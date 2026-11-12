'use client';
import {useState} from 'react';
import {LockKeyhole} from 'lucide-react';
import type {EditAccess} from '../hooks/use-edit-access';
export default function TransmittalAccess({access,loaded,onUnlock,onLogin}:{access:EditAccess;loaded:boolean;onUnlock:()=>Promise<void>;onLogin:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function retry(){if(busy)return;setBusy(true);setError('');try{await onUnlock()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="transmittal-access panel screen" aria-labelledby="transmittal-access-title"><div className="access-lock"><LockKeyhole size={30}/></div><h2 id="transmittal-access-title">{access.role==='admin'?'Open transmittal':'Admin access required'}</h2>{!loaded?<><p>Access could not be confirmed yet.</p><button className="secondary" disabled={busy} onClick={()=>void retry()}>Retry</button></>:access.canViewTransmittal?<><p>Load your Municipal and Aranda transmittal records.</p><button className="primary" disabled={busy} onClick={()=>void retry()}>{busy?'Opening…':'Open transmittal'}</button></>:<><p>Guests cannot open transmittals or transfer data. Log in as Admin to continue.</p><button className="primary" onClick={onLogin}>Log in as Admin</button></>}{error&&<p className="error-text" role="alert">{error}</p>}</section>;
}
