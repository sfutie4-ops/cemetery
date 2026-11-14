import {editStatus,sameOrigin} from '../../../lib/edit-access';
import {database} from '../../../lib/storage';
import {formNames, transfer, clearFields, today, cleanText, mobileText, type Fields} from '../../../lib/model';

import {promissorySheet,promissoryRecord,promissoryFields,isPromissory,refreshPromissoryText} from '../../../lib/promissory';
import {publicReports} from '../../../lib/public-reports';
import type {CemeteryScope} from '../../../lib/daily-collection';
import {cellValue} from '../../../lib/sheet-edit';
import {updatedPermit} from '../../../lib/reopen-permit';

const json = (value: unknown, status = 200) => Response.json(value, {status, headers: {'Cache-Control': 'no-store'}});
function seed(_db: any) { return Promise.resolve(); }
function validate(value: any): Fields {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Invalid form.');
  const fields: Fields = {};
  for (const [key, field] of Object.entries(value)) {
    if (!/^[A-Z]+\d+$/.test(key) || !['string', 'number'].includes(typeof field) ||
        (typeof field === 'number' && !Number.isFinite(field)) || String(field).length > 10000) throw new Error('Invalid field.');
    fields[key] = typeof field==='string'?cleanText(field):field as number;
  }
  return fields;
}
function storedRecord(row: any) {
  const record = JSON.parse(row.payload);
  return {...record, id: row.id, sheet: row.sheet, createdAt: row.created_at, revision: record.revision ?? 0,
    values: record.values.map((value: any, index: number) => index === 0 ? row.number : value)};
}
export async function GET(request:Request) {
  try {
    const url=new URL(request.url),year=Number(url.searchParams.get('year')??2026),month=url.searchParams.get('month')??today().slice(0,7),scope=(url.searchParams.get('scope')??'all') as CemeteryScope;
    if(!Number.isInteger(year)||year<2000||year>2100||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||Number(month.slice(0,4))<2000||Number(month.slice(0,4))>2100||!['all','municipal','aranda'].includes(scope))return json({error:'Invalid report filters.'},400);
    const accessRequest=editStatus(request),db = database();
    const recordsRequest=seed(db).then(()=>db.prepare('SELECT * FROM records WHERE NOT EXISTS (SELECT 1 FROM record_deletions WHERE record_id=records.id) ORDER BY sheet,number').all());
    const [access,drafts,records] = await Promise.all([accessRequest,db.prepare('SELECT * FROM drafts').all(),recordsRequest]);
    return json({drafts: Object.fromEntries(drafts.results.map((row: any) => [row.name, {
      fields: JSON.parse(row.fields), updatedAt: row.updated_at, revision: row.revision,
    }])), records: access.canViewTransmittal?records.results.map(storedRecord):[],recordsAccessible:access.canViewTransmittal,...(!access.canViewTransmittal?{publicReports:publicReports(records.results.map(storedRecord),{year,month,scope})}:{})});
  } catch (error) {
    console.error(error);
    return json({error: 'Records are temporarily unavailable. Check your connection and try again.'}, 503);
  }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return json({error: 'Invalid request origin.'}, 403);
    if (Number(request.headers.get('content-length')) > 150000) return json({error: 'The entry is too large.'}, 413);
    const access=await editStatus(request);
    
    const body: any = await request.json(), db = database(), at = new Date().toISOString();
    if (!body || typeof body !== 'object') return json({error: 'Invalid request.'}, 400);
    if(['transfer','updateRecord','updatePermit','deleteRecord','insertRecord'].includes(body.action)&&!access.canViewTransmittal)return json({error:'Log in as Admin to transfer data or access transmittal records.'},403);
    if (['save', 'transfer'].includes(body.action) && (!formNames.includes(body.name) || !Number.isInteger(body.revision) || body.revision < 0))
      return json({error: 'Invalid form or revision.'}, 400);
    if (body.action === 'save') {
      const fields = validate(body.fields);
      const row = await db.prepare(`INSERT INTO drafts(name,fields,updated_at,revision) VALUES(?,?,?,1)
        ON CONFLICT(name) DO UPDATE SET fields=excluded.fields,updated_at=excluded.updated_at,revision=drafts.revision+1
        WHERE drafts.revision=? RETURNING revision`).bind(body.name, JSON.stringify(fields), at, body.revision).first();
      if (!row) return json({error: 'This form changed in another window. Choose which version to use.'}, 409);
      return json({revision: row.revision, updatedAt: at});
    }
    if (body.action === 'transfer') {
      if (typeof body.token !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(body.token))
        return json({error: 'Invalid transfer.'}, 400);
      await seed(db);
      const existing = await db.prepare('SELECT * FROM records WHERE token=?').bind(body.token).first();
      if(existing&&!access.canViewTransmittal)return json({error:'This form was already transferred. Log in as Admin to retrieve the saved transmittal.'},403);
      if (existing) return json({record: storedRecord(existing), duplicate: true});
      const draft = await db.prepare('SELECT fields,revision FROM drafts WHERE name=?').bind(body.name).first();
      if (!draft || draft.revision !== body.revision) return json({error: 'The saved form changed. Review the latest version before transferring.'}, 409);
      const fields = validate(JSON.parse(draft.fields)), row = transfer(body.name, fields, today(), at), id = crypto.randomUUID();
      const cleared = clearFields(body.name, fields);
      const results = await db.batch([
        db.prepare(`INSERT INTO records(id,sheet,number,payload,created_at,token)
          SELECT ?,?,COALESCE(MAX(number),0)+1,?,?,? FROM records WHERE sheet=?
          HAVING EXISTS (SELECT 1 FROM drafts WHERE name=? AND revision=?) RETURNING number`)
          .bind(id, row.sheet, JSON.stringify({...row, id, revision: 0}), at, body.token, row.sheet, body.name, body.revision),
        db.prepare('UPDATE drafts SET fields=?,updated_at=?,revision=revision+1 WHERE name=? AND revision=?')
          .bind(JSON.stringify(cleared), at, body.name, body.revision),
      ]);
      if (!results[0].results.length) return json({error: 'The form changed during transfer. Review it before trying again.'}, 409);
      row.values[0] = results[0].results[0].number;
      return json({record: {...row, id, revision: 0}, fields: cleared, revision: body.revision + 1, updatedAt: at});
    }
    if(body.action==='insertRecord'){
      if(!['transmital municipal','transmital Aranda'].includes(body.sheet)||typeof body.token!=='string'||!/^([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.test(body.token)||!Array.isArray(body.values)||body.values.length!==20||body.values.some((value:any)=>value!=null&&(!['string','number'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))))return json({error:'Invalid new row.'},400);
      await seed(db);
      const existing=await db.prepare('SELECT * FROM records WHERE token=?').bind(body.token).first();
      if(existing){
        if(await db.prepare('SELECT record_id FROM record_deletions WHERE record_id=?').bind(existing.id).first())return json({error:'This row was already saved and deleted. Discard the pending row and refresh.'},409);
        return existing.sheet===body.sheet?json({record:storedRecord(existing),duplicate:true}):json({error:'Invalid row destination.'},409);
      }
      let values:any[];
      try{values=body.values.map((value:any,index:number)=>index===0?0:cellValue(value,index))}catch(e){return json({error:'Invalid cell: '+(e as Error).message},400)}
      const type=cleanText(values[5]).toUpperCase();
      if(!['BURIAL','STATEMENT','TRANSFER','EXHUMATION','EXHUME'].includes(type)||!values[13]||!values.slice(1,4).some(value=>cleanText(value).trim()))return json({error:'Please fill in a name, payment type (BURIAL, STATEMENT, TRANSFER or EXHUMATION), and payment date before saving the new row.'},400);
      values[5]=type==='EXHUME'?'EXHUMATION':type;values[15]=body.sheet==='transmital Aranda'?'ARANDA':'MUNICIPAL';
      const id=crypto.randomUUID(),record={id,sheet:body.sheet,values,createdAt:at,revision:0,mobile:mobileText(body.mobile??'')};
      const inserted=await db.prepare(`INSERT INTO records(id,sheet,number,payload,created_at,token)
        SELECT ?,?,COALESCE(MAX(number),0)+1,?,?,? FROM records WHERE sheet=? RETURNING number`)
        .bind(id,body.sheet,JSON.stringify(record),at,body.token,body.sheet).first();
      record.values[0]=inserted.number;
      return json({record});
    }
    if (body.action === 'deleteRecord') {
      if (typeof body.id !== 'string' || !body.id || body.id.length > 200 || !Number.isInteger(body.revision) || body.revision < 0)
        return json({error: 'Invalid record.'}, 400);
      await seed(db);
      const old = await db.prepare('SELECT * FROM records WHERE id=? AND NOT EXISTS (SELECT 1 FROM record_deletions WHERE record_id=records.id)').bind(body.id).first();
      if (!old) return json({id: body.id, deleted: true});
      if (storedRecord(old).revision !== body.revision) return json({error: 'This record changed in another window. Refresh before deleting it.'}, 409);
      const result = await db.prepare(`INSERT INTO record_deletions(record_id,deleted_at)
        SELECT ?,? WHERE EXISTS (SELECT 1 FROM records WHERE id=? AND payload=?)
        ON CONFLICT(record_id) DO NOTHING RETURNING record_id`).bind(body.id, at, body.id, old.payload).first();
      if (!result) return json({error: 'This record changed during deletion. Refresh and try again.'}, 409);
      return json({id: body.id, deleted: true});
    }
    if(body.action==='updatePermit'){
      if(typeof body.id!=='string'||!body.id||body.id.length>200||!Number.isInteger(body.revision)||body.revision<0)return json({error:'Invalid record.'},400);
      await seed(db);
      const old=await db.prepare('SELECT * FROM records WHERE id=? AND NOT EXISTS (SELECT 1 FROM record_deletions WHERE record_id=records.id)').bind(body.id).first();
      if(!old)return json({error:'Record not found.'},404);
      const previous=storedRecord(old);
      if(previous.revision!==body.revision)return json({error:'This record changed in another window. Return to transmittal and reopen the latest entry before saving.'},409);
      const record=updatedPermit(previous,validate(body.fields));
      // Keep the existing identity and transmission clock; routing can move the same record.
      const saved=await db.prepare('UPDATE records SET sheet=?,number=CASE WHEN sheet=? THEN number ELSE (SELECT COALESCE(MAX(number),0)+1 FROM records WHERE sheet=?) END,payload=? WHERE id=? AND payload=? AND NOT EXISTS (SELECT 1 FROM record_deletions WHERE record_id=records.id) RETURNING number')
        .bind(record.sheet,record.sheet,record.sheet,JSON.stringify(record),body.id,old.payload).first();
      if(!saved)return json({error:'This record changed while saving. Return to transmittal and reopen the latest entry before saving.'},409);
      record.values[0]=saved.number;
      return json({record});
    }
    if (body.action === 'updateRecord') {
      if (typeof body.id !== 'string' || !Number.isInteger(body.revision) || body.revision < 0 || !Array.isArray(body.values) ||
          body.values.length !== 20 || body.values.some((value: any) => value != null &&
            (!['string', 'number'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)) || String(value).length > 10000)))
        return json({error: 'Invalid record.'}, 400);
      await seed(db);
      const old = await db.prepare('SELECT * FROM records WHERE id=? AND NOT EXISTS (SELECT 1 FROM record_deletions WHERE record_id=records.id)').bind(body.id).first();
      if (!old) return json({error: 'Record not found.'}, 404);
      const record = storedRecord(old);
      if (record.revision !== body.revision) return json({error: 'This record changed in another window. Close this editor and reopen the latest record.'}, 409);
      const previousFields=record.fields?{...record.fields}:undefined;
      if(body.mobile!==undefined){record.mobile=mobileText(body.mobile);if(record.fields)record.fields={...record.fields,PH1:record.mobile};}
      record.values = body.values.map((value: any, index: number) => index === 0 ? old.number : typeof value==='string'?cleanText(value):value ?? '');
      const receiptRef: Record<string, string> = {'burial permit': 'O10', exhumation: 'AJ11', STATEMENT: 'P13', TRANSFER: 'M10'};
      if (record.form && record.fields && receiptRef[record.form]) record.fields = {...record.fields, [receiptRef[record.form]]: record.values[12]};
      const nameRefs:Record<string,string[]>={'burial permit':['O7','O8','O4'],exhumation:['AJ6','AJ7','AJ3'],STATEMENT:['P4','P5','P6'],TRANSFER:['M4','M5','M6']};
      if(record.form&&record.fields&&nameRefs[record.form])nameRefs[record.form].forEach((ref,index)=>{record.fields[ref]=record.values[index+1]});
      if(isPromissory(record)){const fields=promissoryFields(record);fields.PN14=refreshPromissoryText(fields,previousFields??fields);const note=promissoryRecord(fields,today(),record.createdAt);record.values=[old.number,...note.values.slice(1)];record.fields=note.fields;record.form='PROMISSORY'}
      record.revision++;
      const result = await db.prepare('UPDATE records SET payload=? WHERE id=? AND payload=? AND NOT EXISTS (SELECT 1 FROM record_deletions WHERE record_id=records.id) RETURNING id')
        .bind(JSON.stringify(record), body.id, old.payload).first();
      if (!result) return json({error: 'This record changed while saving. Reopen the latest record and try again.'}, 409);
      return json({record});
    }
    return json({error: 'Unknown action.'}, 400);
  } catch (error) {
    console.error(error);
    const message = (error as Error).message;
    return json({error: /^(Please fill|Invalid)/.test(message) ? message : 'Unable to save right now. Your input is still here. Please try again.'}, 400);
  }
}
