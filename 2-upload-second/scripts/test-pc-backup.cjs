const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const {backupFiles,writeBackup}=require('../lib/pc-backup.ts');
const values=Array(20).fill('');Object.assign(values,{0:7,1:'Test Name',3:'=unsafe()',5:'BURIAL',11:200,12:'0000123',13:'2026-10-22'});
const data={forms:{'burial permit':{fields:{O4:'Unsaved informant',PH1:'09123456789'},revision:3,dirty:true,updatedAt:''}},records:[{id:'test',sheet:'transmital municipal',values,createdAt:'2026-10-01T01:00:00Z',mobile:'09123456789'}],reopened:{record:{id:'test'},fields:{O31:500},dirty:true}};
const files=backupFiles(data,'marv',new Date('2026-10-21T17:00:00Z'));
assert.ok(files['cemetery-backup-2026-10-22.json'],'daily date uses Philippine local time');
const saved=JSON.parse(files['cemetery-backup.json']);assert.equal(saved.forms['burial permit'].fields.O4,'Unsaved informant');assert.equal(saved.records[0].values[12],'0000123');assert.equal(saved.reopened.fields.O31,500);
assert.ok(files['municipal-transmittal.csv'].includes("'0000123"));assert.ok(files['municipal-transmittal.csv'].includes("'=unsafe()"));assert.ok(files['municipal-transmittal.csv'].includes("'09123456789"));
assert.ok(files['aranda-transmittal.csv']);assert.ok(files['promissory-transmittal.csv']);
let permission='granted',abortCount=0,fail=false,requests=0;
const committed=new Map(),paths=[];
function directory(path='') {return {name:path,async queryPermission(){return permission},async requestPermission(){requests++;return permission},async getDirectoryHandle(name){paths.push(name);return directory(path+'/'+name)},async getFileHandle(name){return {async createWritable(){let pending;return {async write(content){if(fail)throw Error('disk full');pending=content},async close(){committed.set(path+'/'+name,pending)},async abort(){abortCount++}}}}}}}
(async()=>{
 const root=directory('selected');assert.equal(await writeBackup(root,'marv',files),true);assert.equal(committed.size,5);assert.ok(paths.includes('Hinigaran-Cemetery-Backups'));assert.ok(paths.includes('marv'));assert.equal(requests,0,'automatic writes never trigger permission prompts');
 const before=new Map(committed);fail=true;await assert.rejects(writeBackup(root,'marv',files),/disk full/);assert.deepEqual(committed,before);assert.equal(abortCount,1);fail=false;
 permission='prompt';await assert.rejects(writeBackup(root,'marv',files),{name:'NotAllowedError'});assert.equal(requests,0);assert.deepEqual(committed,before);
 permission='granted';assert.equal(await writeBackup(root,'marv',files,()=>false),false);assert.deepEqual(committed,before);
 console.log('Passed: complete JSON with unsaved/reopened edits, three safe CSVs, leading zeros, daily dates, account folders, serialized file commits, write failure preservation, permission checks and cancelled saves.');
})().catch(e=>{console.error(e);process.exitCode=1});
