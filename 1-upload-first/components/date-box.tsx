'use client';
import {useEffect,useRef,useState,type InputHTMLAttributes} from 'react';
import {CalendarDays} from 'lucide-react';
import {dateInput} from '../lib/model';

// A date box typed as mm/dd/yy. The saved value stays yyyy-mm-dd, so totals, printouts and
// transmittals are unchanged. The calendar button opens the browser's date picker.
export const DATE_HINT='mm/dd/yy';

const pad=(n:number)=>String(n).padStart(2,'0');
export function shortDate(value:unknown){
 const iso=dateInput(value);if(!iso)return '';
 const [y,m,d]=iso.split('-');return `${m}/${d}/${y.slice(2)}`;
}
// "11/20/26" or "11/20/2026" → "2026-11-20". Two-digit years up to ten years ahead are 20xx, the rest 19xx.
export function parseShortDate(text:string):string|null{
 const match=text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);if(!match)return null;
 const month=+match[1],day=+match[2];let year=+match[3];
 if(match[3].length===2){const now=new Date().getFullYear(),limit=(now+10)%100;year+=year<=limit?2000:1900}
 if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate())return null;
 return `${year}-${pad(month)}-${pad(day)}`;
}
// Keeps digits and slashes, adds the slashes while typing, and stops at mm/dd/yyyy.
function shape(raw:string,previous:string){
 const adding=raw.length>previous.length;
 const segs=raw.replace(/[.\-\s]/g,'/').replace(/[^\d/]/g,'').replace(/\/{2,}/g,'/').split('/').slice(0,3);
 for(let k=0;k<2;k++)if(segs[k]!==undefined&&segs[k].length>2){const extra=segs[k].slice(2);segs[k]=segs[k].slice(0,2);segs[k+1]=extra+(segs[k+1]??'')}
 if(segs[2]!==undefined)segs[2]=segs[2].slice(0,4);
 let text=segs.slice(0,3).join('/');
 if(adding&&segs.length<3&&segs[segs.length-1].length===2)text+='/';
 return text;
}

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'|'type'|'defaultValue'>&{value:unknown;onChange:(iso:string)=>void;picker?:boolean;hint?:boolean};
export default function DateBox({value,onChange,picker=true,hint=false,className,onBlur,readOnly,disabled,...rest}:Props){
 const iso=dateInput(value),raw=typeof value==='string'&&value&&!iso?value:'';
 const [text,setText]=useState(()=>raw||shortDate(iso)),[bad,setBad]=useState(false);
 const editing=useRef(false),native=useRef<HTMLInputElement>(null);
 // Follow changes made elsewhere (another window, Copy to…, Clear) while the box is not being typed in.
 useEffect(()=>{if(!editing.current)setText(raw||shortDate(iso))},[iso,raw]);
 useEffect(()=>{if(!bad)return;const timer=setTimeout(()=>setBad(false),2400);return()=>clearTimeout(timer)},[bad]);
 const locked=readOnly||disabled;
 function type(next:string){
  const shaped=shape(next,text);setText(shaped);setBad(false);
  if(!shaped.trim()){if(iso)onChange('');return}
  const parsed=parseShortDate(shaped);if(parsed&&parsed!==iso)onChange(parsed);
 }
 function openPicker(){
  const input=native.current;if(!input||locked)return;
  try{input.showPicker()}catch{input.focus();input.click()}
 }
 return <span className={'date-box'+(picker?'':' date-box-plain')+(bad?' date-box-bad':'')+(className?' '+className:'')}>
  <input {...rest} type="text" inputMode="numeric" autoComplete="off" maxLength={10} value={text} readOnly={readOnly} disabled={disabled}
   aria-invalid={bad||undefined} title={rest.title??'Type the date as '+DATE_HINT}
   onFocus={event=>{editing.current=true;rest.onFocus?.(event)}}
   onChange={event=>type(event.target.value)}
   onBlur={event=>{editing.current=false;const typed=text.trim();if(typed&&!parseShortDate(typed)&&typed!==raw){setBad(true);setText(raw||shortDate(iso))}else if(parseShortDate(typed))setText(shortDate(parseShortDate(typed)));onBlur?.(event)}}/>
  {picker&&!locked&&<button type="button" className="date-pick" tabIndex={-1} aria-label="Pick a date from the calendar" title="Pick from calendar" onMouseDown={event=>event.preventDefault()} onClick={openPicker}><CalendarDays size={14} aria-hidden="true"/></button>}
  {picker&&<input ref={native} className="date-native" type="date" tabIndex={-1} aria-hidden="true" value={iso} disabled={locked} onChange={event=>{const next=event.target.value;setText(shortDate(next));setBad(false);onChange(next)}}/>}
  {hint&&<span className="date-box-hint" aria-hidden="true">{DATE_HINT}</span>}
  {bad&&<span className="date-box-error" role="alert">Use {DATE_HINT}, e.g. 11/27/26</span>}
 </span>;
}
