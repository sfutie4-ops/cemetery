import {fileBucket} from '../../../lib/supabase-files';
import {sameOrigin} from '../../../lib/edit-access';
import {fileKind,fileSignature,maxFileBytes,safeFilename,validFileId,type CemeteryFile} from '../../../lib/cemetery-files';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function bucket():any{return fileBucket()}
function metadata(object:any):CemeteryFile{
 return {id:object.key,name:object.customMetadata?.name??'File',size:object.size,type:object.customMetadata?.type??'application/octet-stream',category:object.customMetadata?.category??'Other',uploadedAt:new Date(object.uploaded).toISOString(),url:'/api/files?id='+encodeURIComponent(object.key)};
}
export async function GET(request:Request){
 try{
  const url=new URL(request.url),id=url.searchParams.get('id'),storage=bucket();
  if(id){
   if(!validFileId(id))return json({error:'Invalid file.'},400);
   const object=await storage.get(id);if(!object)return json({error:'File not found.'},404);
   const name=safeFilename(object.customMetadata?.name??'File'),ascii=name.replace(/[^\x20-\x7e]|["\\]/g,'_');
   return new Response(object.body,{headers:{'Content-Type':object.customMetadata?.type??'application/octet-stream','Content-Disposition':`attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,'Content-Length':String(object.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});
  }
  const cursor=url.searchParams.get('cursor');if(cursor&&cursor.length>2000)return json({error:'Invalid file cursor.'},400);
  const list=await storage.list({prefix:'attachments/',limit:50,include:['customMetadata'],...(cursor?{cursor}:{})});
  return json({files:list.objects.filter((object:any)=>validFileId(object.key)).map(metadata),cursor:list.truncated?list.cursor:null});
 }catch{return json({error:'Files are temporarily unavailable. Please retry.'},503)}
}
export async function POST(request:Request){
 try{
  if(!sameOrigin(request))return json({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length'))>maxFileBytes)return json({error:'Files must be 10 MB or smaller.'},413);
  const name=safeFilename(new URL(request.url).searchParams.get('name')??''),kind=fileKind(name);
  if(!request.body)return json({error:'Choose a file to upload.'},400);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxFileBytes){await reader.cancel();return json({error:'Files must be 10 MB or smaller.'},413)}chunks.push(value)}
  if(!length)return json({error:'The file is empty.'},400);
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  if(!fileSignature(name,bytes))return json({error:'The file contents do not match its type.'},400);
  const id='attachments/'+String(9999999999999-Date.now()).padStart(13,'0')+'-'+crypto.randomUUID();
  const object=await bucket().put(id,bytes,{httpMetadata:{contentType:kind.type},customMetadata:{name,type:kind.type,category:kind.category}});
  return json({file:metadata({...object,key:id,size:length,uploaded:object.uploaded??new Date(),customMetadata:{name,type:kind.type,category:kind.category}})},201);
 }catch(error){const message=(error as Error).message;return json({error:/^(Choose|Use a filename)/.test(message)?message:'Upload failed. Please try again.'},400)}
}
export async function DELETE(request:Request){
 try{
  if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length'))>4096)return json({error:'Invalid file.'},400);
  const {id}=await request.json() as {id?:string};if(typeof id!=='string'||!validFileId(id))return json({error:'Invalid file.'},400);
  await bucket().delete(id);return json({deleted:true,id});
 }catch{return json({error:'Unable to delete this file. Please retry.'},503)}
}
