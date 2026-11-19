'use client';
import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {cleanText, dateText, money, workbook, type Fields} from '../lib/model';
import {letterPage,fitScale} from '../lib/paper-layout';
import {burialLayout} from '../lib/burial-layout';
import {statementLayout} from '../lib/statement-layout';
import {exhumationLayout} from '../lib/exhumation-layout';
import PromissoryPaper from './promissory-paper';
import {transferLayout} from '../lib/transfer-layout';

export function Bold({text, names, emphasis=true, once=false,underline=false}: {text: string; names: string[]; emphasis?: boolean; once?: boolean;underline?:boolean}) {
  const value=cleanText(text),entered=names.map(cleanText).filter(name=>name.trim());
  if(!emphasis||!entered.length)return <>{value}</>;
  const unique=[...new Set(entered)].sort((a,b)=>b.length-a.length);
  const remaining=new Map(unique.map(name=>[name.toLowerCase(),entered.filter(item=>item.toLowerCase()===name.toLowerCase()).length]));
  const expression=new RegExp('(?<![\\p{L}\\p{N}])('+unique.map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\p{L}\\p{N}])','giu');
  return <>{value.split(expression).map((part,index)=>{
    const key=part.toLowerCase(),count=remaining.get(key)??0;
    if(count>0){if(once)remaining.set(key,count-1);return <strong key={index} style={underline?{textDecoration:'underline',textUnderlineOffset:'2px',textDecorationThickness:'1px'}:undefined}>{part}</strong>}
    return part;
  })}</>;
}
const personCells:Record<string,Record<string,string[]>>={
  'burial permit':{B8:['O4'],F12:['O8','O7'],B9:['O3'],B10:['O2']},
  exhumation:{E10:['AJ3','AJ7','AJ6','AJ9','AJ2']},
  STATEMENT:{E8:['P5','P4'],E10:['P6']},
  TRANSFER:{A11:['M6','M5','M4']},
};
const signatories=['MARY GRACE S. ARCEO','WIDA P. LAGTAPON','GENAFER A. DELA CRUZ'];
const finalTotalCells:Record<string,string[]>={
  'burial permit':['I20','K20'],exhumation:['E26','F26'],
  STATEMENT:['C28','E28','F28','J19','L19','M19'],TRANSFER:['B27','D27'],
};
function cellText(cell: any, values: Fields) {
  const value = values[cell.ref] ?? (cell.formula ? '' : cell.value);
  let text = value == null ? '' : typeof value === 'number' && /0\.00|#,##/.test(cell.format) ? money(value) : String(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && cell.format !== 'General' && /[ymd]/i.test(cell.format))
    text = dateText(value, /mm\/dd/.test(cell.format));
  if (/^ {8,}\S/.test(text)) text = text.replace(/^ +/, '    ');
  return {cell, value, text:cleanText(text)};
}
function WorkbookPaper({name, values:inputValues, names = []}: {name: string; values: Fields; names?: string[]}) {
  const reference=useMemo(()=>name==='burial permit'?burialLayout(workbook[name],inputValues):name==='STATEMENT'?statementLayout(workbook[name],inputValues):name==='exhumation'?exhumationLayout(workbook[name],inputValues):name==='TRANSFER'?transferLayout(workbook[name],inputValues):null,[name,inputValues]);
  const sheet=reference?.sheet??workbook[name],values=reference?.values??inputValues;
  const page=letterPage(name==='SUMMARY');
  const host = useRef<HTMLDivElement>(null);
  const measurement=useRef<CanvasRenderingContext2D|null>(null);
  const [scale, setScale] = useState(0.5);
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let active = true;
    document.fonts.ready.then(() => { if (active) setFontsReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!host.current) return;
        const styles = getComputedStyle(host.current);
        const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
        const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
        const availableWidth = host.current.clientWidth - horizontalPadding;
        if (availableWidth <= 0) return;
        // Page scroll changes the preview's position, not the space allocated to it.
        const top = host.current.getBoundingClientRect().top + window.scrollY;
        const availableHeight = host.current.closest('.permit-modal')
          ?host.current.clientHeight-verticalPadding
          :(window.visualViewport?.height??window.innerHeight)-top-verticalPadding-16;
        const next = fitScale(page.width,page.height,availableWidth,availableHeight);
        setScale(previous => Math.abs(previous - next) < 0.0001 ? previous : next);
      });
    };
    const observer = new ResizeObserver(fit);
    if (host.current) observer.observe(host.current);
    const main=host.current?.closest('main');
    if(main)observer.observe(main);
    window.addEventListener('resize', fit);window.visualViewport?.addEventListener('resize',fit);fit();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', fit);window.visualViewport?.removeEventListener('resize',fit); };
  }, [name,page.width,page.height]);
  const cells = useMemo(() => {
    const content = sheet.cells.filter((cell:any)=>name!=='SUMMARY'||!['M12','M13','K29','N29','A39'].includes(cell.ref)).map((cell: any) => cellText(cell, values));
    if(fontsReady&&!measurement.current)measurement.current=document.createElement('canvas').getContext('2d');
    const context=measurement.current;
    const cells=content.map(({cell, value, text}: any) => {
      const bottomGap=reference?.lined.has(cell.ref)?3:0;
      let width = !cell.merged && typeof value !== 'number' ? cell.overflow : cell.w;
      // Excel overflow must stop at the next populated cell, including dynamically calculated cells.
      const next = content.filter((other: any) => other.text.trim() && other.cell.x > cell.x + 0.1 &&
        other.cell.y < cell.y + cell.h - 1 && other.cell.y + other.cell.h > cell.y + 1);
      if (next.length) width = Math.min(width, Math.min(...next.map((other: any) => other.cell.x)) - cell.x);
      width = Math.max(1, Math.min(width, sheet.width - cell.x));
      const family = cell.style.fontFamily === 'Aptos Narrow' ? 'Arial Narrow, Arial, sans-serif' : cell.style.fontFamily;
      let fontSize = Math.min(cell.style.fontSize, (cell.h-bottomGap) / (Math.max(1, text.split('\n').length) * 1.12));
      if (context && text.trim()) {
        context.font = `700 ${fontSize}px ${family}`;
        if (cell.style.whiteSpace === 'pre-wrap') {
          const linesNeeded = (size: number) => {
            context.font = `700 ${size}px ${family}`;
            return text.split('\n').reduce((total: number, paragraph: string) => {
              let lines = 1, line = '';
              for (const word of paragraph.split(/\s+/)) {
                const joined = line ? line + ' ' + word : word;
                if (line && context.measureText(joined).width > width - 5) { lines++; line = word; }
                else line = joined;
              }
              return total + lines;
            }, 0);
          };
          while (fontSize > 6 && linesNeeded(fontSize) * fontSize * 1.12 > cell.h) fontSize -= 0.25;
        } else {
          const measured = Math.max(...text.split('\n').map((line: string) => context.measureText(line).width));
          if (measured > width - 5) fontSize *= Math.max(1, width - 5) / measured;
        }
      }
      const alignment = cell.style.textAlign === 'general' && typeof value === 'number' ? 'right' : cell.style.textAlign;
      const style: CSSProperties = {...cell.style, fontFamily: family, fontSize, position: 'absolute',
        left: cell.x, top: cell.y, width, height: cell.h, display: 'flex',
        justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
        alignItems: cell.style.verticalAlign === 'center' ? 'center' : cell.style.verticalAlign === 'top' ? 'flex-start' : 'flex-end',
        padding:`0 2px ${bottomGap}px`, overflow: 'hidden', whiteSpace: cell.style.whiteSpace === 'pre-wrap' ? 'pre-wrap' : 'pre', overflowWrap: 'anywhere', zIndex: text.trim() ? 1 : 0,
      };
      const address=name==='STATEMENT'&&cell.ref==='E11'||name==='burial permit'&&cell.ref==='H8';
      const payable=finalTotalCells[name]?.includes(cell.ref)||name==='burial permit'&&/^[IK](2[6-9]|3[01])$/.test(cell.ref)&&/^total amount payable$/i.test(cleanText(values['I'+cell.ref.slice(1)]).trim());
      if(name!=='SUMMARY'){style.fontWeight=reference?.bold.has(cell.ref)||payable?700:400;for(const key of Object.keys(style))if(key.startsWith('border'))delete (style as any)[key];style.border='none';style.textDecoration='none';}
      delete style.verticalAlign;
      const issueDate=!!reference&&(cell.ref==='B15'||name==='exhumation'&&cell.ref==='C19'||name==='TRANSFER'&&cell.ref==='A22');
      const candidates=issueDate?reference!.dateParts:name==='SUMMARY'?names:[...(personCells[name]?.[cell.ref]??[]).map(ref=>cleanText(values[ref]).trim()).filter(Boolean),...signatories];
      return {ref:cell.ref,text,style,address,candidates,checkbox:cell.checkbox,checked:cell.checked,underlineTitle:reference?.underlined.has(cell.ref),underlineParts:issueDate||name==='burial permit'&&['B8','F12'].includes(cell.ref)||name==='STATEMENT'&&['E8','E10'].includes(cell.ref)};
    });
    return cells;
  }, [name,sheet,values,fontsReady,reference]);
  const printScale=reference?1:fitScale(sheet.width,sheet.height,page.contentWidth,page.contentHeight);
  return <div className="paper" ref={host} style={{'--page-width':page.width+'px','--page-height':page.height+'px'} as CSSProperties}>
    <div className="paper-stage" style={{height:page.height*scale,width:page.width*scale}}>
      <div className="paper-page" style={{width:page.width,height:page.height,transform:`scale(${scale})`}}>
      <div className="canvas" style={{position:'absolute',left:reference?0:page.margin+(page.contentWidth-sheet.width*printScale)/2,top:reference?0:page.margin,width:sheet.width,height:sheet.height,transform:`scale(${printScale})`}}>
        {cells.map(({ref,text,style,address,candidates,checkbox,checked,underlineTitle,underlineParts}: any) => <div style={style} key={ref} data-cell={ref} data-comment-target={'paper-'+name.replace(/[^A-Za-z0-9_-]/g,'-')+'-'+ref}><span style={{maxWidth:'100%',lineHeight:1.12,textDecoration:underlineTitle?'underline':undefined,textUnderlineOffset:underlineTitle?'2px':undefined}}>{checkbox?<span data-checkbox={checked?'checked':'empty'} style={{display:'inline-block',width:11,height:11,border:'1px solid #000',font:'10px/9px Arial',textAlign:'center',verticalAlign:'middle'}}>{checked?'×':''}</span>:<Bold text={text} names={candidates} emphasis={!address} once underline={underlineParts}/>}</span></div>)}
        {reference?.rules.map(rule=><div key={rule.id} data-rule={rule.id} aria-hidden="true" style={{position:'absolute',left:rule.left,top:rule.top,width:rule.width,height:rule.height??0,borderTop:rule.height?undefined:rule.double?'3px double #000':`${rule.thick?2:1}px solid #000`,borderLeft:rule.height?'1px solid #000':undefined,pointerEvents:'none'}}/>)}
      </div>
      </div>
    </div>
  </div>;
}

export default function Paper(props:{name:string;values:Fields;names?:string[];onChange?:(ref:string,value:string)=>void}){return props.name==='PROMISSORY'?<PromissoryPaper values={props.values} onChange={props.onChange}/>:<WorkbookPaper {...props}/>;}
