import {letterPage,letterMargin,fitScale} from './paper-layout';

// Reuse the live paper; print it outside the app's layout and modal layers.
export function printDocument(markup:string,landscape=false,hasPaper=true){
  const page=letterPage(landscape);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Print permit</title><style>
    @page{size:letter ${landscape?'landscape':'portrait'};margin:${hasPaper?'0':letterMargin+'in'}}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html,body{margin:0;padding:0;background:white;color:#000;font:16px Arial,Helvetica,sans-serif}
    .print-controls{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;padding:12px;background:#edf3f5;font:14px Arial,Helvetica,sans-serif}
    .print-controls button{padding:9px 18px;border:0;border-radius:5px;background:#167084;color:white;font:inherit;cursor:pointer}
    .print-controls button:focus-visible{outline:3px solid #23a3b9;outline-offset:2px}
    .print-controls p{margin:0}
    .print-content{width:${hasPaper?page.width:page.contentWidth}px;margin:12px auto}
    .paper{padding:0;margin:0;background:white;border:0;overflow:visible;break-inside:avoid}
    .paper-stage{position:relative;margin:0;overflow:hidden}
    .paper-page{position:absolute;top:0;left:0;transform-origin:top left;background:white}
    .canvas{transform-origin:top left;color:#000}
    .screen{display:none!important}
    .log-panel h2{font-size:16px;margin:0 0 16px}.log-panel h3{font-size:14px;margin:0 0 12px}
    table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9px;font-variant-numeric:tabular-nums}
    th,td{border:1px solid #c7c7c7;padding:3px 2px;vertical-align:top;overflow-wrap:anywhere;white-space:normal}
    th{text-align:left;font-weight:600;background:#eef3f5}tfoot td{font-weight:700}
    .log-table tr[data-kind=burial] td{background:#fff5d4}.log-table tr[data-kind=statement] td{background:#e8f2fd}.log-table tr[data-kind=transfer] td{background:#fce9e9}.log-table tr[data-kind=exhumation] td{background:#e9f6ed}
    thead{display:table-header-group}tfoot{display:table-row-group}tr{break-inside:avoid}.bold{font-weight:700}
    .daily-heading{text-align:center;margin-bottom:14px}.daily-heading h2{font-size:17px;margin:0 0 5px}.daily-heading p{font-size:13px;margin:0 0 4px}.daily-heading h3{font-size:14px;margin:0}
    .daily-tables{display:block}.daily-panel{margin-bottom:20px}.daily-table{font-size:11px}.daily-table th{background:#345d88;color:white;text-align:center;font-size:10px;padding:6px 4px}.daily-table td{padding:4px;text-align:right}.daily-table td:first-child{text-align:left}.daily-table td:nth-child(2),.daily-table td:last-child{text-align:center}.daily-table small{font-size:10px}.daily-footnote{font-size:10px;line-height:1.4;color:#333}.daily-table tfoot td{border-top:2px solid #222}
    @media print{.daily-split .daily-panel+.daily-panel{break-before:page}.daily-heading{break-after:avoid}.print-controls{display:none!important}.print-content{width:100%!important;margin:0}.paper-stage{height:var(--page-height)!important;width:var(--page-width)!important;overflow:visible}.paper-page{transform:none!important}.scroll{overflow:visible}}
  </style></head><body><div class="print-controls"><button type="button" id="print-document">Print / Save PDF</button><p id="print-status" role="status">Your print dialog will open shortly.</p></div><div class="print-content">${markup}</div></body></html>`;
}

export function openPrintView(source:HTMLElement,title:string,landscape=false):boolean{
  let popup:Window|null=null;
  try{
    // Keep opening synchronous with the click so browsers allow the new tab.
    popup=window.open('','_blank');
    if(!popup)return false;
    const view=popup;
    const copy=source.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('.screen,script').forEach(element=>element.remove());
    copy.querySelectorAll('[contenteditable]').forEach(element=>{element.removeAttribute('contenteditable');element.removeAttribute('tabindex')});
    view.document.open();
    view.document.write(printDocument(copy.outerHTML,landscape,!!copy.querySelector('.paper-page')));
    view.document.close();
    view.document.title=title+' — Hinigaran';
    view.opener=null;
    const fit=()=>{
      if(view.closed)return;
      const page=view.document.querySelector<HTMLElement>('.paper-page'),stage=page?.parentElement,content=view.document.querySelector<HTMLElement>('.print-content');
      if(!page||!stage||!content)return;
      const width=parseFloat(page.style.width),height=parseFloat(page.style.height);
      const controls=view.document.querySelector<HTMLElement>('.print-controls')?.offsetHeight??0;
      const scale=fitScale(width,height,(view.visualViewport?.width??view.innerWidth)-24,(view.visualViewport?.height??view.innerHeight)-controls-24);
      page.style.transform=`scale(${scale})`;
      stage.style.width=content.style.width=width*scale+'px';stage.style.height=height*scale+'px';
    };
    const ready=()=>{const status=view.document.getElementById('print-status');if(status)status.textContent='Letter · 8.5 × 11 in · Print / Save PDF'};
    const print=()=>{if(view.closed)return;ready();fit();try{view.focus();view.print()}catch{const status=view.document.getElementById('print-status');if(status)status.textContent='Use your browser’s Print command to print this page.'}};
    view.document.getElementById('print-document')?.addEventListener('click',print);
    view.addEventListener('resize',fit);view.addEventListener('afterprint',fit);view.visualViewport?.addEventListener('resize',fit);fit();
    // Let the copied document finish font loading and layout before printing.
    Promise.resolve(view.document.fonts?.ready).then(()=>{
      if(!view.closed){fit();view.requestAnimationFrame(()=>view.requestAnimationFrame(print))}
    }).catch(ready);
    return true;
  }catch{
    popup?.close();
    return false;
  }
}
