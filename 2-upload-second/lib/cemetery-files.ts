export type CemeteryFile={id:string;name:string;size:number;type:string;category:string;uploadedAt:string;url:string};
export const maxFileBytes=10*1024*1024;
export const fileKinds:Record<string,{type:string;category:string}>={pdf:{type:'application/pdf',category:'Report'},jpg:{type:'image/jpeg',category:'Map'},jpeg:{type:'image/jpeg',category:'Map'},png:{type:'image/png',category:'Map'},docx:{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',category:'Permit'},xlsx:{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',category:'Finance'},csv:{type:'text/csv',category:'Finance'}};
export function safeFilename(value:string){const name=value.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001f\u007f]/g,'').trim();if(!name||name.length>240)throw new Error('Use a filename of 1–240 characters.');return name}
export function fileKind(name:string){const extension=name.split('.').at(-1)?.toLowerCase()??'';const kind=Object.hasOwn(fileKinds,extension)?fileKinds[extension]:undefined;if(!kind)throw new Error('Choose a PDF, JPG, PNG, DOCX, XLSX or CSV file.');return kind}
export function validFileId(id:string){return /^attachments\/\d{13}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)}
export function fileSignature(name:string,bytes:Uint8Array){
 const extension=name.split('.').at(-1)?.toLowerCase();
 if(extension==='pdf')return new TextDecoder().decode(bytes.slice(0,5))==='%PDF-';
 if(extension==='jpg'||extension==='jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(extension==='png')return [137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
 if(extension==='docx'||extension==='xlsx')return bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4;
 if(extension==='csv')return !bytes.slice(0,4096).includes(0);
 return false;
}
export function fileSize(bytes:number){return bytes>=1024*1024?(bytes/1024/1024).toFixed(1)+' MB':Math.max(1,Math.round(bytes/1024))+' KB'}
