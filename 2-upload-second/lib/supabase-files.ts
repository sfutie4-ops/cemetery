import {createClient} from '@supabase/supabase-js';
import {database} from './storage';

function storage() {
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)throw new Error('File storage is not configured.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('cemetery-files');
}

export function fileBucket(){return {
  async get(id:string){
    const row=await database().prepare('SELECT * FROM attachment_files WHERE id=?').bind(id).first();
    if(!row)return null;
    const {data,error}=await storage().download(id);if(error)throw error;
    return {...row,key:row.id,uploaded:row.uploaded_at,body:data,size:row.size,customMetadata:{name:row.name,type:row.type,category:row.category}};
  },
  async list(options:{cursor?:string;limit:number}){
    const cursor=options.cursor??'';
    const rows=(await database().prepare('SELECT * FROM attachment_files WHERE id>? ORDER BY id LIMIT ?').bind(cursor,options.limit+1).all()).results;
    const truncated=rows.length>options.limit,selected=rows.slice(0,options.limit);
    return {objects:selected.map(row=>({...row,key:row.id,uploaded:row.uploaded_at,customMetadata:{name:row.name,type:row.type,category:row.category}})),truncated,cursor:truncated?selected.at(-1).id:undefined};
  },
  async put(id:string,bytes:Uint8Array,options:{customMetadata:{name:string;type:string;category:string}}){
    const metadata=options.customMetadata,uploaded=new Date().toISOString();
    const {error}=await storage().upload(id,bytes,{contentType:metadata.type,upsert:false});if(error)throw error;
    try{await database().prepare('INSERT INTO attachment_files(id,name,type,category,size,uploaded_at) VALUES(?,?,?,?,?,?)').bind(id,metadata.name,metadata.type,metadata.category,bytes.length,uploaded).run();}
    catch(error){await storage().remove([id]);throw error;}
    return {key:id,size:bytes.length,uploaded,customMetadata:metadata};
  },
  async delete(id:string){
    const {error}=await storage().remove([id]);if(error)throw error;
    await database().prepare('DELETE FROM attachment_files WHERE id=?').bind(id).run();
  }
};}
