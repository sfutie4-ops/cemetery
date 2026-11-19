'use client';
import {useState} from 'react';
import {Landmark,LogIn,UserRound} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from './ui/dialog';

export default function AccessChoice({open,canClose,onClose,onAdmin,onGuest}:{open:boolean;canClose:boolean;onClose:()=>void;onAdmin:()=>Promise<void>;onGuest:()=>Promise<void>}){
 const [admin,setAdmin]=useState(false),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function enter(asAdmin:boolean){
  if(busy)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/settings',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify(asAdmin?{action:'login',username,password}:{action:'guest'})});
   const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error??'Unable to continue. Please retry.');
   if(asAdmin)await onAdmin();else await onGuest();
   setPassword('');setUsername('');setAdmin(false);
  }catch(e){setError((e as Error).name==='TimeoutError'?'The connection timed out. Please retry.':(e as Error).message)}finally{setBusy(false)}
 }
 return <Dialog open={open} onOpenChange={value=>{if(!value&&canClose&&!busy){setPassword('');setError('');onClose()}}}><DialogContent className="access-choice" overlayClassName="access-backdrop" showCloseButton={canClose&&!busy} aria-describedby="access-choice-description" onEscapeKeyDown={event=>{if(!canClose||busy)event.preventDefault()}} onPointerDownOutside={event=>{if(!canClose||busy)event.preventDefault()}}><div className="access-motion" aria-hidden="true"><span/><span/></div><div className="access-lock"><Landmark size={30}/></div><DialogHeader><DialogTitle>{admin?'Admin login':'Choose your access'}</DialogTitle></DialogHeader><p id="access-choice-description">Municipal Cemetery · Hinigaran<br/>{admin?'Enter your username and password to continue.':'Continue as Guest or log in for full Admin access.'}</p><div className="access-options"><button type="button" className="secondary" disabled={busy} onClick={()=>void enter(false)}><UserRound size={21}/><strong>Continue as Guest</strong><span>Forms, live previews and printing. No transmittals or transfers.</span></button><button type="button" className="primary" disabled={busy} aria-pressed={admin} onClick={()=>{setAdmin(true);setError('')}}><LogIn size={21}/><strong>Log in as Admin</strong><span>Full access to forms and transmittals.</span></button></div>{admin&&<form onSubmit={event=>{event.preventDefault();void enter(true)}}><label className="field"><span>Username</span><input autoFocus name="username" autoComplete="username" maxLength={40} required disabled={busy} value={username} onChange={event=>setUsername(event.target.value)}/></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} value={password} onChange={event=>setPassword(event.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Signing in…':'Log in'}<LogIn size={16}/></button></form>}{busy&&!admin&&<p role="status">Opening Guest access…</p>}{error&&<p className="error-text" role="alert">{error}</p>}</DialogContent></Dialog>;
}
