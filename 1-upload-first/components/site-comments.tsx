'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Crosshair,History,MessageSquare,Send,Trash2,X} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from './ui/dialog';
import {anchorPoint,anchorSelector,validCommentAnchor,type CommentAnchor} from '../lib/comment-anchor';
import type {EditAccess} from '../hooks/use-edit-access';
type Comment={id:string;author:string;message:string;page:string;created_at:string;anchor?:CommentAnchor|null;deleted_at?:string|null};
type Pin={id:string;left:number;top:number;number:number};
export default function SiteComments({open,onClose,access,page,pageKey,blocked=false}:{open:boolean;onClose:()=>void;access:EditAccess;page:string;pageKey:string;blocked?:boolean}){
 const [name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[comments,setComments]=useState<Comment[]>([]);
 const [draft,setDraft]=useState<CommentAnchor|null>(null),[selected,setSelected]=useState<Comment|null>(null),[lockedPin,setLockedPin]=useState<string|null>(null),[pins,setPins]=useState<Pin[]>([]);
 const [historyOpen,setHistoryOpen]=useState(false),[removing,setRemoving]=useState<Comment|null>(null),[showRemoved,setShowRemoved]=useState(false);
 const deleted=useRef(new Map<string,string>());
 const token=useRef(''),highlight=useRef<HTMLDivElement>(null),hoverTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const placing=open&&!blocked&&!draft&&!selected&&!historyOpen&&!removing;
 const draftPage=useRef(pageKey);
 useEffect(()=>{setDraft(null);setSelected(null);setLockedPin(null);setMessage('');token.current='';setNotice('');setError('');draftPage.current=pageKey},[pageKey,open]);
 useEffect(()=>{if(blocked&&open)onClose()},[blocked,open,onClose]);
 useEffect(()=>{setComments([]);deleted.current.clear();setHistoryOpen(false);setRemoving(null)},[access.role,access.username]);
 useEffect(()=>{
  if(blocked||access.role!=='admin')return;
  const controller=new AbortController();
  fetch('/api/comments?history=1',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async response=>{
   const data=await response.json() as {comments:Comment[];error?:string};if(!response.ok)throw Error(data.error??'Comments could not be loaded.');
   setComments(data.comments.map(comment=>({...comment,deleted_at:deleted.current.get(comment.id)??comment.deleted_at})));
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message)});
  return()=>controller.abort();
 },[blocked,access.role,access.username,pageKey]);
 useEffect(()=>{
  if(!placing)return;
  const root=document.querySelector('.shell');if(!root)return;
  let hovered:Element|null=null,frame=0;
  root.classList.add('comment-placement');
  function target(event:Event):Element|null{
   if(!(event.target instanceof Element)||event.target.closest('[data-annotation-ui], [role=dialog]')||!root!.contains(event.target))return null;
   const element=event.target.closest('svg')?.parentElement??event.target;
   return element.closest('button,input,select,textarea,label,td,th,p,h1,h2,h3,article,section,div,span')??element;
  }
  function draw(){frame=0;if(!highlight.current)return;const rect=hovered?.getBoundingClientRect();Object.assign(highlight.current.style,rect?{display:'block',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'}:{display:'none'})}
  function move(event:PointerEvent){const next=target(event);if(next!==hovered){hovered=next;if(!frame)frame=requestAnimationFrame(draw)}}
  function down(event:PointerEvent){if(target(event)){event.preventDefault();event.stopImmediatePropagation()}}
  function click(event:MouseEvent){const element=target(event);if(!element)return;event.preventDefault();event.stopImmediatePropagation();const rect=element.getBoundingClientRect(),selector=anchorSelector(element,root!);if(!selector||!rect.width||!rect.height)return;
   setDraft({selector,x:Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width)),y:Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height)),pageKey});setMessage('');setNotice('');setError('');token.current='';
  }
  function key(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();onClose()}else if(event.key==='Enter'&&event.target instanceof Element&&root!.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();const rect=event.target.getBoundingClientRect();click({target:event.target,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,preventDefault(){},stopImmediatePropagation(){}} as unknown as MouseEvent)}}
  document.addEventListener('pointermove',move,true);document.addEventListener('pointerdown',down,true);document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);
  return()=>{root.classList.remove('comment-placement');cancelAnimationFrame(frame);if(highlight.current)highlight.current.style.display='none';document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerdown',down,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true)};
 },[placing,pageKey,onClose]);
 useEffect(()=>{
  if(blocked||(!comments.length&&!draft)){setPins([]);return}
  let frame=0;
  const visible=[...comments.filter(comment=>!comment.deleted_at&&comment.anchor?.pageKey===pageKey),...(draft?[{id:'draft',anchor:draft}]:[])];
  function layout(){frame=0;const next:Pin[]=[];for(const [index,comment] of visible.entries()){
   if(!validCommentAnchor(comment.anchor))continue;const element=document.querySelector(comment.anchor.selector);if(!element||!element.getClientRects().length)continue;
   const point=anchorPoint(comment.anchor,element.getBoundingClientRect());let clipped=point.left<0||point.top<0||point.left>innerWidth||point.top>innerHeight;
   for(let parent=element.parentElement;parent&&!clipped;parent=parent.parentElement){const style=getComputedStyle(parent),rect=parent.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(style.overflowX)&&(point.left<rect.left||point.left>rect.right))clipped=true;if(/auto|scroll|hidden|clip/.test(style.overflowY)&&(point.top<rect.top||point.top>rect.bottom))clipped=true}
   if(!clipped)next.push({id:comment.id,...point,number:index+1});
  }setPins(old=>JSON.stringify(old)===JSON.stringify(next)?old:next)}
  function schedule(){if(!frame)frame=requestAnimationFrame(layout)}
  const root=document.querySelector('.shell'),resize=new ResizeObserver(schedule),mutations=new MutationObserver(schedule);
  if(root){resize.observe(root);root.querySelectorAll('main,section,.paper').forEach(element=>resize.observe(element));mutations.observe(root,{childList:true,subtree:true})}
  window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);schedule();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true)};
 },[blocked,comments,pageKey,draft]);
 async function submit(){
  if(busy||!draft||draftPage.current!==pageKey)return;
  setBusy(true);setError('');setNotice('');
  try{
   token.current||=crypto.randomUUID();const response=await fetch('/api/comments',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({id:token.current,name,message,page,anchor:draft})}),data=await response.json() as {error?:string};
   if(!response.ok)throw Error(data.error??'Comment could not be saved.');
   const comment:Comment={id:token.current,author:access.role==='admin'?access.clerkName??'Admin':name.trim()||'Guest',message:message.trim(),page,anchor:draft,created_at:new Date().toISOString()};
   setComments(old=>[comment,...old.filter(item=>item.id!==comment.id)]);setMessage('');token.current='';setDraft(null);setNotice('Comment saved at your selected spot.');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function removeComment(){
  if(!removing||busy||access.role!=='admin')return;setBusy(true);setError('');
  try{const response=await fetch('/api/comments',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id:removing.id})});const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error??'Comment could not be removed.');const date=new Date().toISOString();deleted.current.set(removing.id,date);setComments(old=>old.map(comment=>comment.id===removing.id?{...comment,deleted_at:date}:comment));closePin();setRemoving(null);setNotice('Comment removed. It remains available in previous comments.')}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 function cancelHoverClose(){if(hoverTimer.current){clearTimeout(hoverTimer.current);hoverTimer.current=null}}
 function leavePin(){cancelHoverClose();if(!lockedPin)hoverTimer.current=setTimeout(()=>setSelected(null),160)}
 function showPin(id:string,lock=false){cancelHoverClose();if(busy||draft)return;if(lockedPin&&!lock)return;setSelected(comments.find(comment=>comment.id===id)??null);if(lock)setLockedPin(id)}
 function closePin(){cancelHoverClose();setSelected(null);setLockedPin(null)}
 useEffect(()=>()=>{if(hoverTimer.current)clearTimeout(hoverTimer.current)},[]);
 useEffect(()=>{
  if(!selected)return;
  function outside(event:PointerEvent){if(event.target instanceof Element&&!event.target.closest('[data-comment-reader],[data-comment-pin]')){setSelected(null);setLockedPin(null)}}
  function escape(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();setSelected(null);setLockedPin(null)}}
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true)};
 },[selected]);
 const selectedPin=selected?pins.find(pin=>pin.id===selected.id):undefined;
 if(blocked)return null;
 return <>{createPortal(<div data-annotation-ui className="annotation-layer screen">
  {open&&<><div className="annotation-highlight" ref={highlight}/><div className="annotation-toolbar" role="region" aria-label="Comment tool"><Crosshair size={19}/><div><strong>{placing?'Click anywhere to comment':'Comments'}</strong><small>{notice||'Hover or tap a number to read · Esc to exit'}</small></div><button className="secondary" disabled={busy} onClick={()=>{closePin();setHistoryOpen(true)}}><History size={15}/>Previous comments</button><button className="secondary" onClick={onClose} disabled={busy} aria-label="Exit comment mode"><X size={18}/></button></div>{error&&!draft&&<div className="annotation-error" role="alert">{error}</div>}</>}
  {pins.map(pin=><button key={pin.id} data-comment-pin className="annotation-pin" style={{left:pin.left,top:pin.top}} aria-label={pin.id==='draft'?'Selected comment location':'Read comment '+pin.number} aria-expanded={selected?.id===pin.id} aria-controls={selected?.id===pin.id?'annotation-comment-'+pin.id:undefined} disabled={pin.id==='draft'||busy} onPointerEnter={event=>{if(event.pointerType!=='touch')showPin(pin.id)}} onPointerLeave={leavePin} onFocus={()=>showPin(pin.id)} onBlur={leavePin} onClick={()=>showPin(pin.id,true)}>{pin.number}</button>)}
  {selected&&selectedPin&&<section data-comment-reader id={'annotation-comment-'+selected.id} className="annotation-reader" role="region" aria-label={'Comment '+selectedPin.number} style={{left:Math.max(12,Math.min(selectedPin.left+20,window.innerWidth-Math.min(320,window.innerWidth-24)-12)),top:Math.max(12,Math.min(selectedPin.top+20,window.innerHeight-300))}} onPointerEnter={cancelHoverClose} onPointerLeave={leavePin} onFocusCapture={cancelHoverClose} onBlurCapture={leavePin}><div className="annotation-reader-heading"><strong>Comment {selectedPin.number}</strong><button className="secondary" aria-label="Close comment" onClick={closePin}><X size={15}/></button></div><article className="pinned-comment"><strong>{selected.author}</strong><small>{selected.page} · {new Date(selected.created_at).toLocaleString('en-US',{timeZone:'Asia/Manila'})}</small><p>{selected.message}</p>{access.role==='admin'&&<button className="secondary comment-remove" onClick={()=>{setRemoving(selected);closePin()}}><Trash2 size={13}/>Remove comment</button>}</article></section>}
 </div>,document.body)}
 <Dialog open={historyOpen} onOpenChange={value=>{if(!busy)setHistoryOpen(value)}}><DialogContent data-annotation-ui className="comment-modal comment-history" aria-describedby="comment-history-description"><DialogHeader><DialogTitle><History size={20}/>Previous comments</DialogTitle></DialogHeader><p id="comment-history-description">{access.role==='admin'?'Latest 200 saved comments across all pages. Removed pins stay in this history.':'Comments from this visit.'}</p>{access.role==='admin'&&<label className="motion-choice"><input type="checkbox" checked={showRemoved} onChange={event=>setShowRemoved(event.target.checked)}/>Include removed comments</label>}<div className="comment-list">{comments.filter(comment=>showRemoved||!comment.deleted_at).map(comment=><article key={comment.id}><strong>{comment.author}{comment.deleted_at?' · Removed':''}</strong><small>{comment.page} · {new Date(comment.created_at).toLocaleString('en-US',{timeZone:'Asia/Manila'})}</small><p>{comment.message}</p>{access.role==='admin'&&!comment.deleted_at&&<button className="secondary" disabled={busy} onClick={()=>setRemoving(comment)}><Trash2 size={13}/>Remove</button>}</article>)}{!comments.some(comment=>showRemoved||!comment.deleted_at)&&<p>No previous comments to display.</p>}</div></DialogContent></Dialog>
 <Dialog open={!!removing} onOpenChange={value=>{if(!value&&!busy){setRemoving(null);setError('')}}}><DialogContent data-annotation-ui className="comment-modal" aria-describedby="comment-remove-description" showCloseButton={!busy}><DialogHeader><DialogTitle>Remove this comment?</DialogTitle></DialogHeader><p id="comment-remove-description">The numbered pin will disappear. You can still read the comment under Previous comments → Include removed comments.</p><blockquote>{removing?.message}</blockquote>{error&&<p className="error-text" role="alert">{error}</p>}<div className="setting-options"><button className="secondary" disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button><button className="primary" disabled={busy} onClick={()=>void removeComment()}>{busy?'Removing…':'Remove comment'}</button></div></DialogContent></Dialog>
 <Dialog open={!!draft} onOpenChange={value=>{if(!value&&!busy){setDraft(null);setError('')}}}><DialogContent data-annotation-ui className="comment-modal" aria-describedby="comment-description" showCloseButton={!busy}><DialogHeader><DialogTitle><MessageSquare size={20}/>Comment at selected spot</DialogTitle></DialogHeader><p id="comment-description">Your comment will stay attached to the spot you selected on {page.toLowerCase()}.</p>
 <form onSubmit={event=>{event.preventDefault();void submit()}}>{access.role==='guest'&&<label className="field"><span>Name (optional)</span><input maxLength={80} value={name} disabled={busy} onChange={event=>{setName(event.target.value);token.current=''}}/></label>}<label className="field"><span>Your comment</span><textarea autoFocus required rows={4} maxLength={2000} value={message} disabled={busy} onChange={event=>{setMessage(event.target.value);token.current=''}}/></label><button className="primary" disabled={busy||!message.trim()}><Send size={16}/>{busy?'Saving…':'Post comment'}</button></form>
 {error&&<p className="error-text" role="alert">{error}</p>}
 </DialogContent></Dialog></>;
}
