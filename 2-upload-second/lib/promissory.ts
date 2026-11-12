import {cleanText,dateInput,dateText,money,today,mobileText,recordMobile,type Fields,type RecordRow} from './model';
export const promissoryReceivers=['GENAFER DELA CRUZ','MARVIN MIRALLES'];
export const paymentPurposes=['Remaining balance','Burial payment','Burial payment balance','Arrears','Rental balance','Other'];
export const promissorySheet='transmital promissory';
export const promissorySchema={inputs:[
 {ref:'PN2',label:'Cemetery (optional)',options:['MUNICIPAL','ARANDA'],value:''},
 {ref:'PN3',label:'Informant name',value:''},{ref:'PN4',label:'Address / location',value:''},{ref:'PN5',label:'Barangay (optional)',value:''},
 {ref:'PN6',label:'Intended payment date',value:''},{ref:'PN7',label:'Remaining balance',value:''},{ref:'PN8',label:'Payment of / purpose',suggestions:paymentPurposes,value:''},
 {ref:'PN11',label:'Names below (optional)',value:''},{ref:'PN12',label:'Note date',value:''},{ref:'PN13',label:'Arrears / deceased name',value:''},{ref:'PN17',label:'Date of death',value:''},{ref:'PN16',label:'Receiver',options:promissoryReceivers,value:promissoryReceivers[0]},
 ],cells:[]};
