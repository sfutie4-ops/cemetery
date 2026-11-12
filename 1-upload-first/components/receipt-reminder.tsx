'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {GripHorizontal,Pin,PinOff,X} from 'lucide-react';
import {cleanText,type RecordRow} from '../lib/model';
import {overdueReceipts,receiptLabel,reminderBounds,missingReceiptText,RECEIPT_SNOOZE} from '../lib/receipt-reminders';
export default function ReceiptReminder({records,account,blocked,disabled,onOpen,onSave}:{records:RecordRow[];account:string;blocked:boolean;disabled:boolean;onOpen:(row:RecordRow)=>void;onSave:(row:RecordRow)=>Promise<RecordRow|false>}){
 const [ready,setReady]=useState(false),[now,setNow]=useState(0),[until,setUntil]=useState(0),[chosen,setChosen]=useState(''),[position,setPosition]=useState({x:16,y:100}),[pinned,setPinned]=useState(false);
 const [receipt,setReceipt]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const inFlight=useRef(false);
 const card=useRef<HTMLElement>(null),drag=useRef<{id:number;x:number;y:number;left:number;top:number}|null>(null),paused=useRef(false),key='cemetery-or-reminder:'+account;
 const idleTimer=useRef<ReturnType<typeof setTimeout>|null>(null),pinTimer=useRef<ReturnType<typeof setTimeout>|null>(null),pinDeadline=useRef(0),interactions=useRef({hover:false,touch:false,focus:false}),moveNow=useRef<()=>void>(()=>{});
 const eligible=overdueReceipts(records,now),record=eligible.find(row=>row.id===chosen)??eligible[0],visible=ready&&!blocked&&!!record&&now>=until;
 useEffect(()=>{setReceipt('');setError('')},[record?.id]);
 // Each new site opening checks overdue records immediately; dismissals last within this visit.
 useEffect(()=>{setNow(Date.now());setUntil(0);setReady(true);setPinned(false);setChosen('');const refresh=()=>{if(!document.hidden)setNow(Date.now())};const timer=setInterval(refresh,15000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh)}},[key]);
 useEffect(()=>{if(!until)return;const timer=setTimeout(()=>{setNow(Date.now());setUntil(0);setPinned(false);setChosen('')},Math.max(0,until-Date.now()));return()=>clearTimeout(timer)},[until]);
 useEffect(()=>{
  if(!visible){paused.current=false;drag.current=null;return;}
  function random(){if(pinDeadline.current||paused.current||drag.current||document.hidden||document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;setPosition(reminderBounds(Math.random()*innerWidth,Math.random()*innerHeight,innerWidth,innerHeight,card.current?.offsetWidth,card.current?.offsetHeight))}
  function resize(){setPosition(old=>reminderBounds(old.x,old.y,innerWidth,innerHeight,card.current?.offsetWidth,card.current?.offsetHeight))}
  moveNow.current=random;resize();random();const timer=setInterval(random,14000);window.addEventListener('resize',resize);return()=>{clearInterval(timer);moveNow.current=()=>{};window.removeEventListener('resize',resize)};
 },[visible]);
 function stopIdle(){if(idleTimer.current){clearTimeout(idleTimer.current);idleTimer.current=null}}
 function freeze(){stopIdle();paused.current=true;if(card.current){card.current.dataset.resting='true';if(!drag.current){const rect=card.current.getBoundingClientRect();card.current.style.transition='none';setPosition({x:rect.left,y:rect.top})}}}
 function resume(){
  stopIdle();if(Object.values(interactions.current).some(Boolean)||drag.current)return;
  idleTimer.current=setTimeout(()=>{idleTimer.current=null;if(Object.values(interactions.current).some(Boolean)||drag.current)return;paused.current=false;if(card.current){card.current.dataset.resting='false';card.current.style.transition=''}moveNow.current()},1000);
 }
 function releasePin(){if(pinTimer.current){clearTimeout(pinTimer.current);pinTimer.current=null}pinDeadline.current=0;setPinned(false);if(card.current)card.current.dataset.pinned='false';resume()}
 function togglePin(){
  if(pinDeadline.current){releasePin();return}
  freeze();if(card.current){const rect=card.current.getBoundingClientRect();card.current.style.setProperty('--kunai-start-x',`${-rect.left-card.current.offsetWidth*.14-48}px`);card.current.style.setProperty('--kunai-start-y',`${-rect.top-card.current.offsetHeight*.35-48}px`)}pinDeadline.current=Date.now()+30000;setPinned(true);if(card.current){card.current.dataset.pinned='true';card.current.dataset.pinUntil=String(pinDeadline.current)}
  pinTimer.current=setTimeout(()=>{pinTimer.current=null;pinDeadline.current=0;setPinned(false);if(card.current)card.current.dataset.pinned='false';if(!Object.values(interactions.current).some(Boolean)&&!drag.current){stopIdle();paused.current=false;if(card.current){card.current.dataset.resting='false';card.current.style.transition=''}moveNow.current()}},30000);
 }
 useEffect(()=>{
  if(!visible){stopIdle();if(pinTimer.current)clearTimeout(pinTimer.current);pinTimer.current=null;pinDeadline.current=0;setPinned(false);interactions.current={hover:false,touch:false,focus:false}}
  return()=>{stopIdle();if(pinTimer.current)clearTimeout(pinTimer.current);pinTimer.current=null;pinDeadline.current=0};
 },[visible,key]);
 async function saveReceipt(){
  if(!record||disabled||inFlight.current||!receipt.trim())return;
  inFlight.current=true;setSaving(true);setError('');
  try{const values=[...record.values];values[12]=cleanText(receipt).trim();const saved=await onSave({...record,values});if(!saved)setError('Not saved. Review and retry.')}catch{setError('Connection error. Try again.')}finally{inFlight.current=false;setSaving(false)}
 }
 function snooze(){const value=Date.now()+RECEIPT_SNOOZE;setUntil(value);setNow(Date.now());}
 if(!visible||!record)return null;
 const label=receiptLabel(record);
 return createPortal(<section ref={card} className="receipt-floater receipt-ghost screen" aria-label="Overdue O.R. reminder" style={{transform:`translate(${position.x}px,${position.y}px)`}} data-pinned={pinned} onPointerEnter={event=>{if(event.pointerType!=='touch'){interactions.current.hover=true;freeze()}}} onPointerLeave={event=>{if(event.pointerType!=='touch'){interactions.current.hover=false;resume()}}} onPointerDownCapture={event=>{if(event.pointerType==='touch'){interactions.current.touch=true;freeze()}}} onPointerUpCapture={()=>{interactions.current.touch=false;resume()}} onPointerCancelCapture={()=>{interactions.current.touch=false;resume()}} onFocusCapture={event=>{interactions.current.focus=event.target.matches('input,textarea,select,:focus-visible');if(interactions.current.focus)freeze();else resume()}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null)){interactions.current.focus=false;resume()}}}>
 <div className="receipt-ghost-appearance" aria-hidden="true"><div className="receipt-ghost-art"><img src="/receipt-ghost-scroll.png" alt="" draggable={false}/><span className="receipt-ghost-eye left"/><span className="receipt-ghost-eye right"/></div><div className="receipt-ghost-motes"><i/><i/><i/></div></div>{pinned&&<div className="receipt-weapon-layer" aria-hidden="true"><div className="receipt-kunai"><i className="kunai-ring"/><i className="kunai-grip"/><i className="kunai-blade"/></div><i className="receipt-pin-impact"/></div>}<div className="receipt-floater-bar"><button className="receipt-drag" aria-label="Move receipt reminder; arrow keys move it" onKeyDown={event=>{const directions:Record<string,number[]>={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};const d=directions[event.key];if(d){event.preventDefault();freeze();setPosition(old=>reminderBounds(old.x+d[0],old.y+d[1],innerWidth,innerHeight,card.current?.offsetWidth,card.current?.offsetHeight))}}} onPointerDown={event=>{if(event.button!==0)return;const rect=card.current!.getBoundingClientRect();drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};freeze();setPosition({x:rect.left,y:rect.top});card.current!.style.transition='none';event.currentTarget.setPointerCapture(event.pointerId)}} onPointerMove={event=>{const d=drag.current;if(!d||d.id!==event.pointerId)return;const p=reminderBounds(d.left+event.clientX-d.x,d.top+event.clientY-d.y,innerWidth,innerHeight,card.current?.offsetWidth,card.current?.offsetHeight);if(card.current)card.current.style.transform=`translate(${p.x}px,${p.y}px)`}} onPointerUp={event=>{if(!drag.current||drag.current.id!==event.pointerId)return;const rect=card.current!.getBoundingClientRect();setPosition({x:rect.left,y:rect.top});drag.current=null;card.current!.style.transition='';event.currentTarget.releasePointerCapture(event.pointerId);resume()}} onPointerCancel={()=>{if(card.current){const rect=card.current.getBoundingClientRect();setPosition({x:rect.left,y:rect.top});card.current.style.transition=''}drag.current=null;resume()}}><GripHorizontal size={14}/></button><button type="button" className="receipt-pin" aria-label={pinned?'Remove kunai and release ghost':'Throw kunai and pin ghost for 30 seconds'} title={pinned?'Remove kunai':'Pin for 30 seconds'} aria-pressed={pinned} onClick={togglePin}>{pinned?<PinOff size={13}/>:<Pin size={13}/>}</button><button className="receipt-close" aria-label="Dismiss receipt reminder for 10 minutes" title="Remind me in 10 minutes" disabled={saving} onClick={snooze}><X size={14}/></button></div>
 <form className="receipt-ghost-content" onSubmit={event=>{event.preventDefault();void saveReceipt()}}>
 <h3>Missing O.R.</h3><p className="receipt-ghost-context"><span>{label.cemetery} Cemetery</span><span>{label.type==='Burial'?'Burial Permit':label.type==='Exhumation'?'Exhumation Permit':label.type==='Statement'?'Statement of Account':label.type==='Transfer'?'Transfer of Remains':label.type}</span></p>
 <button type="button" className="receipt-ghost-name" disabled={disabled||saving} title={label.name+' · open receipt editor'} onClick={()=>{setChosen(record.id);onOpen(record)}}>{label.name}</button>
 <small className="receipt-elapsed">{missingReceiptText(record,now).replace('Missing O.R. · ','Missing: ')}</small>
 <input aria-label="Enter O.R. number" autoComplete="off" maxLength={80} placeholder="Enter O.R. number" value={receipt} disabled={disabled||saving} onChange={event=>{setReceipt(event.target.value);setError('')}}/>
 <button className="receipt-save" disabled={disabled||saving||!receipt.trim()}>{saving?'Saving…':'Save'}</button>
 {error?<small className="receipt-ghost-error" role="alert" title={error}>{error}</small>:disabled&&!saving?<small className="receipt-ghost-error">Save sheet edits first</small>:eligible.length>1?<button type="button" className="receipt-next" disabled={saving} onClick={()=>{const index=eligible.findIndex(row=>row.id===record.id);setChosen(eligible[(index+1)%eligible.length].id)}}>{eligible.length} pending · Next</button>:null}
 </form>
 </section>,document.body);
}
