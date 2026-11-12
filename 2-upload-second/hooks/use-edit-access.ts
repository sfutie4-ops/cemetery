'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
export type EditAccess={role:'guest'|'admin';username:string|null;clerkName:string|null;canEdit:boolean;canViewTransmittal:boolean};
export function useEditAccess(){
 const [access,setAccess]=useState<EditAccess>({role:'guest',username:null,clerkName:null,canEdit:true,canViewTransmittal:false});
 const [loaded,setLoaded]=useState(false);
 const generation=useRef(0);
 const refresh=useCallback(async(strict=false)=>{
  const request=++generation.current;
  try{const response=await fetch('/api/settings',{cache:'no-store',signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error('Access could not be checked. Please retry.');const next=await response.json() as EditAccess;if(request===generation.current){setAccess(next);setLoaded(true)}return next}catch(e){if(strict)throw e;return undefined}
 },[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},30000);const focus=()=>{void refresh()};window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus)}},[refresh]);
 return {access,accessLoaded:loaded,refreshAccess:refresh};
}
