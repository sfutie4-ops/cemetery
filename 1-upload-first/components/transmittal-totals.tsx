import {money,type RecordRow} from '../lib/model';
import {columnTotals} from '../lib/transmittal';
export default function TransmittalTotals({rows,actions=true,dirty=false,status=false}:{rows:RecordRow[];actions?:boolean;dirty?:boolean;status?:boolean}){
 const totals=columnTotals(rows);
 return <tfoot><tr className="transmittal-total"><td>TOTAL</td>{actions&&<td className="screen"/>}<td colSpan={5}>{rows.length} row{rows.length===1?'':'s'}{dirty?' · Includes unsaved edits':''}</td>{Array.from({length:14},(_,index)=>{const column=index+6;return <td key={column} className={column<=11||column===19?'sheet-amount':''}>{column<=11||column===19?money(totals[column]):''}</td>})}{status&&<td className="screen"/>}</tr></tfoot>;
}
