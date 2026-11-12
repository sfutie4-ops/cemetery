'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Download,FolderOpen,HardDrive,Pause,Play} from 'lucide-react';
import {backupFiles,folderSetting,writeBackup,type BackupData,type BackupFolder} from '../lib/pc-backup';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from './ui/dialog';

type PickerWindow=Window&{showDirectoryPicker?:(options:{id:string;mode:'readwrite';startIn:'documents'})=>Promise<BackupFolder>};
export default function PcBackup({open,onOpenChange,account,ready,data,busy,onStatus}:{open:boolean;onOpenChange:(open:boolean)=>void;account:string|null;ready:boolean;data:BackupData;busy:boolean;onStatus:(status:string)=>void}){
 const [folder,setFolder]=useState<BackupFolder|null>(null),[enabled,setEnabled]=useState(false),[supported,setSupported]=useState(false),[status,setStatus]=useState('Choose a folder once to start automatic PC backups.'),[lastSaved,setLastSaved]=useState(''),[needsPermission,setNeedsPermission]=useState(false);
 const latest=useRef({account,ready,data,busy,enabled,folder});latest.current={account,ready,data,busy,enabled,folder};
 const writing=useRef(false),fingerprint=useRef(''),mounted=useRef(true);
 const serialized=JSON.stringify(data);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{const current=latest.current;if(current.enabled&&current.folder&&current.ready&&(writing.current||JSON.stringify(current.data)!==fingerprint.current)){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[]);
 useEffect(()=>{onStatus(!account?'':!supported?'Download':!folder?'Set up':!enabled?'Paused':needsPermission?'Reconnect':status.includes('failed')?'Failed':status.startsWith('Saving')?'Saving…':lastSaved?'Saved':'Ready')},[account,supported,folder,enabled,needsPermission,status,lastSaved,onStatus]);
 useEffect(()=>{mounted.current=true;setSupported(typeof (window as PickerWindow).showDirectoryPicker==='function'&&window.isSecureContext);return()=>{mounted.current=false}},[]);
 useEffect(()=>{
  let cancelled=false;setFolder(null);setEnabled(false);setLastSaved('');setNeedsPermission(false);fingerprint.current='';
  setStatus('Choose a folder once to start automatic PC backups.');
  if(account)void folderSetting(account).then(async saved=>{
   if(cancelled||!saved)return;const granted=await saved.folder.queryPermission({mode:'readwrite'});if(cancelled)return;
   setFolder(saved.folder);setEnabled(saved.enabled);setNeedsPermission(granted!=='granted');setStatus(!saved.enabled?'Automatic PC backup is paused.':granted==='granted'?'Folder connected. Waiting for records…':'Reconnect your folder to resume automatic PC backups.');
  }).catch(()=>{if(!cancelled)setStatus('Choose your folder to connect. This browser could not remember the previous folder.')});
  return()=>{cancelled=true};
 },[account]);

 const save=useCallback(async(force=false)=>{
  if(writing.current)return;
  const first=latest.current;if(!first.account||!first.ready||first.busy||!first.enabled||!first.folder)return;
  writing.current=true;
  const selected=first.folder,owner=first.account;
  const active=()=>mounted.current&&latest.current.account===owner&&latest.current.folder===selected&&latest.current.enabled&&latest.current.ready;
  try{
   while(active()){
    const current=latest.current,content=JSON.stringify(current.data);if(current.busy||!force&&content===fingerprint.current)break;force=false;
    setStatus('Saving files to your PC…');
    const now=new Date();if(!await writeBackup(selected,owner,backupFiles(current.data,owner,now),active))break;
    if(!active())break;fingerprint.current=content;setLastSaved(now.toISOString());setNeedsPermission(false);setStatus('Automatic PC backup is active.');
   }
  }catch(error){if(active()){setNeedsPermission((error as Error).name==='NotAllowedError');setStatus((error as Error).name==='NotAllowedError'?'Reconnect your folder to resume automatic PC backups.':'PC backup failed. Check the folder and free disk space, then click Save now.')}}
  finally{writing.current=false}
 },[]);
 useEffect(()=>{if(!account||!ready||busy||!enabled||!folder)return;const timer=setTimeout(()=>void save(),1200);return()=>clearTimeout(timer)},[account,ready,busy,enabled,folder,serialized,save]);

 async function connect(change=false){
  if(!account||!ready)return;
  try{
   let next=folder;
   if(!next||change){const picker=(window as PickerWindow).showDirectoryPicker;if(!picker)throw Error('Open the full site in desktop Chrome or Edge to choose a PC folder.');next=await picker.call(window,{id:'hinigaran-cemetery-backup',mode:'readwrite',startIn:'documents'})}
   else if(await next.requestPermission({mode:'readwrite'})!=='granted'){setNeedsPermission(true);setStatus('Folder permission was not granted. Click Reconnect folder to try again.');return}
   if(latest.current.account!==account)return;
   setFolder(next);setEnabled(true);setNeedsPermission(false);fingerprint.current='';setStatus('Folder connected. Automatic saving will start now.');
   try{await folderSetting(account,{folder:next,enabled:true})}catch{setStatus('Folder connected for this visit. Select it again next time; your browser could not remember it.')}
  }catch(error){if((error as Error).name==='AbortError')return;setStatus((error as Error).message||'Unable to open the folder. Open the full site in desktop Chrome or Edge.')}
 }
 async function pause(){if(!account||!folder)return;const next=!enabled;setEnabled(next);setStatus(next?'Automatic PC backup resumed.':'Automatic PC backup is paused. Existing files stay on your PC.');try{await folderSetting(account,{folder,enabled:next})}catch{}}
 function download(){if(!account||!ready)return;const content=backupFiles(data,account)['cemetery-backup.json'],url=URL.createObjectURL(new Blob([content],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Hinigaran-Cemetery-Backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="pc-backup-modal" aria-describedby="pc-backup-help"><DialogHeader><DialogTitle><HardDrive size={20}/>Automatic PC backup</DialogTitle></DialogHeader><p id="pc-backup-help">Choose a folder on your PC. While this site is open, changes automatically update real backup files in that folder.</p><div className="pc-backup-status" role="status"><strong>{status}</strong>{folder&&<span>{folder.name} / Hinigaran-Cemetery-Backups / {account}</span>}{lastSaved&&<span>Last saved on this PC: {new Date(lastSaved).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</span>}</div>{!account?<p>Log in as Admin to back up cemetery details.</p>:<><div className="pc-backup-actions"><button className="primary" disabled={!supported||!ready||busy} onClick={()=>void connect()}><FolderOpen size={16}/>{!folder?'Choose backup folder':needsPermission?'Reconnect folder':enabled?'Reconnect folder':'Resume PC backup'}</button>{folder&&<><button className="secondary" disabled={!ready||busy||needsPermission} onClick={()=>void pause()}>{enabled?<Pause size={15}/>:<Play size={15}/>} {enabled?'Pause':'Resume'}</button><button className="secondary" disabled={!ready||busy||!enabled||needsPermission} onClick={()=>void save(true)}>Save now</button><button className="secondary" disabled={busy} onClick={()=>void connect(true)}>Change folder</button></>}<button className="secondary" disabled={!ready||busy} onClick={download}><Download size={15}/>Download backup once</button></div><p>Includes all five forms, saved transmittal details, mobile numbers and reopened permit edits. The folder contains a complete JSON backup, a dated daily copy and separate Municipal, Aranda and Promissory CSV files.</p><p className="pc-backup-footnote">Your browser may ask you to reconnect the folder after reopening. Check the last saved time before closing the site.{!supported?' Folder saving requires the full site in a supported desktop browser such as Chrome or Edge; use Download backup once on this device.':''}</p></>}</DialogContent></Dialog>;
}
