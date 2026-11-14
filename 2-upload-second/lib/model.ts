import source from './workbook.json';
import {promissorySchema,promissoryDefaults,promissoryRecord,promissoryTotals,isPromissory} from './promissory';
export const workbook:any={...source,PROMISSORY:promissorySchema};
export const formNames=['burial permit','exhumation','STATEMENT','TRANSFER','PROMISSORY'];
export type Fields=Record<string,string|number>;
export type RecordRow={id:string;sheet:string;values:any[];createdAt:string;form?:string;fields?:Fields;revision?:number;mobile?:string};
export const statementYear=2026;
export const cleanText=(value:any)=>String(value??'').replace(/[_＿]+/g,'');
export const num=(v:any)=>Number.parseFloat(String(v??''))||0;
export const money=(v:any)=>num(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export function today(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function dateInput(v:any){
 if(!v)return '';
 const text=String(v).trim(),iso=text.match(/^(\d{4}-\d{2}-\d{2})/);if(iso)return iso[1];
 const words=text.match(/^([A-Za-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})$/);
 if(words){const month=['january','february','march','april','may','june','july','august','september','october','november','december'].findIndex(m=>m.startsWith(words[1].toLowerCase()));if(month>=0)return `${words[3]}-${String(month+1).padStart(2,'0')}-${words[2].padStart(2,'0')}`}
 const d=new Date(text);return Number.isNaN(+d)?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function dateText(v:any,short=false){if(!v)return '';const iso=dateInput(v);if(!iso)return String(v);const d=new Date(iso+'T12:00:00Z');return Number.isNaN(+d)?String(v):d.toLocaleDateString('en-US',{year:'numeric',month:short?'2-digit':'long',day:'2-digit',timeZone:'UTC'})}
export function addYears(v:any,y:number){const d=new Date(String(v));if(Number.isNaN(+d))return '';const day=d.getUTCDate();d.setUTCDate(1);d.setUTCFullYear(d.getUTCFullYear()+y);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10)}
function ordinal(n:number){return n+((n%100>=11&&n%100<=13)?'th':({1:'st',2:'nd',3:'rd'} as any)[n%10]||'th')}
export function mobileText(value:unknown){const text=cleanText(value).trim();if(text.length>40||text&&!/^[+\d\s().-]+$/.test(text))throw Error('Invalid mobile number. Use digits, spaces, +, parentheses or hyphens.');return text}
export function recordMobile(row:RecordRow){return cleanText(row.mobile??row.fields?.PH1??'').trim()}
export function defaultFields(name:string):Fields{if(name==='PROMISSORY')return promissoryDefaults();const fields:Fields=Object.fromEntries(workbook[name].inputs.filter((f:any)=>!f.computed).map((f:any)=>[f.ref,typeof f.value==='string'?cleanText(f.value):f.value??'']));if(name==='STATEMENT'){fields.P9=statementYear;fields.P18='GENAFER DELA CRUZ'}if(name==='TRANSFER')fields.M12='';fields.PH1='';return fields}
export function burialExhumationFields(f:Fields):Fields{
 return {PH1:cleanText(f.PH1),AJ2:cleanText(f.O2),AJ3:cleanText(f.O4),AJ4:cleanText(f.O5),AJ5:cleanText(f.O6),AJ9:[f.O8,f.O7].map(value=>cleanText(value).trim()).filter(Boolean).join(' '),AJ10:cleanText(f.O9)};
}
export function clearFields(name:string,f:Fields):Fields{if(name==='PROMISSORY')return promissoryDefaults();const out={...f};const prefix=name==='burial permit'?'O':name==='exhumation'?'AJ':name==='STATEMENT'?'P':'M';const rows=name==='burial permit'?[2,3,4,5,6,7,8,9,10,14,15,16,20,22,31,32,33]:name==='exhumation'?Array.from({length:10},(_,i)=>i+2):name==='STATEMENT'?[...Array.from({length:12},(_,i)=>i+2),15,16]:Array.from({length:9},(_,i)=>i+2);for(const r of rows)out[prefix+r]='';if(name==='STATEMENT')out.P9=statementYear;if(name==='TRANSFER')out.M12='';out.PH1='';return out}
export function calculate(name:string,f:Fields,day=today()):Fields{
 const o:Fields={...f};const s=(k:string)=>cleanText(f[k]).trim();const n=(k:string)=>num(f[k]);const rate=(c:string)=>c==='Perpetual'?500:c==='Niche'?250:0;const dt=new Date(day+'T12:00:00Z');const given='              Given this  '+ordinal(dt.getUTCDate())+'  day';
 if(name==='burial permit'){
  const initial=n('O13')*rate(s('O3'));const discount=s('O22')==='Yes'?initial*.2:0;const rent=initial-discount;
  const arrears=n('O15'),arrearsLabel=arrears?'Add Arrears':'',arrearsNote=arrears&&s('O14')?'for '+s('O14'):'';
  Object.assign(o,{O11:200,O12:rent,O17:200,O18:initial,O19:discount,O21:day,O26:200+initial-discount+n('O15'),B8:'                            Permit is hereby granted to ',F8:s('O4'),H8:' ,  '+s('O5')+'. ',B9:'Brgy '+s('O6')+', Hinigaran, Negros Occidental  to  '+s('O3'),B10:'at the  '+s('O2')+'  Cemetery subject to our Municipal Ordinance No. 8, Series of 1991.',F12:s('O8')+' '+s('O7'),F13:s('O9'),B15:given+' of   '+dt.toLocaleString('en-US',{month:'long',timeZone:'UTC'})+',    20 '+day.slice(2,4)+'_ at Hinigaran, Negros Occidental,',F18:s('O10'),K18:initial-discount,L18:'(for '+s('O13')+' year/s) til '+addYears(day,n('O13')).slice(0,4),F19:200,I19:arrearsLabel,K19:arrears||'',L19:arrearsNote,K20:200+initial-discount+n('O15'),F21:day,F22:addYears(day,n('O13')),K24:200,K25:initial,L25:'(for '+s('O13')+' year/s) til '+addYears(day,n('O13')).slice(0,4),I38:[s('O32'),n('O31')?'Remaining balance: ₱ '+money(n('O31')):''].filter(Boolean).join('\n'),B39:s('O3')==='Niche'?'( x )  ':'(    )  ',B40:s('O3')==='Perpetual'?'( x )  ':'(    )  '});
  const summary:any[]=[['Total',200+initial,'']];if(discount||s('O22')==='Yes')summary.push(['Less 20% Discount',discount,'ID#'+s('O20')],['Total',200+initial-discount,'']);if(arrears)summary.push([arrearsLabel,arrears,arrearsNote]);if(summary[summary.length-1][0]==='Total')summary[summary.length-1][0]='Total amount payable';else summary.push(['Total amount payable',o.O26,'']);for(let i=0;i<6;i++){o['I'+(26+i)]=summary[i]?.[0]??'';o['K'+(26+i)]=summary[i]?.[1]??'';o['L'+(26+i)]=summary[i]?.[2]??''}
 }else if(name==='exhumation'){
  Object.assign(o,{AJ12:200,E10:"Permit is hereby granted to "+s('AJ3')+', '+s('AJ4')+', Brgy., '+s('AJ5')+',',C11:'Hinigaran, Negros Occidental   to exhume the bones  of/transfer to '+s('AJ7')+' '+s('AJ6')+',',C12:'who died on  '+dateText(s('AJ8'))+(s('AJ9')?' and to be replaced by  '+s('AJ9')+' .':'.'),C13:s('AJ9')?'who died on '+dateText(s('AJ10'))+' , '+s('AJ2')+'  CEMETERY, Hinigaran,Negros Occidental':'',C19:given+'  of  '+dt.toLocaleString('en-US',{month:'long',timeZone:'UTC'})+'  '+day.slice(0,4)+'_ at Hinigaran, Negros Occidental,',F24:200,F26:200,T25:day});
  o.E25='Paid Under OR No. '+s('AJ11');
 }else if(name==='TRANSFER'){
  const dc=(s('M5')+' '+s('M4')).trim();Object.assign(o,{M11:200,A11:'permit is hereby granted to  '+s('M6')+'  of  '+s('M7')+', Brgy. '+s('M8')+',',A12:'Hinigaran, Negros Occidental,   to Exhume / transfer the bones  of  '+dc+', who died ',A13:'on '+dateText(s('M9'))+', from '+s('M2'),A14:' to '+s('M3')+'.',A22:'               Given this  '+ordinal(dt.getUTCDate())+'   day of '+dt.toLocaleString('en-US',{month:'long',timeZone:'UTC'})+' , '+day.slice(0,4)+'  at Hinigaran, Negros Occidental.',B26:'Paid Under OR. No. '+s('M10'),F26:'Date: ',G26:dateText(day),D25:'P 200.00',D27:'P 200.00'});
 }else if(name==='STATEMENT'){
  const r=rate(s('P3')),yr=s('P9'),years=Math.max(0,Math.trunc(n('P12'))),until=years&&yr&&Number.isFinite(Number(yr))?Number(yr)+years:'',adv=years*r,total=r+n('P10')+adv;
  Object.assign(o,{A32:s('P18')||'GENAFER DELA CRUZ',P9:yr,P12:years||'',P17:until,E8:s('P5')+' '+s('P4'),E10:s('P6'),E11:s('P7')+', Brgy. '+s('P8')+' Hin. Neg Occ.',F14:r,F15:n('P10'),H15:s('P11'),F26:adv,H26:years?'Advance Payment for '+years+' year'+(years>1?'s':'')+' until '+until:'',F28:total,M13:total,E37:s('P16'),E38:s('P2').toLowerCase().replace(/^./,c=>c.toUpperCase())+'  Cemetery',E39:s('P3').toUpperCase(),M22:s('P13'),M23:day,M28:n('P15'),A7:yr?'As of FY '+yr:'As of FY',C14:yr?'Current Year '+yr:'Current Year',J16:years?'Advance payment until '+until:'Advance payment',J17:yr?'Current year '+yr:'Current year',M16:adv,M17:r,M18:n('P10'),M19:total});
 }
 const finalLabels:Record<string,string[]>={'burial permit':['I20'],exhumation:['E26'],STATEMENT:['C28','J19'],TRANSFER:['B27']};
 for(const ref of finalLabels[name]??[])o[ref]='Total amount payable';
 for(const key of Object.keys(o))if(typeof o[key]==='string')o[key]=cleanText(o[key]);
 return o;
}
export function transfer(name:string,f:Fields,day=today(),createdAt=new Date().toISOString()):Omit<RecordRow,'id'>{
 if(name==='PROMISSORY')return promissoryRecord(f,day,createdAt);
 const s=(k:string)=>cleanText(f[k]).trim(),n=(k:string)=>num(f[k]),c=calculate(name,f,day);let v:any[]=[];let cem='';
 const cemeteryKey=name==='burial permit'?'O2':name==='exhumation'?'AJ2':name==='STATEMENT'?'P2':'M12';
 if(!['MUNICIPAL','ARANDA'].includes(s(cemeteryKey)))throw new Error(name==='TRANSFER'?'Please fill in the Transmittal cemetery before transferring.':'Please fill in the Cemetery before transferring.');
 if((name==='burial permit'||name==='STATEMENT')&&!['Niche','Perpetual'].includes(s(name==='burial permit'?'O3':'P3')))throw new Error('Please fill in the Classification before transferring.');
 if(name==='burial permit'){
  if(!s('O7'))throw new Error('Please fill in the Last Name of Deceased (O7) before transferring.');cem=s('O2');const niche=s('O3')==='Niche';v=[0,s('O7'),s('O8'),s('O4'),s('O5')+', Brgy '+s('O6'),'BURIAL',200,niche?c.O12:0,niche?0:c.O12,n('O15'),0,c.O26,s('O10'),day,'',cem,c.F22,s('O9'),c.I38,n('O31')||''];
 }else if(name==='exhumation'){
  if(!s('AJ6')||!s('AJ3'))throw new Error("Please fill in Deceased Last Name and Informant's Name first.");cem=s('AJ2');const note=s('AJ9')?'EXHUMED AND REPLACED BY '+s('AJ9')+' who died '+dateText(s('AJ10')):'EXHUMED BY '+s('AJ3');v=[0,s('AJ6'),s('AJ7'),s('AJ3'),s('AJ4')+', Brgy., '+s('AJ5'),'EXHUMATION',0,0,0,0,200,200,s('AJ11'),day,'',cem,'',dateText(s('AJ8')),note,''];
 }else if(name==='TRANSFER'){
  if(!s('M2')||!s('M3'))throw new Error('Please fill in the From cemetery and To cemetery before transferring.');if(!s('M4')||!s('M6'))throw new Error("Please fill in Deceased Last Name and Informant's Name first.");cem=s('M12');v=[0,s('M4'),s('M5'),s('M6'),s('M7')+', Brgy. '+s('M8'),'EXHUMATION',0,0,0,0,200,200,s('M10'),day,'',cem,'',dateText(s('M9')),'FROM '+s('M2')+' TO '+s('M3'),''];
 }else if(name==='STATEMENT'){
  if(!s('P4')||!s('P5'))throw new Error('Please fill in the Deceased Last Name and First Name first.');cem=s('P2');const arr=num(c.F15),tot=num(c.F28),amt=tot-arr,niche=s('P3')==='Niche';const note=[s('P11')?'Arrears for year '+s('P11'):'',String(c.H26)].filter(Boolean).join('; ');v=[0,s('P4'),s('P5'),s('P6'),c.E11,'STATEMENT',0,niche?amt:0,niche?0:amt,arr,0,tot,s('P13'),day,'',cem,s('P16'),'',note,n('P15')||''];
 }else throw new Error('Unknown form.');
 return {sheet:cem==='ARANDA'?'transmital Aranda':'transmital municipal',values:v,createdAt,mobile:mobileText(f.PH1),form:name,fields:{...f,...(name==='STATEMENT'?{P9:s('P9'),P12:c.P12}:{})}};
}
export function summary(records:RecordRow[],year:number,day=today()){
 const rows=records.filter(r=>!isPromissory(r)&&String(r.values[13]??'').slice(0,4)===String(year));const sum=(rs:RecordRow[],i:number)=>rs.reduce((a,r)=>a+num(r.values[i]),0),count=(rs:RecordRow[],i:number,v:any)=>rs.filter(r=>r.values[i]===v||i===5&&v==='EXHUMATION'&&r.values[i]==='TRANSFER').length;const end=addYears(day,0);const limit=new Date(day+'T12:00:00Z');limit.setUTCDate(limit.getUTCDate()+90);const due=records.filter(r=>r.values[16]&&String(r.values[16])>=end&&String(r.values[16]).slice(0,10)<=limit.toISOString().slice(0,10)).length;
 const kpi=[rows.length,sum(rows,11),count(rows,5,'BURIAL'),count(rows,5,'EXHUMATION'),count(rows,5,'STATEMENT'),rows.filter(r=>r.sheet==='transmital municipal').length,rows.filter(r=>r.sheet==='transmital Aranda').length,rows.filter(r=>!r.values[12]).length,rows.filter(r=>num(r.values[7])>0).length,rows.filter(r=>num(r.values[8])>0).length,rows.filter(r=>num(r.values[19])>0).length,due];
 const months=Array.from({length:12},(_,m)=>{const rs=rows.filter(r=>String(r.values[13]).slice(5,7)===String(m+1).padStart(2,'0'));return [new Date(2026,m,1).toLocaleString('en-US',{month:'long'}),rs.length,sum(rs,11),count(rs,5,'BURIAL'),count(rs,5,'EXHUMATION'),rs.filter(r=>num(r.values[7])>0).length,rs.filter(r=>num(r.values[8])>0).length,sum(rs,9),sum(rs,19)]});
 const breakdown=[6,7,8,9,10].map(i=>sum(rows,i));breakdown.push(breakdown.reduce((a,b)=>a+b,0));const follow=[rows.filter(r=>!r.values[1]).length,kpi[7],kpi[10],due];const cells:Fields={B5:year,F5:year+'-01-01',J5:year+'-12-31',N5:day};cells.A38='Promissory notes: '+promissoryTotals(records,year,day).count+' · Amount promised: ₱ '+money(promissoryTotals(records,year,day).amount)+' (separate from collections)';for(let i=0;i<12;i++)cells[['A','E','I','M'][i%4]+(9+2*Math.floor(i/4))]=kpi[i];months.forEach((r,i)=>r.forEach((v,j)=>{cells[String.fromCharCode(65+j)+(17+i)]=v}));for(let j=1;j<9;j++)cells[String.fromCharCode(65+j)+'29']=months.reduce((a,r)=>a+num(r[j]),0);breakdown.forEach((v,i)=>cells['L'+(17+i)]=v);follow.forEach((v,i)=>cells['N'+(26+i)]=v);return {rows,kpi,months,breakdown,follow,cells,promissory:promissoryTotals(records,year,day)};
}
