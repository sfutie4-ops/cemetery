import {cleanText,dateText,type Fields} from './model';
import {letterPage,type PaperRule} from './paper-layout';

// Reference coordinates exclude the spreadsheet chrome and fit one Letter page.
type Box=[number,number,number,number];
const boxes:Record<string,Box>={
  A1:[30,17,465,15],A2:[30,32,465,15],A3:[30,47,465,15],
  office:[30,62,465,15],A4:[30,77,465,15],A6:[30,106,465,15],A7:[30,121,465,15],
  A8:[30,151,84,15],D8:[114,151,7,15],E8:[121,151,161,15],
  A10:[30,181,84,15],D10:[114,181,7,15],E10:[121,181,161,15],
  A11:[30,196,84,15],D11:[114,196,7,15],E11:[121,196,374,15],
  C13:[42,226,150,15],J13:[307,226,115,15],L13:[427,226,8,15],M13:[435,226,60,15],
  C14:[42,241,86,15],F14:[128,241,64,15],C15:[42,256,86,15],F15:[128,256,64,15],H15:[205,256,77,30],
  J15:[307,256,115,15],J16:[307,271,128,15],M16:[435,271,60,15],
  J17:[307,286,115,15],K17:[422,286,5,15],L17:[427,286,8,15],M17:[435,286,60,15],
  J18:[307,301,115,15],K18:[422,301,5,15],M18:[435,301,60,15],
  J19:[307,316,115,15],K19:[422,316,5,15],L19:[427,316,8,15],M19:[435,316,60,15],
  J22:[307,361,115,15],K22:[422,361,5,15],M22:[435,361,60,15],
  J23:[307,376,115,15],K23:[422,376,5,15],M23:[435,376,60,15],
  C26:[42,436,86,15],F26:[128,436,64,15],H26:[205,436,77,45],
  J26:[307,436,188,15],J27:[307,451,188,15],
  C28:[42,453,72,30],E28:[114,467,14,15],F28:[128,466,64,16],
  J28:[307,466,115,16],K28:[422,466,5,16],L28:[427,466,8,16],M28:[435,466,60,16],
  A30:[30,526,252,15],I30:[285,526,210,15],
  A32:[30,571,252,15],I32:[285,571,210,15],C33:[54,586,120,15],I33:[306,586,189,15],
  A35:[30,631,84,15],D35:[114,631,7,15],I35:[285,631,210,15],E36:[121,646,175,15],
  A37:[30,661,84,15],D37:[114,661,7,15],E37:[121,661,161,15],
  A38:[30,676,84,15],D38:[114,676,7,15],E38:[121,676,161,15],I38:[285,676,210,15],
  E39:[121,691,161,15],I39:[285,691,210,15],I40:[285,706,210,15],
};
export function statementLayout(source:any,input:Fields){
  const page=letterPage(),unit=page.contentHeight/705,left=(page.width-465*unit)/2;
  const x=(n:number)=>left+(n-30)*unit,y=(n:number)=>page.margin+(n-16)*unit;
  const values:Fields={...input,office:'OFFICE OF THE MAYOR',C13:'Assessment:',C33:'Clerk',I33:'Municipal Mayor',J27:'Payment',
    E11:[input.P7?cleanText(input.P7).trim():'',input.P8?'Brgy. '+cleanText(input.P8).trim():'','Hinigaran, Negros Occidental'].filter(Boolean).join(', '),
    C28:'Total amount\npayable',E28:'P',M23:dateText(input.M23,true),E37:dateText(input.E37,true)};
  const bold=new Set(['A6','A7','C13','J13','L13','M13','C28','E28','F28','J19','L19','M19','A32','I32','I38']);
  const underlined=new Set(['A6','A7','C13','E37','E38','E39']);
  const lined=new Set(['E8','E10','E11','F14','F15','M13','M18','M22','M23','F26','F28','M28']);
  const originals=new Map(source.cells.map((cell:any)=>[cell.ref,cell]));
  const cells=Object.entries(boxes).map(([ref,[bx,by,w,h]])=>{
    const cell:any=originals.get(ref)??{...originals.get('A1') as any,ref,value:'',formula:false};
    const fontSize=ref==='E36'?10:['H15','H26'].includes(ref)?9:['A6','A7'].includes(ref)?13:['C28','J19'].includes(ref)?11:12;
    return {...cell,x:x(bx),y:y(by),w:w*unit,h:h*unit,overflow:w*unit,merged:true,
      format:/^(F(14|15|26|28)|M(13|16|17|18|19|28))$/.test(ref)?'#,##0.00':cell.format,
      style:{...cell.style,fontSize:fontSize*unit,fontWeight:bold.has(ref)?700:400,
        textAlign:/^A[1-7]$/.test(ref)||ref==='office'||ref==='C13'?'center':/^[FM]\d+$/.test(ref)?'right':'left',
        verticalAlign:['H15','H26','C28'].includes(ref)?'top':'bottom',whiteSpace:['H15','H26','C28'].includes(ref)?'pre-wrap':'pre'}};
  });
  const rules:PaperRule[]=[];
  const line=(id:string,bx:number,by:number,w:number,thick=false)=>rules.push({id,left:x(bx),top:y(by),width:w*unit,thick});
  for(const ref of ['F14','F15','M13','M18','M22','M23','F26']){
    const [bx,by,w,h]=boxes[ref];line('statement-'+ref,bx,by+h,w);
  }
  line('statement-address',121,211,161);line('statement-total-top',128,463,64);
  line('statement-payment-divider',307,346,188,true);line('statement-receipt-divider',307,406,188,true);
  line('statement-signature',121,646,161);
  rules.push({id:'statement-column-divider',left:x(285),top:y(221),width:0,height:261*unit});
  return {sheet:{...source,width:page.width,height:page.height,cells},values,rules,bold,lined,underlined,dateParts:[] as string[]};
}
