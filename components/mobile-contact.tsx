'use client';
import {useState} from 'react';
import {Phone,Copy,Check} from 'lucide-react';
import {cleanText} from '../lib/model';
import {copyTransmittal} from '../lib/transmittal-export';
export default function MobileContact({number,compact=false}:{number:string;compact?:boolean}){
 const [copied,setCopied]=useState(false),mobile=cleanText(number).trim(),dial=mobile.replace(/[^+\d]/g,'');
 if(!mobile)return <span className="contact-empty">No mobile number</span>;
 return <span className="mobile-contact" onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}><a href={'tel:'+dial} title={'Call '+mobile} aria-label={'Call '+mobile}><Phone size={13}/>{!compact&&<span>{mobile}</span>}</a><button type="button" title={copied?'Copied':'Copy '+mobile} aria-label={'Copy mobile number '+mobile} onClick={()=>void copyTransmittal({text:mobile,html:'<span>'+mobile.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]!))+'</span>'}).then(ok=>setCopied(ok))}>{copied?<Check size={13}/>:<Copy size={13}/>}</button></span>;
}
