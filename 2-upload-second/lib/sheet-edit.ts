import {cleanText,dateInput,type RecordRow} from './model';
export const amountColumn=(column:number)=>column>=6&&column<=11||column===19;
export const dateColumn=(column:number)=>[13,16,17].includes(column);
export function cellValue(value:unknown,column:number){
 let text=cleanText(value).trim();
 if(column===12&&/^="(?:[^"]|"")*"$/.test(text))text=text.slice(2,-1).replace(/""/g,'"');
 if(amountColumn(column)){
  if(!text)return '';
  const stripped=text.replace(/[,₱]/g,'').replace(/^P\s*/i,'');
  if(!/^\d+(\.\d+)?$/.test(stripped)||!Number.isFinite(Number(stripped)))throw new Error('Amounts must be valid nonnegative numbers.');
  return Number(stripped);
 }
 if(dateColumn(column)&&text){const date=dateInput(text);if(!date||dateTextInvalid(date))throw new Error('Enter a valid date, such as 2026-10-07.');return date}
 if(text.length>10000)throw new Error('This cell is too long.');
 return text;
}
function dateTextInvalid(value:string){const date=new Date(value+'T12:00:00Z');return Number.isNaN(+date)||date.toISOString().slice(0,10)!==value}
export function pasteRows(rows:RecordRow[],startRow:number,startColumn:number,text:string){
 // Excel TSV quotes cells that contain line breaks or tabs.
 const matrix:string[][]=[[]];let value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const character=text[i];
  if(character==='"'&&(quoted||!value)){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}
  else if(!quoted&&(character==='\t'||character==='\n'||character==='\r')){
   matrix[matrix.length-1].push(value);value='';
   if(character!=='\t'){if(character==='\r'&&text[i+1]==='\n')i++;matrix.push([])}
  }else value+=character;
 }
 if(quoted)throw new Error('The pasted cells have an unclosed quote.');
 matrix[matrix.length-1].push(value);
 if(matrix.length>1&&matrix[matrix.length-1].length===1&&!matrix[matrix.length-1][0])matrix.pop();
 if(startColumn===0)throw new Error('Record numbers cannot be edited. Select a data cell.');
 if(startRow+matrix.length>rows.length||matrix.some(row=>startColumn+row.length>20))throw new Error('The paste extends beyond the existing records or columns.');
 return matrix.map((cells,offset)=>{const row=rows[startRow+offset];const values=[...row.values];cells.forEach((value,index)=>{values[startColumn+index]=cellValue(value,startColumn+index)});return {...row,values}});
}
