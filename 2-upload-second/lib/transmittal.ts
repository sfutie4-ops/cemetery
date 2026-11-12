import {cleanText,num,today,type RecordRow} from './model';
export const isNewRow=(row:RecordRow)=>row.id.startsWith('draft-');
export function numberRows(rows:RecordRow[]){return rows.map((row,index)=>({...row,values:[index+1,...row.values.slice(1)]}))}
export function transmittalKind(row:RecordRow){
 const type=cleanText(row.values[5]).trim().toUpperCase();
 if(type==='TRANSFER'||type==='TRANSFER OF REMAINS'||type==='EXHUMATION'&&(row.form==='TRANSFER'||/^FROM\s.+\sTO\s/i.test(cleanText(row.values[18]))))return 'transfer';
 if(type==='BURIAL')return 'burial';if(type==='STATEMENT')return 'statement';if(type==='EXHUMATION'||type==='EXHUME')return 'exhumation';
 return row.form==='TRANSFER'?'transfer':row.form==='burial permit'?'burial':row.form==='STATEMENT'?'statement':row.form==='exhumation'?'exhumation':'other';
}
export function columnTotals(rows:RecordRow[]){return Array.from({length:20},(_,column)=>rows.reduce((sum,row)=>sum+Math.round(num(row.values[column])*100),0)/100)}
export function totalValues(rows:RecordRow[]){const sums=columnTotals(rows);return sums.map((sum,column)=>column===0?'TOTAL':column>=6&&column<=11||column===19?sum:'')}
export function newTransmittalRow(sheet:string,date=today()):RecordRow{
 const values:any[]=Array(20).fill('');for(const column of [6,7,8,9,10,11,19])values[column]=0;
 values[5]='BURIAL';values[13]=date;values[15]=sheet==='transmital Aranda'?'ARANDA':'MUNICIPAL';
 return {id:'draft-'+crypto.randomUUID(),sheet,values,revision:0,createdAt:new Date().toISOString()};
}
