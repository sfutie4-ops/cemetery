import {readOnly,database} from '../../../lib/storage';
import {workbook,cleanText} from '../../../lib/model';
import {totalValues} from '../../../lib/transmittal';

// Private feed for the Google Sheet's Apps Script: the Municipal and Aranda transmittals as rows.
// Only callers that send the secret key (SHEETS_SYNC_KEY, set in Vercel) get data.
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const sheets=[['transmital municipal','transmital municipal'],['transmital Aranda','transmital Aranda']] as const;

async function sameKey(given:string,expected:string){
 const digest=async(text:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
 const [a,b]=await Promise.all([digest(given),digest(expected)]);
 let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
 return difference===0;
}

export async function GET(request:Request){
 const expected=process.env.SHEETS_SYNC_KEY??'';
 if(expected.length<32)return json({error:'Sheet sync is not set up.'},503);
 const given=request.headers.get('x-sync-key')??'';
 if(!given||!(await sameKey(given,expected)))return json({error:'Not allowed.'},401);
 try{
  const db=database();
  const [records]=await readOnly([db.prepare('SELECT * FROM cemetery.records r WHERE NOT EXISTS (SELECT 1 FROM cemetery.record_deletions d WHERE d.record_id=r.id) ORDER BY r.sheet,r.number')]);
  const rows=records.results.map((row:any)=>{const record=JSON.parse(row.payload);return {...record,sheet:row.sheet,createdAt:row.created_at,values:record.values.map((value:any,index:number)=>index===0?row.number:value)}});
  const headers=workbook.logHeaders.map((heading:string)=>cleanText(heading).trim());
  const tabs=sheets.map(([sheet,tab])=>{
   const list=rows.filter((row:any)=>row.sheet===sheet).sort((a:any,b:any)=>Number(a.values[0])-Number(b.values[0]));
   return {tab,rows:[headers,...list.map((row:any)=>row.values.map((value:unknown)=>value==null?'':value)),totalValues(list)]};
  });
  return json({updatedAt:new Date().toISOString(),tabs});
 }catch(error){
  console.error(error);
  return json({error:'Records are temporarily unavailable.'},503);
 }
}