export function isPromissory(row:RecordRow){return row.sheet===promissorySheet||row.form==='PROMISSORY'||row.values[5]==='PROMISSORY'}
export function promissoryDefaults():Fields{return {PN2:'',PN3:'',PN4:'',PN5:'',PN6:'',PN7:'',PN8:'',PN9:'I undertake to settle the payment described below on or before the intended payment date stated in this note.',PN10:'PROMISSORY NOTE',PN11:'',PN12:today(),PN13:'',PN14:'',PN15:'',PN16:promissoryReceivers[0],PN17:'',PH1:''}}
export function promissoryCopy(name:string,f:Fields):Fields{
 const refs=name==='burial permit'?['O2','O4','O5','O6','O8','O7']:name==='exhumation'?['AJ2','AJ3','AJ4','AJ5','AJ7','AJ6']:name==='STATEMENT'?['P2','P6','P7','P8','P5','P4']:['M12','M6','M7','M8','M5','M4'];
 const copied:Fields={PH1:cleanText(f.PH1),PN2:cleanText(f[refs[0]]),PN3:cleanText(f[refs[1]]),PN4:cleanText(f[refs[2]]),PN5:cleanText(f[refs[3]]),PN13:refs.slice(4).map(ref=>cleanText(f[ref]).trim()).filter(Boolean).join(' '),PN17:cleanText(f[name==='exhumation'?'AJ8':name==='TRANSFER'?'M9':''])};
 if(name==='burial permit'){const arrears=cleanText(f.O14).trim();copied.PN13=arrears||copied.PN13;copied.PN17=cleanText(arrears?f.O33:f.O9);copied.PN7=f.O31??'';copied.PN8='Remaining balance';}
 if(name==='STATEMENT'){copied.PN7=f.P15??'';copied.PN8='Remaining balance';if(cleanText(f.P16).trim())copied.PN6=cleanText(f.P16);if(promissoryReceivers.includes(cleanText(f.P18)))copied.PN16=cleanText(f.P18);}
 return copied;
}
export function promiseAmount(value:unknown){const text=cleanText(value).trim().replace(/[,₱]/g,'');if(!/^\d+(\.\d{1,2})?$/.test(text)||!Number.isFinite(Number(text))||Number(text)<=0)throw Error('Please fill in a payment amount greater than zero, with up to two decimal places.');return Number(text)}
export function promiseDate(value:unknown){const date=dateInput(value),d=new Date(date+'T12:00:00Z');if(!date||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==date)throw Error('Please fill in a valid intended payment date.');return date}
export function promissoryRecord(f:Fields,day=today(),createdAt=new Date().toISOString()):Omit<RecordRow,'id'>{
 if(!cleanText(f.PN3).trim())throw Error('Please fill in the informant name.');
 const amount=promiseAmount(f.PN7),intended=promiseDate(f.PN6),noteDate=promiseDate(f.PN12||day),cem=cleanText(f.PN2).trim(),death=cleanText(f.PN17).trim()?promiseDate(f.PN17):'';
 if(cem&&!['MUNICIPAL','ARANDA'].includes(cem))throw Error('Invalid cemetery.');
 const receiver=cleanText(f.PN16||promissoryReceivers[0]);if(!promissoryReceivers.includes(receiver))throw Error('Please fill in a receiver: GENAFER DELA CRUZ or MARVIN MIRALLES.');
 const address=[cleanText(f.PN4).trim(),cleanText(f.PN5).trim()?'Brgy. '+cleanText(f.PN5).trim():''].filter(Boolean).join(', ');
 return {sheet:promissorySheet,values:[0,cleanText(f.PN13),death,cleanText(f.PN3),address,'PROMISSORY',0,0,0,0,0,0,'',noteDate,cleanText(f.PN11),cem,intended,receiver,cleanText(f.PN8),amount],createdAt,mobile:mobileText(f.PH1),form:'PROMISSORY',fields:{...f,PN6:intended,PN7:amount,PN12:noteDate,PN16:receiver,PN17:death}};
}
export function promissoryFields(row:RecordRow):Fields{
 const f={...promissoryDefaults(),...row.fields},v=row.values;
 const previous=[cleanText(f.PN4).trim(),cleanText(f.PN5).trim()?'Brgy. '+cleanText(f.PN5).trim():''].filter(Boolean).join(', ');
 return {...f,PH1:recordMobile(row),PN2:cleanText(v[15]),PN3:cleanText(v[3]),...(previous===cleanText(v[4])?{}:{PN4:cleanText(v[4]),PN5:''}),PN6:cleanText(v[16]),PN7:v[19]??'',PN8:cleanText(v[18]),PN11:cleanText(v[14]),PN12:cleanText(v[13]),PN13:cleanText(v[1]),PN17:dateInput(v[2]),PN16:cleanText(v[17]||f.PN16||promissoryReceivers[0])};
}
export function promissoryBody(f:Fields){return 'I, '+cleanText(f.PN3)+', promise to pay the remaining balance of '+cleanText(f.PN13)+', who died on '+dateText(f.PN17)+', amounting to ₱ '+money(f.PN7)+', on or before '+dateText(f.PN6)+'.'}
export function promissoryText(f:Fields){return ['Republic of the Philippines','Province of Negros Occidental','Municipality of Hinigaran','Municipal Cemetery','',cleanText(f.PN10)||'PROMISSORY NOTE','','Date: '+dateText(f.PN12),'','Dear '+cleanText(f.PN16||promissoryReceivers[0])+',','',promissoryBody(f),'','Hoping for your kind consideration regarding this matter.','','Respectfully yours,','','',cleanText(f.PN3),[cleanText(f.PN4),f.PN5?'Brgy. '+cleanText(f.PN5):''].filter(Boolean).join(', '),f.PH1?'Mobile: '+cleanText(f.PH1):'','','Received by:','','',cleanText(f.PN16||promissoryReceivers[0]),'Clerk','',cleanText(f.PN11)].join('\n')}
export function refreshPromissoryText(next:Fields,previous:Fields){
 let text=cleanText(next.PN14);if(next.PN15!=='custom'||!text)return text;
 const address=(f:Fields)=>[cleanText(f.PN4),f.PN5?'Brgy. '+cleanText(f.PN5):''].filter(Boolean).join(', '),changes=new Map<string,string>();
 const add=(old:string,value:string)=>{if(old&&old!==value)changes.set(old,value)};
 add('Date: '+dateText(previous.PN12),'Date: '+dateText(next.PN12));add('Intended payment date: '+dateText(previous.PN6),'Intended payment date: '+dateText(next.PN6));add(address(previous),address(next));add('on or before '+dateText(previous.PN6),'on or before '+dateText(next.PN6));add('who died on '+dateText(previous.PN17),'who died on '+dateText(next.PN17));
 for(const ref of ['PN3','PN8','PN11','PN13','PN2','PN16','PH1'])add(cleanText(previous[ref]),cleanText(next[ref]));
 if(previous.PN7!==next.PN7)add('₱ '+money(previous.PN7),'₱ '+money(next.PN7));
 if(!changes.size)return text;
 const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return text.replace(new RegExp([...changes.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|'),'g'),value=>changes.get(value)!);
}
export function promissoryTotals(records:RecordRow[],year:number,day=today()){
 const notes=records.filter(row=>isPromissory(row)&&String(row.values[13]).slice(0,4)===String(year));
 return {count:notes.length,amount:notes.reduce((sum,row)=>sum+Math.round(Number(row.values[19]||0)*100),0)/100,overdue:notes.filter(row=>row.values[16]&&String(row.values[16])<day).length};
}
