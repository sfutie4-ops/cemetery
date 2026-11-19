import {cleanText,type RecordRow} from './model';
import {cellValue} from './sheet-edit';

// Reads a transmittal CSV (the site's own Export CSV, or the same 20 columns from Excel/Google Sheets)
// and returns the rows that are not already in the chosen transmittal.
export type ImportPlan={rows:any[][];duplicates:number;errors:{line:number;message:string}[]};
const SHEETS=['transmital municipal','transmital Aranda'];
const TYPES=['BURIAL','STATEMENT','TRANSFER','EXHUMATION','EXHUME'];

export function parseCsv(text:string):string[][]{
 const rows:string[][]=[[]];let value='',quoted=false;
 text=text.replace(/^﻿/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++}else quoted=false}else value+=c}
  else if(c==='"'&&!value)quoted=true;
  else if(c===','){rows[rows.length-1].push(value);value=''}
  else if(c==='\n'||c==='\r'){rows[rows.length-1].push(value);value='';if(c==='\r'&&text[i+1]==='\n')i++;rows.push([])}
  else value+=c;
 }
 if(quoted)throw new Error('The file has an unclosed quote. Export it again and retry.');
 rows[rows.length-1].push(value);
 return rows.filter(row=>row.some(cell=>cell.trim()));
}

const norm=(value:unknown)=>cleanText(value).trim().replace(/\s+/g,' ').toUpperCase();
// Same person, payment type, payment date and total = the same entry.
export function entryKey(values:any[]){return [values[1],values[2],values[3],values[5]==='EXHUME'?'EXHUMATION':values[5],values[13],Number(values[11])||0].map(norm).join('|')}

export function planImport(text:string,sheet:string,existing:RecordRow[]):ImportPlan{
 if(!SHEETS.includes(sheet))throw new Error('Open the Municipal or Aranda transmittal first.');
 const seen=new Set(existing.filter(row=>row.sheet===sheet).map(row=>entryKey(row.values)));
 const plan:ImportPlan={rows:[],duplicates:0,errors:[]};
 parseCsv(text).forEach((cells,index)=>{
  const line=index+1,first=norm(cells[0]);
  if(first==='NO.'||first==='NO'||first==='TOTAL')return;
  const raw=Array.from({length:20},(_,column)=>cells[column]??'');
  let values:any[];
  try{values=raw.map((value,column)=>column===0?0:cellValue(value,column))}catch(e){plan.errors.push({line,message:(e as Error).message});return}
  const type=norm(values[5]);
  if(!TYPES.includes(type)||!values[13]||!values.slice(1,4).some(value=>cleanText(value).trim())){plan.errors.push({line,message:'Needs a name, a type (BURIAL, STATEMENT, TRANSFER or EXHUMATION) and a payment date.'});return}
  values[5]=type==='EXHUME'?'EXHUMATION':type;
  const key=entryKey(values);
  if(seen.has(key)){plan.duplicates++;return}
  seen.add(key);plan.rows.push(values);
 });
 return plan;
}

// A fixed token per row, so importing the same file twice never saves a row twice.
export async function importToken(sheet:string,values:any[]){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sheet+'\n'+entryKey(values)+'\n'+JSON.stringify(values))));
 const hex=[...bytes.slice(0,16)].map((b,i)=>(i===6?(b&15)|64:i===8?(b&63)|128:b).toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}
