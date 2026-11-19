'use client';
import {useRef,useState} from 'react';
import {Upload} from 'lucide-react';
import {Dialog,DialogContent,DialogFooter,DialogHeader,DialogTitle} from './ui/dialog';
import {cemeteryApi} from '../lib/cemetery-api';
import {planImport,importToken,type ImportPlan} from '../lib/transmittal-import';
import type {RecordRow} from '../lib/model';

// Import CSV: adds rows from an exported transmittal file. Rows already in the transmittal are skipped.
export default function TransmittalImport({sheet,records,disabled,onDone}:{sheet:string;records:RecordRow[];disabled:boolean;onDone:(message:string)=>Promise<void>|void}){
 const input=useRef<HTMLInputElement>(null);
 const [plan,setPlan]=useState<ImportPlan|null>(null),[fileName,setFileName]=useState(''),[error,setError]=useState(''),[progress,setProgress]=useState<number|null>(null);
 const label=sheet==='transmital Aranda'?'Aranda':'Municipal';
 async function choose(file:File|undefined){
  if(!file)return;setError('');setPlan(null);setFileName(file.name);
  try{if(file.size>5_000_000)throw Error('This file is too large for a transmittal.');setPlan(planImport(await file.text(),sheet,records))}catch(e){setError((e as Error).message);setPlan({rows:[],duplicates:0,errors:[]})}
  if(input.current)input.current.value='';
 }
 async function run(){
  if(!plan||progress!==null)return;
  let added=0,already=0;setProgress(0);setError('');
  try{
   for(const values of plan.rows){
    const result=await cemeteryApi<{duplicate?:boolean}>({action:'insertRecord',sheet,values,token:await importToken(sheet,values)});
    if(result.duplicate)already++;else added++;
    setProgress(added+already);
   }
   setPlan(null);
   await onDone(`${added} row${added===1?'':'s'} imported into the ${label} transmittal${plan.duplicates+already?` · ${plan.duplicates+already} already there, skipped`:''}.`);
  }catch(e){setError(`Stopped after ${added+already} of ${plan.rows.length} rows: ${(e as Error).message} Import the same file again to continue; saved rows are skipped.`)}
  finally{setProgress(null)}
 }
 const open=plan!==null;
 return <>
  <button type="button" className="secondary" disabled={disabled} title={`Add rows from an exported ${label} transmittal CSV, or from a PC backup (cemetery-backup.json)`} onClick={()=>input.current?.click()}><Upload size={16}/>Import CSV</button>
  <input ref={input} type="file" accept=".csv,text/csv,.json,application/json" hidden onChange={event=>void choose(event.target.files?.[0])}/>
  <Dialog open={open} onOpenChange={value=>{if(!value&&progress===null){setPlan(null);setError('')}}}>
   <DialogContent className="import-modal" aria-describedby="import-summary">
    <DialogHeader><DialogTitle>Import into {label} transmittal</DialogTitle></DialogHeader>
    <div id="import-summary" className="import-summary">
     <p><b>{fileName}</b></p>
     {plan&&<ul>
      <li><strong>{plan.rows.length}</strong> new row{plan.rows.length===1?'':'s'} to add</li>
      <li><strong>{plan.duplicates}</strong> already in this transmittal (skipped)</li>
      {plan.errors.length>0&&<li className="import-errors"><strong>{plan.errors.length}</strong> row{plan.errors.length===1?'':'s'} could not be read: {plan.errors.slice(0,3).map(item=>`line ${item.line} (${item.message})`).join('; ')}{plan.errors.length>3?'…':''}</li>}
     </ul>}
     <small>New rows are numbered after the existing entries. Rows without an O.R. number will show as missing O.R.</small>
     {progress!==null&&<p role="status">Saving {progress} of {plan?.rows.length}…</p>}
     {error&&<p className="error-text" role="alert">{error}</p>}
    </div>
    <DialogFooter>
     <button className="secondary" disabled={progress!==null} onClick={()=>{setPlan(null);setError('')}}>Cancel</button>
     <button className="primary" disabled={progress!==null||!plan?.rows.length} onClick={()=>void run()}><Upload size={15}/>{progress!==null?'Importing…':`Import ${plan?.rows.length??0} row${plan?.rows.length===1?'':'s'}`}</button>
    </DialogFooter>
   </DialogContent>
  </Dialog>
 </>;
}
