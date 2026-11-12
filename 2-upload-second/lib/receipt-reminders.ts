import {isPromissory} from './promissory';
import type {RecordRow} from './model';
import {transmittalKind} from './transmittal';
export const RECEIPT_AGE=5*60*60*1000,RECEIPT_SNOOZE=10*60*1000;
export function overdueReceipts(records:RecordRow[],now:number){return records.filter(row=>!isPromissory(row)&&!String(row.values[12]??'').trim()&&Number.isFinite(Date.parse(row.createdAt))&&now-Date.parse(row.createdAt)>=RECEIPT_AGE)}
export function receiptLabel(row:RecordRow){const kind=transmittalKind(row);return {cemetery:row.sheet==='transmital Aranda'?'Aranda':'Municipal',type:kind==='other'?String(row.values[5]||'Payment'):kind[0].toUpperCase()+kind.slice(1),name:[row.values[2],row.values[1]].map(value=>String(value??'').trim()).filter(Boolean).join(' ')||String(row.values[3]||'Name missing')}}
export function reminderBounds(x:number,y:number,width:number,height:number,cardWidth=192,cardHeight=192){return {x:Math.max(8,Math.min(x,Math.max(8,width-cardWidth-8))),y:Math.max(8,Math.min(y,Math.max(8,height-cardHeight-8)))}}
// createdAt is the server timestamp of the transmittal insert, never the payment date.
export function missingReceiptText(row:RecordRow,now:number){
 if(String(row.values[12]??'').trim())return '';
 const start=Date.parse(row.createdAt);if(!Number.isFinite(start))return 'Missing O.R. · time unavailable';
 const minutes=Math.floor(Math.max(0,now-start)/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),remaining=minutes%60;
 const elapsed=[days?days+'d':'',hours?hours+'h':'',remaining?remaining+'m':''].filter(Boolean).join(' ')||'less than 1m';
 return 'Missing O.R. · '+elapsed;
}
