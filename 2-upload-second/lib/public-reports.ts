import {summary,today,type RecordRow} from './model';
import {cemeteryRecords,dailyCollection,type CemeteryScope} from './daily-collection';
export type Overview=Omit<ReturnType<typeof summary>,'rows'>;
export type PublicReports={year:number;month:string;scope:CemeteryScope;overview:Overview;previous:Overview;daily:Record<CemeteryScope,ReturnType<typeof dailyCollection>>};
export type ReportOptions={year:number;month:string;scope:CemeteryScope};
export function publicReports(records:RecordRow[],options:ReportOptions):PublicReports{
 const selected=cemeteryRecords(records,options.scope);
 function overview(year:number){const {rows,...aggregate}=summary(selected,year);return aggregate}
 return {...options,overview:overview(options.year),previous:overview(options.year-1),daily:Object.fromEntries((['all','municipal','aranda'] as CemeteryScope[]).map(scope=>[scope,dailyCollection(records,options.month,scope,{includeWeekends:true,throughToday:false})])) as PublicReports['daily']};
}
export function publicDaily(report:ReturnType<typeof dailyCollection>,includeWeekends:boolean,throughToday:boolean,day=today()){
 const rows=report.rows.filter(row=>(!throughToday||row.date<=day)&&(includeWeekends||!row.weekend||row.transactions>0));
 return {rows,total:rows.reduce((sum,row)=>sum+Math.round(row.amount*100),0)/100,receipts:rows.reduce((sum,row)=>sum+row.receipts,0),transactions:rows.reduce((sum,row)=>sum+row.transactions,0),workingDays:Math.max(0,...rows.map(row=>row.workingDay??0)),missing:rows.reduce((sum,row)=>sum+(row.missing??0),0)};
}
