'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {cleanText,dateText,money,type Fields} from '../lib/model';
import {letterPage,fitScale} from '../lib/paper-layout';
import {promissoryText,promissoryReceivers} from '../lib/promissory';
function Editable({value,onChange,multiline=false,bold=false,label}:{value:string;onChange?: (value:string)=>void;multiline?:boolean;bold?:boolean;label:string}){
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{if(ref.current&&document.activeElement!==ref.current)ref.current.textContent=value},[value]);
 return <span ref={ref} contentEditable={!!onChange} suppressContentEditableWarning role={onChange?'textbox':undefined} aria-label={onChange?label:undefined} aria-multiline={multiline||undefined} tabIndex={onChange?0:undefined} onBlur={event=>{if(onChange)onChange(cleanText(event.currentTarget.innerText).slice(0,multiline?5000:400))}} onPaste={event=>{if(!onChange)return;event.preventDefault();const text=event.clipboardData.getData('text/plain');const selection=window.getSelection();if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);if(!event.currentTarget.contains(range.commonAncestorContainer))return;range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range)}} onKeyDown={event=>{if(!multiline&&event.key==='Enter'){event.preventDefault();event.currentTarget.blur()}}} style={{display:multiline?'block':'inline',whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontWeight:bold?700:400,minHeight:multiline?'1.5em':undefined}}>{value}</span>;
}
export default function PromissoryPaper({values,onChange}:{values:Fields;onChange?:(ref:string,value:string)=>void}){
 const host=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),[scale,setScale]=useState(.5),[font,setFont]=useState(16),[contentScale,setContentScale]=useState(1),page=letterPage();
 useEffect(()=>{let frame=0;const fit=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!host.current)return;const rect=host.current.getBoundingClientRect(),modal=host.current.closest('.permit-modal');setScale(fitScale(page.width,page.height,host.current.clientWidth-24,(modal?host.current.clientHeight:(window.visualViewport?.height??innerHeight)-rect.top-16)-(host.current.querySelector<HTMLElement>('.promissory-edit-tools')?.offsetHeight??0)-24))})};const observer=new ResizeObserver(fit);if(host.current)observer.observe(host.current);window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);fit();return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit)}},[page.width,page.height]);
 useEffect(()=>{setFont(16);const frame=requestAnimationFrame(()=>{if(content.current){const height=content.current.scrollHeight;if(height>page.contentHeight)setFont(Math.max(9,16*page.contentHeight/height-.2))}});return()=>cancelAnimationFrame(frame)},[values,page.contentHeight]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{if(content.current)setContentScale(Math.min(1,page.contentHeight/Math.max(1,content.current.scrollHeight)))});return()=>cancelAnimationFrame(frame)},[values,font,page.contentHeight]);
 const text=(ref:string)=>cleanText(values[ref]??(ref==='PN16'?promissoryReceivers[0]:'')),edit=(ref:string)=>onChange?(value:string)=>onChange(ref,value):undefined;
 const inline=(ref:string,label:string,bold=false)=> <Editable value={text(ref)} onChange={edit(ref)} label={label} bold={bold}/>;
 const free=values.PN15==='custom';
 return <div className="paper promissory-paper" ref={host} style={{width:'100%',height:'100%',minHeight:0,display:'block'}}>
 {onChange&&<div className="promissory-edit-tools screen"><span>{free?'Edit the whole letter · changes save when you leave the text':'Click wording or names on the paper to edit'}</span><button type="button" className="secondary" onClick={()=>{if(free)onChange('PN15','');else{if(!text('PN14'))onChange('PN14',promissoryText(values));onChange('PN15','custom')}}}>{free?'Use form layout':'Edit whole letter'}</button></div>}
 <div className="paper-stage" style={{width:page.width*scale,height:page.height*scale,'--page-width':page.width+'px','--page-height':page.height+'px'} as CSSProperties}><div className="paper-page" style={{width:page.width,height:page.height,transform:`scale(${scale})`,transformOrigin:'top left',background:'#fff',color:'#000',position:'absolute',top:0,left:0,padding:page.margin,fontFamily:'Arial, sans-serif'}}>
 <div ref={content} style={{fontSize:font,lineHeight:1.55,whiteSpace:'normal',color:'#000',transform:`scale(${contentScale})`,transformOrigin:'top left'}}>
 {free?<><Editable value={text('PN14')} onChange={edit('PN14')} label="Edit entire promissory letter" multiline/>{text('PH1')&&!text('PN14').includes(text('PH1'))&&<p style={{marginTop:'1em'}}>Mobile: {text('PH1')}</p>}{!text('PN14').includes(text('PN16'))&&<p style={{marginTop:'2em'}}>Received by:<br/><strong>{text('PN16')}</strong></p>}</>:<>
 <div style={{textAlign:'center',lineHeight:1.45}}>Republic of the Philippines<br/>Province of Negros Occidental<br/>Municipality of Hinigaran<br/>MUNICIPAL CEMETERY</div>
 <h2 style={{fontSize:'1.2em',textAlign:'center',fontWeight:400,letterSpacing:'.12em',margin:'2em 0'}}>{inline('PN10','Note title')}</h2>
 <p style={{textAlign:'right',margin:'0 0 1.5em'}}>Date: {dateText(values.PN12)}</p>
 <p style={{margin:'0 0 1.5em'}}>Dear {inline('PN16','Receiver',true)},</p>
 <p style={{margin:'1.6em 0',textAlign:'justify'}}>I, {inline('PN3','Informant name',true)}, promise to pay the remaining balance of {inline('PN13','Arrears / deceased name',true)}, who died on {dateText(values.PN17)}, amounting to ₱ {money(values.PN7)}, on or before {dateText(values.PN6)}.</p>
 <p style={{margin:'1.5em 0'}}>Hoping for your kind consideration regarding this matter.</p>
 <p style={{margin:'2em 0 2.5em'}}>Respectfully yours,</p><p style={{margin:'0 0 2em'}}>{inline('PN3','Signing informant name',true)}<br/>{inline('PN4','Address')}{text('PN5')&&<>, Brgy. {inline('PN5','Barangay')}</>}{text('PH1')&&<><br/>Mobile: {inline('PH1','Mobile number')}</>}</p>
 <p style={{margin:'1.5em 0 2.5em'}}>Received by:</p><p style={{margin:'0 0 2em'}}>{inline('PN16','Addressee signature name',true)}<br/>Clerk</p>
 {(text('PN11')||onChange)&&<Editable value={text('PN11')} onChange={edit('PN11')} label="Optional names below" multiline bold/>}
 </>}
 </div></div></div></div>;
}
