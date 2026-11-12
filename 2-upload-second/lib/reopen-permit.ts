import {cleanText,dateInput,defaultFields,formNames,num,recordMobile,transfer,type Fields,type RecordRow} from './model';
import {isPromissory,promissoryFields} from './promissory';
import {transmittalKind} from './transmittal';

export function permitForm(row:RecordRow):string|undefined {
 if(isPromissory(row))return 'PROMISSORY';
 if(row.form&&formNames.includes(row.form))return row.form;
 return ({burial:'burial permit',statement:'STATEMENT',exhumation:'exhumation',transfer:'TRANSFER'} as Record<string,string>)[transmittalKind(row)];
}

// Stored form fields retain details not represented by the twenty spreadsheet columns.
// Overlay the editable columns so reopening also includes later receipt/name corrections.
export function reopenPermitFields(row:RecordRow):Fields {
 const name=permitForm(row);if(!name)throw Error('Invalid permit type. Edit this entry in the transmittal instead.');
 if(name==='PROMISSORY')return promissoryFields(row);
 const f:Fields={...Object.fromEntries(Object.keys(defaultFields(name)).map(ref=>[ref,''])),...row.fields,PH1:recordMobile(row)},v=row.values;
 const text=(i:number)=>cleanText(v[i]).trim(),cem=row.sheet==='transmital Aranda'?'ARANDA':'MUNICIPAL';
 const refs=name==='burial permit'?['O7','O8','O4','O5','O6','O10','O2']:name==='exhumation'?['AJ6','AJ7','AJ3','AJ4','AJ5','AJ11','AJ2']:name==='STATEMENT'?['P4','P5','P6','P7','P8','P13','P2']:['M4','M5','M6','M7','M8','M10','M12'];
 refs.slice(0,3).forEach((ref,i)=>{f[ref]=text(i+1)});f[refs[5]]=text(12);f[refs[6]]=cem;
 const currentAddress=transferAddress(name,f);
 if(currentAddress!==text(4)){
  const address=text(4).match(/^(.*?),?\s*Brgy\.?\s*,?\s*(.*?)(?:,?\s+Hin\. Neg Occ\.)?$/i);
  f[refs[3]]=address?address[1].replace(/,\s*$/,''):text(4);f[refs[4]]=address?address[2]:'';
 }
 const rental=num(v[7])+num(v[8]),classification=num(v[7])>0?'Niche':num(v[8])>0?'Perpetual':'';
 if(name==='burial permit'){
  f.O3=classification||f.O3;f.O9=dateInput(v[17]);f.O15=v[9]??'';f.O31=v[19]??'';
  if(!row.fields){f.O13=classification?rental/(classification==='Niche'?250:500):'';f.O22='No';f.O32=text(18).replace(/(?:\n|^)?Remaining balance: ₱ [\d,.]+/g,'').trim()}
 }else if(name==='STATEMENT'){
  f.P3=classification||f.P3;f.P10=v[9]??'';f.P15=v[19]??'';f.P16=dateInput(v[16]);f.P9=2026;
  if(!row.fields){f.P12=classification?Math.max(0,rental/(classification==='Niche'?250:500)-1):'';f.P18='GENAFER DELA CRUZ'}
 }else if(name==='exhumation'){
  f.AJ8=dateInput(v[17]);
  if(!row.fields){const replacement=text(18).match(/^EXHUMED AND REPLACED BY (.*?) who died (.*)$/i);if(replacement){f.AJ9=replacement[1];f.AJ10=dateInput(replacement[2])}}
 }else{
  f.M9=dateInput(v[17]);if(!row.fields){const locations=text(18).match(/^FROM (.*?) TO (.*)$/i);if(locations){f.M2=locations[1];f.M3=locations[2]}}
 }
 return f;
}
function transferAddress(name:string,f:Fields){
 const s=(ref:string)=>cleanText(f[ref]).trim();
 return name==='burial permit'?s('O5')+', Brgy '+s('O6'):name==='exhumation'?s('AJ4')+', Brgy., '+s('AJ5'):name==='STATEMENT'?s('P7')+', Brgy. '+s('P8')+' Hin. Neg Occ.':s('M7')+', Brgy. '+s('M8');
}

export function updatedPermit(row:RecordRow,fields:Fields):RecordRow {
 const name=permitForm(row);if(!name)throw Error('Invalid permit type.');
 const paymentDay=dateInput(row.values[13]);if(!paymentDay)throw Error('Invalid saved payment date. Correct it in the transmittal first.');
 const next=transfer(name,fields,paymentDay,row.createdAt);
 return {...row,...next,id:row.id,createdAt:row.createdAt,revision:(row.revision??0)+1,values:[row.values[0],...next.values.slice(1)]};
}
