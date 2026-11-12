const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const {transfer,defaultFields}=require('../lib/model.ts');
const {permitForm,reopenPermitFields,updatedPermit}=require('../lib/reopen-permit.ts');
const stamp='2026-10-01T01:00:00.000Z',day='2026-10-01';
const fixtures={
 'burial permit':{O2:'MUNICIPAL',O3:'Niche',O4:'Test Informant',O5:'Zone 2',O6:'Pilar',O7:'Test Last',O8:'Test First',O9:'2026-09-28',O10:'000123',O13:2,O14:'Arrears Person',O15:100,O22:'Yes',O31:500,O32:'Original notes',O33:'2025-01-01',PH1:'09123456789'},
 exhumation:{AJ2:'ARANDA',AJ3:'Test Informant',AJ4:'Zone 2',AJ5:'Pilar',AJ6:'Test Last',AJ7:'Test First',AJ8:'2026-09-28',AJ9:'Replacement Person',AJ10:'2026-09-29',AJ11:'000123',PH1:'09123456789'},
 STATEMENT:{P2:'MUNICIPAL',P3:'Perpetual',P4:'Test Last',P5:'Test First',P6:'Test Informant',P7:'Zone 2',P8:'Pilar',P10:100,P11:'2025',P12:2,P13:'000123',P15:400,P16:'2027-10-01',P18:'MARVIN MIRALLES',PH1:'09123456789'},
 TRANSFER:{M2:'Custom cemetery',M3:'Another cemetery',M4:'Test Last',M5:'Test First',M6:'Test Informant',M7:'Zone 2',M8:'Pilar',M9:'2026-09-28',M10:'000123',M12:'ARANDA',PH1:'09123456789'},
 PROMISSORY:{PN2:'MUNICIPAL',PN3:'Test Informant',PN4:'Zone 2',PN5:'Pilar',PN6:'2026-12-01',PN7:500,PN8:'Remaining balance',PN12:day,PN13:'Test Deceased',PN16:'GENAFER DELA CRUZ',PN17:'2026-09-28',PN14:'Custom letter text',PN15:'custom',PH1:'09123456789'}
};
const rows=Object.entries(fixtures).map(([form,fields],index)=>({...transfer(form,{...defaultFields(form),...fields},day,stamp),id:'test-'+index,revision:3}));
for(const row of rows){
 row.values[0]=9;
 const fields=reopenPermitFields(row),next=updatedPermit(row,fields);
 assert.equal(next.id,row.id);assert.equal(next.createdAt,stamp);assert.equal(next.revision,4);assert.equal(next.values[0],9);assert.equal(next.values[13],day);assert.equal(next.mobile,'09123456789');
 assert.deepEqual(next.values,row.values,`${row.form} round trip preserves every transmittal column`);
 assert.equal(next.form,row.form);
}
const burial=structuredClone(rows[0]);burial.values[12]='000999';burial.values[1]='Edited Last';burial.values[4]='New Zone, Brgy New Barangay';
const recovered=reopenPermitFields(burial);
assert.equal(recovered.O10,'000999');assert.equal(recovered.O7,'Edited Last');assert.equal(recovered.O5,'New Zone');assert.equal(recovered.O6,'New Barangay');assert.equal(recovered.O33,'2025-01-01');
const moved=updatedPermit(burial,{...recovered,O2:'ARANDA',O31:900});
assert.equal(moved.sheet,'transmital Aranda');assert.equal(moved.values[19],900);assert.equal(moved.values[11],burial.values[11]);assert.equal(moved.values[12],'000999');
const legacy=structuredClone(rows[3]);delete legacy.form;delete legacy.fields;
assert.equal(permitForm(legacy),'TRANSFER');assert.equal(reopenPermitFields(legacy).M2,'Custom cemetery');assert.equal(reopenPermitFields(legacy).M3,'Another cemetery');
const {promissoryText}=require('../lib/promissory.ts');
assert.equal(reopenPermitFields(rows[4]).PN14,'Custom letter text');
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE record_deletions(record_id TEXT PRIMARY KEY,deleted_at TEXT NOT NULL)');
sql.exec('CREATE TABLE records(id TEXT PRIMARY KEY,sheet TEXT,number INTEGER,payload TEXT,created_at TEXT,token TEXT UNIQUE);');
const db={prepare(query){const statement=sql.prepare(query);let args=[];return {bind(...values){args=values;return this},async first(){return statement.get(...args)||null},async all(){return {results:statement.all(...args)}},async run(){statement.run(...args);return {success:true}}}},async batch(statements){return Promise.all(statements.map(statement=>statement.all()))}};
let admin=true;
const load=Module._load;
Module._load=function(request,parent,isMain){
 if(request.endsWith('/lib/storage'))return {database:()=>db};
 if(request.endsWith('/lib/edit-access'))return {editStatus:async()=>({canViewTransmittal:admin}),sameOrigin:req=>!req.headers.get('origin')||req.headers.get('origin')===new URL(req.url).origin};
 if(request.endsWith('/initial-records.json'))return [];
 return load.apply(this,arguments);
};
const {POST}=require('../app/api/cemetery/route.ts');
const insert=row=>sql.prepare('INSERT INTO records VALUES(?,?,?,?,?,?)').run(row.id,row.sheet,row.values[0],JSON.stringify(row),row.createdAt,'original-token-'+row.id);
const request=body=>new Request('https://test.local/api/cemetery',{method:'POST',headers:{'content-type':'application/json','origin':'https://test.local'},body:JSON.stringify(body)});
(async()=>{
 insert(rows[0]);insert({...rows[1],values:[20,...rows[1].values.slice(1)]});
 let result=await POST(request({action:'updatePermit',id:rows[0].id,revision:3,fields:{...reopenPermitFields(rows[0]),O2:'ARANDA',O31:900}}));
 assert.equal(result.status,200);const saved=(await result.json()).record;
 assert.equal(saved.id,rows[0].id);assert.equal(saved.values[0],21);assert.equal(saved.sheet,'transmital Aranda');assert.equal(saved.createdAt,stamp);assert.equal(saved.values[13],day);assert.equal(saved.values[12],'000123');assert.equal(saved.values[19],900);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM records').get().n,2,'saving a reopened permit must not insert another record');
 assert.equal(sql.prepare('SELECT token FROM records WHERE id=?').get(saved.id).token,'original-token-'+saved.id);
 result=await POST(request({action:'updatePermit',id:rows[0].id,revision:3,fields:fixtures['burial permit']}));assert.equal(result.status,409,'stale revisions are rejected');
 admin=false;result=await POST(request({action:'updatePermit',id:saved.id,revision:4,fields:saved.fields}));assert.equal(result.status,403,'Guests cannot update permits');admin=true;
 result=await POST(request({action:'updatePermit',id:saved.id,revision:4,fields:{...saved.fields,O2:'INVALID'}}));assert.equal(result.status,400);
 result=await POST(request({action:'updatePermit',id:'missing',revision:0,fields:saved.fields}));assert.equal(result.status,404);
 sql.prepare('INSERT INTO record_deletions VALUES(?,?)').run(saved.id,stamp);
 result=await POST(request({action:'updatePermit',id:saved.id,revision:4,fields:saved.fields}));assert.equal(result.status,404,'deleted records cannot be restored accidentally');
 console.log('Passed: all five permit round trips, latest receipt/name/address, legacy transfer recovery, same-record save/routing, unchanged transmission clock, Guest restriction, stale revisions, validation and deleted-record guards.');
 sql.close();
})().catch(error=>{console.error(error);process.exitCode=1});
