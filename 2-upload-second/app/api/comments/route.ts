import {database} from '../../../lib/storage';
import {editStatus,sameOrigin} from '../../../lib/edit-access';
import {validCommentAnchor} from '../../../lib/comment-anchor';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function commentsTable(){return Promise.resolve();}
export async function GET(request:Request){
 try{if(!(await editStatus(request)).canViewTransmittal)return json({error:'Admin access required to review comments.'},403);await commentsTable();const history=new URL(request.url).searchParams.get('history')==='1';const result=await database().prepare(`SELECT c.id,c.author,c.message,c.page,c.created_at,a.anchor,d.deleted_at FROM site_comments c LEFT JOIN comment_anchors a ON a.comment_id=c.id LEFT JOIN comment_deletions d ON d.comment_id=c.id ${history?'':'WHERE d.comment_id IS NULL'} ORDER BY c.created_at DESC,c.id DESC LIMIT 200`).all();return json({comments:result.results.map((row:Record<string,unknown>)=>({...row,anchor:row.anchor?JSON.parse(String(row.anchor)):null}))})}catch{return json({error:'Comments could not be loaded. Please retry.'},503)}
}
export async function POST(request:Request){
 try{
  if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length'))>12000)return json({error:'Comment is too long.'},413);
  const body=await request.json() as {id?:unknown;action?:unknown;name?:unknown;message?:unknown;page?:unknown;anchor?:unknown};
  if(body.action==='delete'){
   if(!(await editStatus(request)).canViewTransmittal)return json({error:'Admin access required to remove comments.'},403);
   if(typeof body.id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.id))return json({error:'Invalid comment.'},400);
   await commentsTable();await database().prepare('INSERT INTO comment_deletions(comment_id,deleted_at) SELECT id,? FROM site_comments WHERE id=? ON CONFLICT DO NOTHING').bind(new Date().toISOString(),body.id).run();return json({ok:true,id:body.id});
  }
  if(typeof body.id!=='string'||!/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(body.id)||typeof body.message!=='string'||!body.message.trim()||body.message.length>2000||typeof body.name!=='string'||body.name.length>80||typeof body.page!=='string'||body.page.length>60)return json({error:'Enter a comment of 1–2,000 characters.'},400);
  const access=await editStatus(request);await commentsTable();
  if(body.anchor!==undefined&&!validCommentAnchor(body.anchor))return json({error:'Choose a valid comment location.'},400);
  const author=access.role==='admin'?access.clerkName:body.name.trim()||'Guest',at=new Date().toISOString();
  // The insert and its anchor are atomic; retries cannot move the existing pin.
  await database().prepare(`WITH inserted AS (
    INSERT INTO site_comments(id,author,message,page,created_at) VALUES(?,?,?,?,?)
    ON CONFLICT DO NOTHING RETURNING id
  ) INSERT INTO comment_anchors(comment_id,anchor)
    SELECT id,? FROM inserted WHERE ?::text IS NOT NULL ON CONFLICT DO NOTHING`)
    .bind(body.id,author,body.message.trim(),body.page,at,body.anchor?JSON.stringify(body.anchor):null,body.anchor?JSON.stringify(body.anchor):null).run();
  return json({ok:true,id:body.id},201);
 }catch{return json({error:'Your comment could not be saved. Please retry.'},503)}
}
