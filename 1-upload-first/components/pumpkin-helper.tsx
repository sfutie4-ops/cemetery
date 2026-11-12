'use client';
import {useEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen,Grip,Send,Sparkles,X} from 'lucide-react';
import {helperAnswer,helperBounds,helperVerses,type HelperContext} from '../lib/site-helper';

const positionKey='cemetery-pip-position';
type Point={x:number;y:number};
export default function PumpkinHelper({context,blocked,onInspect}:{context:HelperContext;blocked:boolean;onInspect:()=>void}){
 const [mounted,setMounted]=useState(false),[open,setOpen]=useState(false),[speaking,setSpeaking]=useState(false),[question,setQuestion]=useState(''),[verse,setVerse]=useState(0),[answer,setAnswer]=useState<string|null>(null),[position,setPosition]=useState<Point>({x:0,y:0});
 const anchor=useRef<HTMLDivElement>(null),point=useRef(position),drag=useRef<{start:Point;pointer:Point;id:number;moved:boolean}|null>(null),suppressClick=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),nextVerse=useRef(0);
 function place(next:Point,commit=false){point.current=next;if(anchor.current)anchor.current.style.transform=`translate3d(${next.x}px,${next.y}px,0)`;if(commit)setPosition(next)}
 function persist(){try{localStorage.setItem(positionKey,JSON.stringify({x:point.current.x/Math.max(1,window.innerWidth-60),y:point.current.y/Math.max(1,window.innerHeight-60)}))}catch{}}
 useEffect(()=>{
  let saved:Point|null=null;try{const item=JSON.parse(localStorage.getItem(positionKey)??'null');if(item&&Number.isFinite(item.x)&&Number.isFinite(item.y))saved=item}catch{}
  const width=window.innerWidth,height=window.innerHeight;
  place(helperBounds(saved?saved.x*(width-60):width>1000?115:width-76,saved?saved.y*(height-60):height-82,width,height),true);setMounted(true);
  let previous={width,height};
  const resize=()=>{const width=window.innerWidth,height=window.innerHeight;place(helperBounds(point.current.x/Math.max(1,previous.width-60)*(width-60),point.current.y/Math.max(1,previous.height-60)*(height-60),width,height),true);previous={width,height}};
  window.addEventListener('resize',resize);
  return()=>{window.removeEventListener('resize',resize);if(timer.current)clearTimeout(timer.current)};
 },[]);
 useEffect(()=>{setOpen(false);setSpeaking(false);if(timer.current)clearTimeout(timer.current)},[blocked,context.page]);
 function speak(text:string){if(timer.current)clearTimeout(timer.current);setSpeaking(true);timer.current=setTimeout(()=>setSpeaking(false),Math.min(5000,Math.max(2000,text.length*22)))}
 function showVerse(){if(suppressClick.current){suppressClick.current=false;return}const index=nextVerse.current++%helperVerses.length;setVerse(index);setAnswer(null);setOpen(true);speak(helperVerses[index].text)}
 function ask(text:string){if(!text.trim())return;if(/\b(missing|empty|blank|incomplete|review|filled)\b/i.test(text))onInspect();const response=helperAnswer(text,context);setAnswer(response);setQuestion('');setOpen(true);speak(response)}
 function pointerDown(event:PointerEvent<HTMLButtonElement>){if(!event.isPrimary||event.button!==0||drag.current)return;suppressClick.current=false;drag.current={start:{...point.current},pointer:{x:event.clientX,y:event.clientY},id:event.pointerId,moved:false};event.currentTarget.setPointerCapture(event.pointerId)}
 function pointerMove(event:PointerEvent<HTMLButtonElement>){const current=drag.current;if(!current||current.id!==event.pointerId)return;const dx=event.clientX-current.pointer.x,dy=event.clientY-current.pointer.y;if(!current.moved&&Math.hypot(dx,dy)<5)return;current.moved=true;setOpen(false);place(helperBounds(current.start.x+dx,current.start.y+dy,window.innerWidth,window.innerHeight))}
 function endDrag(event:PointerEvent<HTMLButtonElement>){const current=drag.current;if(!current||current.id!==event.pointerId)return;drag.current=null;suppressClick.current=current.moved;place(point.current,true);if(current.moved)persist();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 function keyboard(event:KeyboardEvent<HTMLButtonElement>){const shifts:Record<string,Point>={ArrowLeft:{x:-16,y:0},ArrowRight:{x:16,y:0},ArrowUp:{x:0,y:-16},ArrowDown:{x:0,y:16}};const shift=shifts[event.key];if(shift){event.preventDefault();setOpen(false);place(helperBounds(point.current.x+shift.x,point.current.y+shift.y,window.innerWidth,window.innerHeight),true);persist()}else if(event.key==='Escape')setOpen(false)}
 if(!mounted)return null;
 const height=window.innerHeight,width=window.innerWidth,panelHeight=Math.min(380,height-16),panelWidth=Math.min(320,width-16),panelLeft=Math.max(8,Math.min(position.x+30-panelWidth/2,width-panelWidth-8)),panelTop=Math.max(8,Math.min(position.y-panelHeight-12,height-panelHeight-8)),currentVerse=helperVerses[verse];
 return createPortal(<div className="pumpkin-helper screen" hidden={blocked} data-speaking={speaking}>
  <div ref={anchor} className="pumpkin-anchor" style={{transform:`translate3d(${position.x}px,${position.y}px,0)`}}><button type="button" className="pumpkin-button" title="Pip · Click for a Bible verse. Drag to move." aria-label="Pip, your cemetery guide. Click for a Bible verse; use arrow keys to move." aria-expanded={open} aria-controls="pip-guide" onClick={showVerse} onKeyDown={keyboard} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
   <span className="pumpkin-character" aria-hidden="true"><i className="pumpkin-stem"/><i className="pumpkin-body"><i className="pumpkin-rib rib-left"/><i className="pumpkin-rib rib-right"/><i className="pumpkin-eye eye-left"/><i className="pumpkin-eye eye-right"/><i className="pumpkin-cheek cheek-left"/><i className="pumpkin-cheek cheek-right"/><i className="pumpkin-mouth"/></i></span><span className="pumpkin-spark" aria-hidden="true"><Sparkles size={11}/></span>
  </button></div>
  {open&&!blocked&&<section id="pip-guide" role="region" aria-label="Pip cemetery guide" className="pumpkin-panel" style={{left:panelLeft,top:panelTop,width:panelWidth,maxHeight:panelHeight}} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);anchor.current?.querySelector('button')?.focus()}}}>
   <header><span className="pip-icon"><Sparkles size={17}/></span><div><strong>Pip</strong><small>{speaking?'Speaking…':'Your cemetery guide'}</small></div><button type="button" aria-label="Close Pip guide" onClick={()=>{setOpen(false);anchor.current?.querySelector('button')?.focus()}}><X size={17}/></button></header>
   <div className="pip-response" aria-live="polite" aria-atomic="true">{answer?<p>{answer}</p>:<><BookOpen size={16} aria-hidden="true"/><blockquote>{currentVerse.text}</blockquote><a href={'https://www.biblegateway.com/passage/?search='+encodeURIComponent(currentVerse.ref)+'&version=KJV'} target="_blank" rel="noopener noreferrer">{currentVerse.ref} · KJV</a></>}</div>
   <div className="pip-quick-questions"><button type="button" onClick={()=>ask('What is missing?')}>Check my form</button><button type="button" onClick={()=>ask('How do I print?')}>Printing</button><button type="button" onClick={()=>ask('How does advance payment work?')}>Advance payment</button><button type="button" onClick={showVerse}>Another verse</button></div>
   <form className="pip-ask" onSubmit={event=>{event.preventDefault();ask(question)}}><label className="sr-only" htmlFor="pip-question">Ask about this website</label><input id="pip-question" maxLength={200} placeholder="Ask about this website…" autoComplete="off" value={question} onChange={event=>setQuestion(event.target.value)}/><button type="submit" disabled={!question.trim()} aria-label="Ask Pip"><Send size={15}/></button></form>
   <footer><Grip size={12} aria-hidden="true"/>Drag the pumpkin to move · Quick site answers</footer>
  </section>}
 </div>,document.body);
}
