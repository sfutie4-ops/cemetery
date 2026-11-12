import {inputFields} from './form-layout';
import {cleanText,num,type Fields} from './model';
export type ReviewIssue={ref:string;label:string;blocking:boolean};
const important:Record<string,string[]>={
 'burial permit':['O2','O3','O4','O6','O7','O8','O9','O10','O13'],
 exhumation:['AJ2','AJ3','AJ5','AJ6','AJ7','AJ8','AJ11'],
 STATEMENT:['P2','P3','P4','P5','P6','P8','P13','P18'],
 PROMISSORY:['PN3','PN4','PN6','PN7','PN13','PN16','PN17'],
 TRANSFER:['M12','M2','M3','M4','M5','M6','M8','M9','M10'],
};
const blocking:Record<string,string[]>={PROMISSORY:['PN3','PN6','PN7'],'burial permit':['O2','O3','O7'],exhumation:['AJ2','AJ3','AJ6'],STATEMENT:['P2','P3','P4','P5'],TRANSFER:['M12','M2','M3','M4','M6']};
export function filled(value:unknown){return value!==undefined&&value!==null&&cleanText(value).trim()!==''}
export function reviewForm(name:string,fields:Fields){
 const inputs=inputFields(name).filter(field=>!field.computed),refs=[...(important[name]??[])];
 if(name==='burial permit'&&num(fields.O15)>0)refs.push('O14');
 if(name==='burial permit'&&filled(fields.O14))refs.push('O33');
 if(name==='STATEMENT'&&num(fields.P10)>0)refs.push('P11');
 if(name==='exhumation'&&filled(fields.AJ9))refs.push('AJ10');
 const issues:ReviewIssue[]=[];
 for(const ref of refs){const field=inputs.find(item=>item.ref===ref);if(!field)continue;const value=fields[ref]??field.value;
  const invalid=!filled(value)||(['O2','AJ2','P2','M12'].includes(ref)&&!['MUNICIPAL','ARANDA'].includes(String(value)))||(['O3','P3'].includes(ref)&&!['Niche','Perpetual'].includes(String(value)))||(['O13','PN7'].includes(ref)&&num(value)<=0);
  if(invalid)issues.push({ref,label:field.label,blocking:(blocking[name]??[]).includes(ref)});
 }
 return {issues,filled:inputs.filter(field=>filled(fields[field.ref]??field.value)).length,total:inputs.length};
}
