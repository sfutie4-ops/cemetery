import {cleanText,dateText,type Fields} from './model';
import {letterPage,type PaperRule} from './paper-layout';

type Box=[number,number,number,number];
// Same sections and proportions as the supplied transfer reference, without spreadsheet chrome.
const boxes:Record<string,Box>={
 A1:[0,0,662,84],A5:[0,84,662,21],A7:[0,126,662,24],
 A10:[64,194,598,21],A11:[0,215,662,90],
 A17:[0,341,662,45],A20:[60,404,602,24],A22:[60,446,602,42],
 B25:[8,509,142,21],D25:[150,509,72,21],B26:[8,530,285,21],F26:[297,530,70,21],G26:[367,530,184,21],
 B27:[8,551,142,25],D27:[150,551,72,25],
 A29:[0,593,295,21],A32:[0,656,295,21],A33:[34,677,261,21],
 A35:[0,719,275,21],E36:[267,740,365,21],F37:[267,761,365,21],
 A39:[0,803,350,21],A40:[0,824,350,21],A41:[0,845,350,21],
};
export function transferLayout(source:any,input:Fields){
 const page=letterPage(),unit=Math.min(page.contentWidth/662,page.contentHeight/866),left=(page.width-662*unit)/2;
 const originals=new Map(source.cells.map((cell:any)=>[cell.ref,cell]));
 const values:Fields={...input,A10:cleanText(source.cells.find((c:any)=>c.ref==='A10')?.value).trim(),
  A11:['A11','A12','A13','A14'].map(ref=>cleanText(input[ref]).trim()).join(' '),
  A17:'        '+['A17','A18'].map(ref=>cleanText(source.cells.find((c:any)=>c.ref===ref)?.value).trim()).join(' '),
  A20:cleanText(source.cells.find((c:any)=>c.ref==='A20')?.value).trim(),A22:cleanText(input.A22).trim(),
  B25:'Permit Fee -',B27:'Total amount payable',G26:dateText(input.G26),
  E36:cleanText(source.cells.find((c:any)=>c.ref==='E36')?.value).trim(),F37:'Municipal Health Officer'};
 const bold=new Set(['A7','B27','D27','A32','E36','A39','G26']),underlined=new Set(['A7','G26']),lined=new Set<string>();
 const cells=Object.entries(boxes).map(([ref,[x,y,w,h]])=>{
  const cell:any=originals.get(ref)??{...originals.get('F26') as any,ref,value:'',formula:false};
  const wrap=['A1','A11','A17','A22','B27'].includes(ref);
  return {...cell,x:left+x*unit,y:page.margin+y*unit,w:w*unit,h:h*unit,overflow:w*unit,merged:true,
   style:{...cell.style,fontSize:(ref==='A7'?18:ref==='B27'?12:ref==='A10'||wrap&&ref!=='A1'?14:16)*unit,
    textAlign:['A1','A5','A7','E36','F37'].includes(ref)?'center':ref==='D25'||ref==='D27'?'right':'left',
    verticalAlign:wrap?'top':'bottom',whiteSpace:wrap?'pre-wrap':'pre'}};
 });
 const rules:PaperRule[]=[];
 const issue=dateText(input.G26).match(/^([A-Za-z]+).*?(\d{4})$/);
 return {sheet:{...source,width:page.width,height:page.height,cells},values,rules,bold,lined,underlined,dateParts:issue?[issue[1],issue[2]]:[]};
}
