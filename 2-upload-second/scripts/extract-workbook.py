import openpyxl,json,datetime,sys
from openpyxl.utils import get_column_letter
w=openpyxl.load_workbook(sys.argv[1]);out={}
limits={'SUMMARY':(1,15,39),'burial permit':(2,13,43),'exhumation':(1,23,41),'STATEMENT':(1,13,40),'TRANSFER':(1,10,41)}
def val(v):
 return v.isoformat()[:10] if isinstance(v,(datetime.datetime,datetime.date)) else v
def color(c,default):
 return '#'+str(c.rgb)[-6:] if c and c.type=='rgb' else default
for name,(lo,hi,last) in limits.items():
 s=w[name];widths={i:(s.sheet_format.defaultColWidth or 8.57421875)*7+5 for i in range(1,s.max_column+1)}
 for d in s.column_dimensions.values():
  for i in range(d.min,d.max+1):widths[i]=0 if d.hidden else d.width*7+5
 x={lo:0};y={1:0}
 for i in range(lo,hi+1):x[i+1]=x[i]+widths[i]
 for i in range(1,last+1):y[i+1]=y[i]+(s.row_dimensions[i].height or s.sheet_format.defaultRowHeight)*4/3
 cells=[]
 for row in s.iter_rows(min_col=lo,max_col=hi,max_row=last):
  for c in row:
   if not hasattr(c,'column') or widths[c.column]==0:continue
   if c.value is None and not any(getattr(c.border,k).style for k in ['left','right','top','bottom']):continue
   merge=next((m for m in s.merged_cells.ranges if c.coordinate in m and m.min_col==c.column and m.min_row==c.row),None)
   right=min(hi+1,merge.max_col+1) if merge else c.column+1
   bottom=min(last+1,merge.max_row+1) if merge else c.row+1
   cw=x[right]-x[c.column]
   overflow=cw
   if c.value is not None and not merge and not c.alignment.wrap_text:
    k=right
    while k<=hi and (s.cell(c.row,k).value is None or widths[k]==0):overflow+=widths[k];k+=1
   f=c.font;a=c.alignment
   style={'fontFamily':f.name or 'Arial','fontSize':(f.sz or 11)*4/3,'fontWeight':700 if f.b else 400,'fontStyle':'italic' if f.i else 'normal','textDecoration':'underline' if f.u else 'none','color':color(f.color,'#000000'),'textAlign':a.horizontal or ('right' if isinstance(c.value,(int,float)) else 'left'),'verticalAlign':a.vertical or 'bottom','whiteSpace':'pre-wrap' if a.wrap_text else 'pre','backgroundColor':color(c.fill.fgColor,'transparent') if c.fill.patternType=='solid' else 'transparent'}
   for side in ['left','right','top','bottom']:
    b=getattr(c.border,side)
    if b.style:style['border'+side.capitalize()]=('2px' if b.style in ['medium','thick'] else '1px')+' solid '+color(b.color,'#000000')
   cells.append({'ref':c.coordinate,'value':val(c.value),'formula':c.data_type=='f','x':x[c.column],'y':y[c.row],'w':cw,'overflow':overflow,'h':y[bottom]-y[c.row],'style':style,'format':c.number_format,'merged':bool(merge)})
 inputs=[];col={'burial permit':15,'exhumation':36,'STATEMENT':16,'TRANSFER':13}.get(name)
 if col:
  valid={str(v.sqref):v.formula1.strip('"').split(',') for v in s.data_validations.dataValidation if v.type=='list'}
  for r in list(range(2,23 if name=='burial permit' else 14 if name=='exhumation' else 17 if name=='STATEMENT' else 12)) + ([26,31,32] if name=='burial permit' else []):
   c=s.cell(r,col);label=s.cell(r,col-1).value
   if not label or name=='STATEMENT' and r==14:continue
   inputs.append({'ref':c.coordinate,'label':label,'value':val(c.value) if c.data_type!='f' else '', 'computed':c.data_type=='f' or r==17 and name=='burial permit','options':valid.get(c.coordinate), 'bold':bool(c.font.b),'format':c.number_format})
 out[name]={'width':x[hi+1],'height':y[last+1],'cells':cells,'inputs':inputs}
records=[]
for name in ['transmital municipal','transmital Aranda']:
 s=w[name]
 for r in range(5,s.max_row+1):
  if not s.cell(r,2).value and not s.cell(r,3).value:continue
  records.append({'id':'original-'+str(r),'sheet':name,'values':[val(s.cell(r,c).value) for c in range(1,21)],'createdAt':val(s.cell(r,21).value) or ''})
out['records']=records
out['logHeaders']=[w['transmital municipal'].cell(3,c).value or w['transmital municipal'].cell(4,c).value or '' for c in range(1,21)]
out['logHeaders'][1]='Last Name';out['logHeaders'][2]='First Name';out['logHeaders'][6]="Mayor's Permit";out['logHeaders'][7]='Niche';out['logHeaders'][8]='Perpetual'
print(json.dumps(out,ensure_ascii=False,separators=(',',':')))
