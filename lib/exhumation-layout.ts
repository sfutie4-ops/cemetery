import {cleanText,dateText,type Fields} from './model';
import {letterPage,type PaperRule} from './paper-layout';

type Box=[number,number,number,number];
const boxes:Record<string,Box>={
  A2:[0,3,485,60],C6:[0,63,485,15],A8:[0,94,485,18],
  E10:[25,124,435,64],C16:[25,214,435,33],C19:[25,257,435,34],
  E24:[31,334,128,15],F24:[164,334,56,15],
  E25:[31,349,128,15],F25:[164,349,60,15],J25:[284,349,62,15],T25:[354,349,106,15],
  E26:[31,364,128,17],F26:[164,364,56,17],
  C28:[25,397,220,15],C30:[25,426,225,16],C31:[52,442,193,15],
  C33:[25,471,220,15],H33:[284,471,176,16],H34:[305,487,155,15],
  C36:[25,516,300,16],C37:[25,532,300,15],C38:[25,547,300,15],
};
export function exhumationLayout(source:any,input:Fields){
  const page=letterPage(),unit=Math.min(page.contentWidth/485,page.contentHeight/562),left=(page.width-485*unit)/2;
  const values:Fields={...input,
    E10:['E10','C11','C12','C13'].map(ref=>cleanText(input[ref]).trim()).filter(Boolean).join(' '),
    C16:['C16','C17'].map(ref=>cleanText(source.cells.find((c:any)=>c.ref===ref)?.value).trim()).join(' '),
    C19:cleanText(input.C19).trim()+' '+cleanText(source.cells.find((c:any)=>c.ref==='C20')?.value).trim(),
    C6:'o0o',E25:'Paid Under OR No.',F25:cleanText(input.AJ11),T25:dateText(input.T25),
  };
  for(const ref of ['C31','H33','H34'])values[ref]=cleanText(source.cells.find((c:any)=>c.ref===ref)?.value).trim();
  const bold=new Set(['A8','E26','F26','C30','H33','C36']),underlined=new Set(['A8']),lined=new Set(['F24','F25','F26']);
  const originals=new Map(source.cells.map((cell:any)=>[cell.ref,cell]));
  const cells=Object.entries(boxes).map(([ref,[x,y,w,h]])=>{
    const cell:any=originals.get(ref)??{...originals.get('E25') as any,ref,value:'',formula:false};
    return {...cell,x:left+x*unit,y:page.margin+y*unit,w:w*unit,h:h*unit,overflow:w*unit,merged:true,
      style:{...cell.style,fontSize:(ref==='A8'?13:ref==='E26'?11:12)*unit,
        textAlign:['A2','C6','A8'].includes(ref)?'center':['F24','F26'].includes(ref)?'right':'left',
        verticalAlign:['A2','E10','C16','C19'].includes(ref)?'top':'bottom',
        whiteSpace:['A2','E10','C16','C19'].includes(ref)?'pre-wrap':'pre'}};
  });
  const rules:PaperRule[]=['F24','F25','F26'].map(ref=>{const [x,y,w,h]=boxes[ref];return {id:'exhumation-'+ref,left:left+x*unit,top:page.margin+(y+h)*unit,width:w*unit}});
  const issued=dateText(input.T25).match(/^([A-Za-z]+).*?(\d{4})$/);
  return {sheet:{...source,width:page.width,height:page.height,cells},values,rules,bold,lined,underlined,dateParts:issued?[issued[1],issued[2]]:[]};
}
