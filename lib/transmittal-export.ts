import {cleanText,dateInput,dateText,money,type RecordRow} from './model';
import {totalValues} from './transmittal';

const numeric=(index:number)=>index>=6&&index<=11||index===19;
const dates=new Set([13,16,17]);
const flat=(value:unknown)=>cleanText(value).replace(/[\t\r\n]+/g,' ').trim();
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const safe=(value:string)=>/^[=+@-]/.test(value)?"'"+value:value;

// Twenty workbook columns, no UI status/actions; text identifiers keep leading zeroes.
export function excelTransmittal(records:RecordRow[],headers:string[],includeHeaders=true,includeTotals=false){
  const rows=records.map(record=>Array.from({length:20},(_,index)=>{
    const value=record.values[index];
    return numeric(index)?money(value).replace(/,/g,''):dates.has(index)&&dateInput(value)?dateText(value,true):safe(flat(value));
  }));
  if(includeTotals)rows.push(totalValues(records).map((value,index)=>numeric(index)?money(value).replace(/,/g,''):flat(value)));
  // Plain clipboard paste also retains receipt IDs when Excel auto-detects numbers.
  const textRows=rows.map(row=>row.map((value,index)=>index===12&&value?'="'+value.replace(/"/g,'""')+'"':value));
  const text=[...(includeHeaders?[headers.slice(0,20).map(flat)]:[]),...textRows].map(row=>row.join('\t')).join('\r\n');
  const html='<html><head><meta charset="utf-8"></head><body><table>'+
    (includeHeaders?'<thead><tr>'+headers.slice(0,20).map(value=>'<th>'+escape(flat(value))+'</th>').join('')+'</tr></thead>':'')+
    '<tbody>'+rows.map((row,rowIndex)=>'<tr>'+row.map((value,index)=>{
      const format=numeric(index)?'0.00':index===0&&rowIndex<records.length?'0':dates.has(index)&&dateInput(records[rowIndex]?.values[index])?'mm/dd/yyyy':'\\@';
      return '<td style="mso-number-format:\''+format+'\'">'+escape(value)+'</td>';
    }).join('')+'</tr>').join('')+'</tbody></table></body></html>';
  return {text,html};
}
export async function copyTransmittal(data:{text:string;html:string}){
  try{
    if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined'){
      await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([data.text],{type:'text/plain'}),'text/html':new Blob([data.html],{type:'text/html'})})]);return true;
    }
  }catch{/* Plain text also pastes into separate Excel cells. */}
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(data.text);return true}}catch{}
  const area=document.createElement('textarea');area.value=data.text;area.style.cssText='position:fixed;left:0;top:0;opacity:0;font-size:16px';document.body.appendChild(area);area.focus();area.select();area.setSelectionRange(0,area.value.length);
  try{return document.execCommand('copy')}catch{return false}finally{area.remove()}
}
