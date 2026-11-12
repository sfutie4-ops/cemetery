import {database} from './storage';
const cookieName='cemetery_admin';
const iterations=100000;
// A fixed dummy hash keeps unknown-user checks comparable without copying old credentials.
const unknownUser={salt:'0'.repeat(64),hash:'0'.repeat(64)};
export function accessTables(){return Promise.resolve();}
function hex(bytes:ArrayBuffer|Uint8Array){return [...new Uint8Array(bytes instanceof Uint8Array?bytes.buffer:bytes)].map(n=>n.toString(16).padStart(2,'0')).join('')}
function random(){return hex(crypto.getRandomValues(new Uint8Array(32)))}
async function digest(value:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
export async function passwordHash(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations,hash:'SHA-256'},key,256));
}
export function sameOrigin(request:Request){
 const origin=request.headers.get('origin');
 return (!origin||origin===new URL(request.url).origin)&&request.headers.get('sec-fetch-site')!=='cross-site';
}
async function sessionHash(request:Request){
 const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 return token&&/^[a-f0-9]{64}$/.test(token)?digest(token):null;
}
export async function editStatus(request:Request){
 const token=await sessionHash(request),now=Date.now();
 const user=token?await database().prepare('SELECT u.username,u.name FROM admin_sessions s JOIN admin_users u ON u.username=s.username WHERE s.token_hash=? AND s.revision=u.revision AND s.expires_at>?').bind(token,now).first():null;
 return {role:user?'admin':'guest',username:user?.username??null,clerkName:user?.name??null,canEdit:true,canViewTransmittal:!!user};
}
function sessionCookie(token:string,seconds=43200){return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`}
export async function loginAdmin(request:Request,username:string,password:string){
 await accessTables();
 const db=database(),client=await digest('admin:'+ (request.headers.get('x-nf-client-connection-ip')??request.headers.get('cf-connecting-ip')??'unknown')),now=Date.now();
 const attempt=await db.prepare(`INSERT INTO edit_attempts(client,failures,started_at) VALUES(?,1,?)
  ON CONFLICT(client) DO UPDATE SET failures=CASE WHEN edit_attempts.started_at<? THEN 1 ELSE edit_attempts.failures+1 END,
  started_at=CASE WHEN edit_attempts.started_at<? THEN excluded.started_at ELSE edit_attempts.started_at END RETURNING failures`).bind(client,now,now-900000,now-900000).first();
 if(attempt.failures>5)return {status:429,error:'Too many attempts. Try again in 15 minutes.'};
 const user=await db.prepare('SELECT * FROM admin_users WHERE username=?').bind(username.trim().toLowerCase()).first();
 const candidate=await passwordHash(password,user?.salt??unknownUser.salt),expected=user?.hash??unknownUser.hash;
 let difference=candidate.length^expected.length;
 for(let i=0;i<candidate.length;i++)difference|=candidate.charCodeAt(i)^expected.charCodeAt(i);
 if(!user||difference)return {status:401,error:'Incorrect username or password.'};
 const token=random();
 await db.batch([
  db.prepare('DELETE FROM edit_attempts WHERE client=?').bind(client),
  db.prepare('DELETE FROM admin_sessions WHERE expires_at<?').bind(now),
  db.prepare('INSERT INTO admin_sessions(token_hash,username,revision,expires_at) VALUES(?,?,?,?)').bind(await digest(token),user.username,user.revision,now+43200000),
 ]);
 return {status:200,cookie:sessionCookie(token)};
}
export async function lockEditing(request:Request){
 const token=await sessionHash(request);
 if(token)await database().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(token).run();
 return sessionCookie('',0);
}
