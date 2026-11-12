'use client';
import {Fragment,useEffect,useRef,useState,type KeyboardEvent,type ClipboardEvent,type ReactNode} from 'react';
import {cleanText,dateInput,dateText,money,recordMobile,type RecordRow} from '../lib/model';
import {amountColumn,cellValue,dateColumn,pasteRows} from '../lib/sheet-edit';
import {isNewRow,newTransmittalRow,numberRows,transmittalKind} from '../lib/transmittal';
import MobileContact from './mobile-contact';
import TransmittalTotals from './transmittal-totals';
import {missingReceiptText} from '../lib/receipt-reminders';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from './ui/dialog';
import {Plus,ReceiptText,Trash2} from 'lucide-react';

type Position={id:string;column:number};
export default function TransmittalSheet({rows,headers,disabled,onSave,onDirty,actions,sheet,date,onInsert}:{rows:RecordRow[];headers:string[];disabled:boolean;onSave:(row:RecordRow)=>Promise<RecordRow|false>;onDirty:(dirty:boolean)=>void;actions:(row:RecordRow)=>ReactNode;sheet:string;date:string;onInsert:()=>void}){
 const [drafts,setDrafts]=useState<Record<string,RecordRow>>({}),[active,setActive]=useState<Position|null>(null),[entry,setEntry]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const [discarding,setDiscarding]=useState<RecordRow|null>(null);
 const cells=useRef<HTMLDivElement>(null),pending=useRef(drafts),editing=useRef(active),saveInFlight=useRef(false);
 pending.current=drafts;editing.current=active;
 const changed=Object.keys(drafts).length,dirty=changed>0||!!active;
 useEffect(()=>{onDirty(dirty)},[dirty,onDirty]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(Object.keys(pending.current).length||editing.current){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[]);
 const shown=numberRows([...rows.map(row=>drafts[row.id]??row),...Object.values(drafts).filter(row=>isNewRow(row))]);
 function insert(){if(disabled||saving)return;if(active){const row=shown.find(row=>row.id===active.id);if(row&&!commit(row,active.column))return}onInsert();const row=newTransmittalRow(sheet,date);setDrafts(old=>({...old,[row.id]:row}));setActive({id:row.id,column:1});setEntry('');setError('')}
 function stage(row:RecordRow,column:number,value:string){
  try{const next=cellValue(value,column);setDrafts(old=>{const current=old[row.id]??row;const values=[...current.values];values[column]=next;return {...old,[row.id]:{...current,values}}});setError('');return true}catch(e){setError((e as Error).message);return false}
 }
 function focus(id:string,column:number){requestAnimationFrame(()=>cells.current?.querySelector<HTMLElement>(`[data-row="${id}"][data-column="${column}"]`)?.focus())}
 function start(row:RecordRow,column:number){if(disabled||saving||column===0)return;if(active&&active.id===row.id&&active.column===column)return;setActive({id:row.id,column});setEntry(dateColumn(column)?dateInput(row.values[column]):cleanText(row.values[column]));setError('')}
 function move(id:string,column:number,key:string,shift=false){
  let row=shown.findIndex(item=>item.id===id),col=column;
  if(key==='ArrowUp'||key==='Enter')row+=key==='ArrowUp'||shift?-1:1;
  else if(key==='ArrowDown')row++;
  else if(key==='ArrowLeft')col--;else if(key==='ArrowRight')col++;
  else if(key==='Tab'){col+=shift?-1:1;if(col>19){col=1;row++}if(col<1){col=19;row--}}
  if(row>=0&&row<shown.length&&col>=1&&col<=19)focus(shown[row].id,col);
 }
 function commit(row:RecordRow,column:number){if(!stage(row,column,entry))return false;setActive(null);return true}
 function editKey(event:KeyboardEvent<HTMLInputElement|HTMLSelectElement>,row:RecordRow,column:number){if(event.key==='Escape'){event.preventDefault();setActive(null);focus(row.id,column)}else if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();if(commit(row,column))move(row.id,column,event.key,event.shiftKey)}}
 function keyDown(event:KeyboardEvent<HTMLTableCellElement>,row:RecordRow,column:number){
  if(event.target!==event.currentTarget||column===0)return;
  if(event.key==='Enter'||event.key==='F2'){event.preventDefault();start(row,column)}
  else if(event.key.startsWith('Arrow')||event.key==='Tab'){event.preventDefault();move(row.id,column,event.key,event.shiftKey)}
  else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();if(!disabled&&!saving)stage(row,column,'')}
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();start(row,column);setEntry(event.key)}
 }
 function paste(event:ClipboardEvent,row:RecordRow,column:number){
  const text=event.clipboardData.getData('text/plain');
  if(active&&!/[\t\r\n]/.test(text))return;
  event.preventDefault();if(disabled||saving)return;
  try{const updates=pasteRows(shown,shown.findIndex(item=>item.id===row.id),column,text);setDrafts(old=>({...old,...Object.fromEntries(updates.map(item=>[item.id,item]))}));setActive(null);setError('')}
  catch(e){setError((e as Error).message)}
 }
 async function save(){
  if(saveInFlight.current)return;
  let changes={...pending.current};
  if(active){const row=shown.find(row=>row.id===active.id);if(!row)return;try{const values=[...row.values];values[active.column]=cellValue(entry,active.column);changes[row.id]={...row,values};setDrafts(changes);setActive(null)}catch(e){setError((e as Error).message);return}}
  saveInFlight.current=true;setSaving(true);setError('');
  try{
   for(const draft of Object.values(changes)){
    const result=await onSave(draft);
    if(!result){setError('Saving stopped. Unsaved cells are kept here. Review the message above before retrying.');return}
    setDrafts(old=>{const next={...old};delete next[draft.id];return next});
   }
  }finally{saveInFlight.current=false;setSaving(false)}
 }
 return <div className="sheet-editor screen"><div className="sheet-toolbar"><span>{saving?'Saving…':changed?`${changed} row${changed===1?'':'s'} changed`:'Click a cell to edit · Tab / Enter to move · Paste cells from Excel'}</span><button className="secondary" disabled={disabled||saving} onClick={insert}><Plus size={14}/>Insert row</button><button className="secondary" disabled={saving||!dirty} onClick={()=>{setDrafts({});setActive(null);setError('')}}>Discard changes</button><button className="primary" disabled={disabled||saving||!dirty} onClick={()=>void save()}>Save changes</button></div><div className="transmittal-legend">{['burial','statement','transfer','exhumation'].map(kind=><span key={kind} data-kind={kind}><i/>{kind==='exhumation'?'Exhumation':kind[0].toUpperCase()+kind.slice(1)}</span>)}<small>New rows save with Save changes · Enter a name, type and payment date</small></div>{error&&<p className="error-text" role="alert">{error}</p>}
 <div className="scroll sheet-scroll" ref={cells}><table className="sheet-table" aria-label="Editable transmittal"><thead><tr>{headers.map((heading,column)=><Fragment key={column}><th><small>{String.fromCharCode(65+column)}</small>{cleanText(heading).trim()}</th>{column===0&&<th className="row-tools-head">Actions</th>}</Fragment>)}</tr></thead><tbody>{shown.length?shown.map((row,index)=><tr key={row.id} data-kind={transmittalKind(row)} style={{animationDelay:Math.min(index,12)*12+'ms'}} className={drafts[row.id]?'sheet-changed':''}>{row.values.map((value,column)=>{
  const isActive=active?.id===row.id&&active.column===column;
  return <Fragment key={column}><td tabIndex={column===0?-1:0} data-row={row.id} data-column={column} className={(column===0?'sheet-number ':amountColumn(column)?'sheet-amount ':'')+(isActive?'sheet-active':'')} aria-label={`Record ${row.values[0]}, ${headers[column]}`} aria-readonly={column===0||disabled} onClick={()=>start(row,column)} onKeyDown={event=>keyDown(event,row,column)} onPaste={event=>paste(event,row,column)}>{isActive&&column===5?<select autoFocus aria-label={headers[column]} value={entry} disabled={saving||disabled} onChange={event=>setEntry(event.target.value)} onBlur={()=>commit(row,column)} onKeyDown={event=>editKey(event,row,column)}>{!['BURIAL','STATEMENT','TRANSFER','EXHUMATION'].includes(entry)&&<option>{entry}</option>}{['BURIAL','STATEMENT','TRANSFER','EXHUMATION'].map(type=><option key={type}>{type}</option>)}</select>:isActive?<input autoFocus aria-label={headers[column]} type={dateColumn(column)?'date':'text'} inputMode={amountColumn(column)?'decimal':undefined} value={entry} placeholder={column===12?isNewRow(row)?'Not saved yet':missingReceiptText(row,Date.now()):undefined} disabled={saving||disabled} onChange={event=>setEntry(event.target.value)} onBlur={()=>commit(row,column)} onFocus={event=>event.currentTarget.select()} onKeyDown={event=>editKey(event,row,column)}/>:amountColumn(column)?money(value):dateColumn(column)?dateText(value,true):column===12&&!cleanText(value).trim()?<small className="or-missing">{isNewRow(row)?'Not saved yet':missingReceiptText(row,Date.now())}</small>:cleanText(value)}{column===3&&!isActive&&recordMobile(row)&&<div className="record-mobile"><MobileContact number={recordMobile(row)}/></div>}</td>{column===0&&<td className="actions row-tools">{isNewRow(row)?<div className="record-actions"><button disabled={disabled||saving} title="Enter O.R. number" aria-label="Enter O.R. number" onClick={()=>start(row,12)}><ReceiptText size={14}/>O.R.</button><button className="delete-action" disabled={saving} title="Delete new row" aria-label="Delete new row" onClick={()=>setDiscarding(row)}><Trash2 size={14}/></button></div>:actions(row)}</td>}</Fragment>;
 })}</tr>):<tr><td colSpan={21}>No records found.</td></tr>}</tbody><TransmittalTotals rows={shown} dirty={dirty}/></table></div>
 <Dialog open={!!discarding} onOpenChange={open=>{if(!open)setDiscarding(null)}}><DialogContent className="delete-modal" aria-describedby="discard-row-description"><DialogHeader><DialogTitle>Delete this new row?</DialogTitle></DialogHeader><p id="discard-row-description">This row has not been saved. Its input will be removed from this sheet.</p><DialogFooter><button className="secondary" autoFocus onClick={()=>setDiscarding(null)}>Cancel</button><button className="danger" onClick={()=>{if(discarding){setDrafts(old=>{const next={...old};delete next[discarding.id];return next});if(active?.id===discarding.id)setActive(null)}setDiscarding(null)}}><Trash2 size={14}/>Delete row</button></DialogFooter></DialogContent></Dialog>
 </div>;
}
