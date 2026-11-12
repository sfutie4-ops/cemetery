import {cleanText,dateInput,dateText,type Fields} from './model';
import type {PaperRule} from './paper-layout';

// Coordinates follow the supplied burial-permit reference, on Letter paper.
const unit=816/679;
type Box=[number,number,number,number?];
const boxes:Record<string,Box>={
  B1:[20,40,614,16],B2:[20,56,614,16],B3:[20,72,614,16],B4:[20,88,614,16],B5:[20,104,614,16],B6:[20,138,614,20],
  B8:[45,173,589,18],B9:[20,191,614,17],B10:[20,208,614,17],
  B12:[20,242,108,18],E12:[128,242,10,18],F12:[139,242,243,18],
  B13:[20,260,108,17],E13:[128,260,10,17],F13:[139,260,243,17],
  B15:[65,290,569,20],B16:[20,310,614,17],
  B18:[20,341,116,18],F18:[139,341,96,18],I18:[247,341,137,18],J18:[384,341,9,18],K18:[394,341,69,18],L18:[466,341,168,18],
  B19:[20,359,108,18],E19:[128,359,10,18],F19:[139,359,96,18],I19:[247,359,137,18],K19:[394,359,69,18],L19:[466,359,168,18],
  I20:[247,377,137,18],J20:[384,377,9,18],K20:[394,377,69,18],
  B21:[20,395,116,18],F21:[139,395,96,18],B22:[20,413,116,16],F22:[139,413,96,16],
  H23:[244,428,390,18],I24:[247,446,137,17],J24:[384,446,9,17],K24:[394,446,69,17],
  I25:[247,463,137,17],K25:[394,463,69,17],L25:[466,463,168,17],
  B25:[20,463,210,17],B28:[20,512,214,18],B29:[42,530,192,17],B31:[20,563,214,18],
  B33:[20,613,614,18],B34:[20,631,614,17],B35:[20,648,614,17],
  I37:[247,681,387,17],I38:[247,698,387,101],
};
for(let row=37;row<=43;row++){
  boxes['B'+row]=[20,681+(row-37)*17,14,17];
  boxes['D'+row]=[37,681+(row-37)*17,203,row===43?30:17];
}
export function burialLayout(source:any,input:Fields){
  const values:Fields={...input};
  const positions={...boxes};
  values.B8=[cleanText(input.B8).trim(),cleanText(input.F8).trim()].filter(Boolean).join(' ')+cleanText(input.H8);
  values.B1=cleanText(source.cells.find((cell:any)=>cell.ref==='B1')?.value).trim();
  values.B15=cleanText(input.B15).trim();
  values.B29=cleanText(source.cells.find((cell:any)=>cell.ref==='B29')?.value).trim();
  values.F21=dateText(input.F21,true);
  const until=dateInput(input.F22);
  if(until){const date=new Date(until+'T12:00:00Z');values.F22=until.slice(8)+'-'+date.toLocaleString('en-US',{month:'short',timeZone:'UTC'})+'-'+until.slice(2,4)}
  const summary=Array.from({length:6},(_,i)=>26+i).filter(row=>cleanText(input['I'+row]).trim());
  // The reference shows the discount directly below the initial burial fee.
  const displayed=summary.filter((row,index)=>!(index===0&&input['I'+row]==='Total'&&/^Less\b/.test(cleanText(input['I'+summary[1]]))));
  displayed.forEach((row,index)=>{
    const y=480+index*17;
    positions['I'+row]=[247,y,147,17];positions['K'+row]=[394,y,69,17];positions['L'+row]=[466,y,168,17];
  });
  const totalRows=displayed.filter(row=>/^Total\b/i.test(cleanText(input['I'+row])));
  const bold=new Set(['B6','H23','B28','B33','I20','J20','K20',...totalRows.flatMap(row=>['I'+row,'K'+row])]);
  const originals=[...source.cells];
  if(!originals.some(cell=>cell.ref==='I19'))originals.push({...source.cells.find((cell:any)=>cell.ref==='I26'),ref:'I19'});
  const cells=originals.filter(cell=>positions[cell.ref]).map(cell=>{
    const [x,y,w,h=17]=positions[cell.ref];
    const amount=/^K\d+$/.test(cell.ref)||cell.ref==='F19';
    const header=/^B[1-6]$/.test(cell.ref);
    const fontSize=cell.ref==='B6'?14:cell.ref==='I38'?12:13;
    const checkbox=/^B(3[7-9]|4[0-3])$/.test(cell.ref);
    return {...cell,checkbox,checked:cell.ref==='B39'?input.O3==='Niche':cell.ref==='B40'?input.O3==='Perpetual':false,x:x*unit,y:y*unit,w:w*unit,overflow:w*unit,h:h*unit,merged:true,
      style:{...cell.style,fontSize:fontSize*unit,fontWeight:bold.has(cell.ref)?700:400,
        textAlign:header?'center':amount?'right':'left',verticalAlign:cell.ref==='I38'||cell.ref==='D43'?'top':'bottom',whiteSpace:cell.ref==='I38'||cell.ref==='D43'?'pre-wrap':'pre'}};
  });
  const rules:PaperRule[]=[];
  const line=(id:string,ref:string,edge:'top'|'bottom',double=false)=>{
    const [x,y,w,h=17]=positions[ref];
    rules.push({id,left:x*unit,top:(edge==='top'?y:y+h)*unit,width:w*unit,double});
  };
  for(const ref of ['F13','F18','F19','F21','F22'])line('field-'+ref,ref,'bottom');
  line('amount-K20-top','K20','top');line('amount-K20-bottom','K20','bottom',true);
  for(const row of totalRows)line('summary-'+row,'K'+row,'top');
  const lined=new Set(['F12','F13','F18','F19','F21','F22','K19','K20',...displayed.filter((row,index)=>totalRows.includes(displayed[index+1])).map(row=>'K'+row)]);
  const approved=dateText(input.O21).match(/^([A-Za-z]+).*?(\d{4})$/);
  return {sheet:{...source,width:816,height:1056,cells},values,rules,bold,lined,underlined:new Set(['B6']),dateParts:approved?[approved[1],approved[2].slice(2)]:[]};
}
