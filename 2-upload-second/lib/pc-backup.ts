import {cleanText,recordMobile,today,workbook,type Fields,type RecordRow} from './model';
import {numberRows} from './transmittal';

export type BackupData={forms:Record<string,{fields:Fields;revision:number;dirty:boolean;updatedAt:string}>;records:RecordRow[];reopened:{record:RecordRow;fields:Fields;dirty:boolean}|null};
export type BackupFolder={name:string;queryPermission:(options:{mode:'readwrite'})=>Promise<PermissionState>;requestPermission:(options:{mode:'readwrite'})=>Promise<PermissionState>;getDirectoryHandle:(name:string,options:{create:boolean})=>Promise<BackupFolder>;getFileHandle:(name:string,options:{create:boolean})=>Promise<{createWritable:()=>Promise<{write:(data:string)=>Promise<void>;close:()=>Promise<void>;abort:()=>Promise<void>}>}>};
export type FolderSetting={folder:BackupFolder;enabled:boolean};
const databaseName='hinigaran-cemetery-pc-backup';
export async function folderSetting(account:string,value?:FolderSetting):Promise<FolderSetting|undefined>{
 return new Promise((resolve,reject)=>{
  const open=indexedDB.open(databaseName,1);
  open.onupgradeneeded=()=>open.result.createObjectStore('folders');
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{
   const db=open.result,transaction=db.transaction('folders',value?'readwrite':'readonly'),store=transaction.objectStore('folders');
   const request=value?store.put(value,account):store.get(account);
   transaction.oncomplete=()=>{db.close();resolve(value??request.result)};
   transaction.onerror=()=>{db.close();reject(transaction.error)};
   transaction.onabort=()=>{db.close();reject(transaction.error??Error('Folder access could not be remembered.'))};
  };
 });
}

export function backupFiles(data:BackupData,account:string,at=new Date()):Record<string,string>{
 const json=JSON.stringify({format:'hinigaran-cemetery-backup',version:1,account,savedAt:at.toISOString(),...data},null,2);
 const files:Record<string,string>={'cemetery-backup.json':json,['cemetery-backup-'+today(at)+'.json']:json};
 const csv=(value:unknown)=>{let text=cleanText(value);if(/^[=+@-]/.test(text)||typeof value==='string'&&/^0\d+$/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};
 for(const [sheet,name] of [['transmital municipal','municipal'],['transmital Aranda','aranda'],['transmital promissory','promissory']]){
  const rows=numberRows(data.records.filter(row=>row.sheet===sheet));
  const matrix=sheet==='transmital promissory'?[['No.','Informant','Address','Payment of','Amount promised','Intended date','Note date','Cemetery','Receiver','Arrears / deceased','Date of death','Names below','Mobile number'],...rows.map(row=>[row.values[0],row.values[3],row.values[4],row.values[18],row.values[19],row.values[16],row.values[13],row.values[15],row.values[17],row.values[1],row.values[2],row.values[14],recordMobile(row)])]:[[...workbook.logHeaders.slice(0,20),'Mobile number'],...rows.map(row=>[...row.values,recordMobile(row)])];
  files[name+'-transmittal.csv']='\uFEFF'+matrix.map(row=>row.map(csv).join(',')).join('\r\n');
 }
 return files;
}

export async function writeBackup(folder:BackupFolder,account:string,files:Record<string,string>,active:()=>boolean=()=>true){
 if(!active())return false;
 if(await folder.queryPermission({mode:'readwrite'})!=='granted')throw new DOMException('Reconnect your backup folder to continue saving to this PC.','NotAllowedError');
 if(!active())return false;
 const root=await folder.getDirectoryHandle('Hinigaran-Cemetery-Backups',{create:true});
 const directory=await root.getDirectoryHandle(account.replace(/[^a-z0-9-]/gi,'-'),{create:true});
 // Each file is committed on close. A failed write leaves its previous file intact.
 for(const [name,content] of Object.entries(files)){
  if(!active())return false;
  const file=await directory.getFileHandle(name,{create:true}),stream=await file.createWritable();
  try{await stream.write(content);if(!active()){await stream.abort();return false}await stream.close()}
  catch(error){try{await stream.abort()}catch{}throw error}
 }
 return true;
}
