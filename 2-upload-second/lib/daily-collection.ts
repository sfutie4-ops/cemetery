import {isPromissory} from './promissory';
import {cleanText,dateInput,num,today,type RecordRow} from './model';
export type CemeteryScope='all'|'municipal'|'aranda';
export const scopeLabel:Record<CemeteryScope,string>={all:'Municipal & Aranda Cemetery',municipal:'Municipal Cemetery',aranda:'Aranda Cemetery'};
export function cemeteryRecords(records:RecordRow[],scope:CemeteryScope){return scope==='all'?records:records.filter(record=>record.sheet===(scope==='municipal'?'transmital municipal':'transmital Aranda')||isPromissory(record)&&String(record.values[15]).toLowerCase()===scope)}
export type DailyRow={date:string;receipts:number;transactions:number;amount:number;running:number;workingDay:number|null;weekend:boolean;missing:number};
export function dailyCollection(records:RecordRow[],month:string,scope:CemeteryScope='all',options:{includeWeekends?:boolean;throughToday?:boolean;day?:string}={}){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Choose a valid report month.');
 const year=Number(month.slice(0,4));if(year<2000||year>2100)throw new Error('Choose a year from 2000 to 2100.');
 const monthIndex=Number(month.slice(5))-1,end=new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();
 const day=options.day??today(),groups=new Map<string,{cents:number;receipts:Set<string>;transactions:number;missing:number}>();
 const selected=cemeteryRecords(records,scope);
 for(const record of selected){
  if(isPromissory(record))continue;
  const date=dateInput(record.values[13]);
  if(date.slice(0,7)!==month||options.throughToday!==false&&date>day)continue;
  const group=groups.get(date)??{cents:0,receipts:new Set<string>(),transactions:0,missing:0};
  group.cents+=Math.round(num(record.values[11])*100);group.transactions++;
  const receipt=cleanText(record.values[12]).trim();if(receipt)group.receipts.add(receipt.toLocaleUpperCase());else group.missing++;
  groups.set(date,group);
 }
 let cents=0,workingDays=0,missing=0,receipts=0,transactions=0;
 const rows:DailyRow[]=[];
 for(let d=1;d<=end;d++){
  const date=`${month}-${String(d).padStart(2,'0')}`;
  if(options.throughToday!==false&&date>day)break;
  const weekday=new Date(date+'T12:00:00Z').getUTCDay(),weekend=weekday===0||weekday===6,group=groups.get(date);
  if(!weekend)workingDays++;
  if(weekend&&!options.includeWeekends&&!group)continue;
  cents+=group?.cents??0;missing+=group?.missing??0;receipts+=group?.receipts.size??0;transactions+=group?.transactions??0;
  rows.push({date,receipts:group?.receipts.size??0,transactions:group?.transactions??0,amount:(group?.cents??0)/100,running:cents/100,workingDay:weekend?null:workingDays,weekend,missing:group?.missing??0});
 }
 return {rows,total:cents/100,receipts,transactions,workingDays,missing};
}
export function dailyText(reports:{label:string;report:ReturnType<typeof dailyCollection>}[],count:'receipts'|'transactions'){
 return reports.map(({label,report})=>[
  [label],['Date / Day',count==='receipts'?'No. of receipts':'No. of transactions','Amount collected','Running balance','No. of working days'],
  ...report.rows.map(row=>[row.date,row[count],row.amount.toFixed(2),row.running.toFixed(2),row.workingDay??'']),
  ['TOTAL',report[count],report.total.toFixed(2),report.total.toFixed(2),report.workingDays],
 ].map(row=>row.join('\t')).join('\r\n')).join('\r\n\r\n');
}
