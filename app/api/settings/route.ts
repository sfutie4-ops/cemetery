import {editStatus,lockEditing,sameOrigin,loginAdmin} from '../../../lib/edit-access';
const json=(value:unknown,status=200,cookie?:string)=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function GET(request:Request){
 try{return json(await editStatus(request))}catch{return json({error:'Access is temporarily unavailable.'},503)}
}
export async function POST(request:Request){
 try{
  if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length'))>4096)return json({error:'Invalid request.'},413);
  const body=await request.json() as any;
  if(body?.action==='logout'||body?.action==='guest')return json({ok:true},200,await lockEditing(request));
  if(body?.action!=='login')return json({error:'Unknown action.'},400);
  if(typeof body.username!=='string'||body.username.length>40||typeof body.password!=='string'||body.password.length>128)return json({error:'Enter a valid username and password.'},400);
  const result=await loginAdmin(request,body.username,body.password);
  return result.status===200?json({ok:true},200,result.cookie):json({error:result.error},result.status);
 }catch{return json({error:'Unable to sign in. Please retry.'},503)}
}
