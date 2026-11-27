'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {cleanText, clearFields, defaultFields, formNames, type Fields, type RecordRow} from '../lib/model';
import type {PublicReports,ReportOptions} from '../lib/public-reports';
import {ApiError, cemeteryApi, type Draft, type Snapshot} from '../lib/cemetery-api';
import {isNewRow} from '../lib/transmittal';

type FormState = {fields: Fields; revision: number; updatedAt: string; dirty: boolean; conflict?: Draft; saveError?: string};
type State = {forms: Record<string, FormState>; records: RecordRow[]; loaded: boolean; online: boolean; lastSync: string;recordsAccessible:boolean;publicReports?:PublicReports};
type SaveResult = {revision: number; updatedAt: string};
type TransferResult = SaveResult & {record: RecordRow; fields: Fields; duplicate?: boolean};
// The last snapshot is kept for this browser tab only (sessionStorage), so a refresh shows the records at once
// while the fresh copy loads. Admin records are kept apart from the public view and removed on logout.
const SNAPSHOT='cemetery-snapshot-v1:';
const snapshotKey=(admin:boolean)=>SNAPSHOT+(admin?'admin':'guest');
function readSnapshot(admin:boolean,query:string):Snapshot|null{
  try{const saved=JSON.parse(sessionStorage.getItem(snapshotKey(admin))??'null');return saved&&saved.query===query&&saved.data?saved.data as Snapshot:null}catch{return null}
}
function writeSnapshot(admin:boolean,query:string,data:Snapshot){try{sessionStorage.setItem(snapshotKey(admin),JSON.stringify({query,data}))}catch{/* full or blocked: skip */}}
function dropSnapshot(admin:boolean){try{sessionStorage.removeItem(snapshotKey(admin))}catch{}}
// Drafts from the server replace local forms only when they are newer and the local copy has no unsaved typing.
function mergeSnapshot(old:State,data:Snapshot,fresh:boolean):State{
  return {...old, loaded: true, online: true, lastSync: fresh?new Date().toISOString():old.lastSync, records: data.records,recordsAccessible:data.recordsAccessible,publicReports:data.publicReports,
    forms: Object.fromEntries(formNames.map(name => {
      const local = old.forms[name], remote = data.drafts[name];
      if (!remote || remote.revision <= local.revision) return [name, fresh && !old.online && !local.conflict ? {...local, saveError: undefined} : local];
      if (local.dirty) return [name, fresh ? {...local, conflict: remote} : local];
      return [name, {...remote, dirty: false}];
    })),
  };
}
const initialState = (): State => ({
  forms: Object.fromEntries(formNames.map(name => [name, {fields: defaultFields(name), revision: 0, updatedAt: '', dirty: false}])),
  records: [], loaded: false, online: true, lastSync: '', recordsAccessible:false,
});

export function useCemetery(canEdit=true,options:ReportOptions={year:2026,scope:'all',month:new Date().toISOString().slice(0,7)},unlocked=false) {
  const query=new URLSearchParams({year:String(options.year),scope:options.scope,month:options.month}).toString(),queryRef=useRef(query);queryRef.current=query;const accessRef=useRef(unlocked);accessRef.current=unlocked;
  const [state, setState] = useState<State>(initialState);
  const current = useRef(state);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const savingRef = useRef<string | null>(null);
  const operation = useRef(false);
  const syncRequest = useRef<AbortController | null>(null);
  const writeEpoch = useRef(0);
  const mounted = useRef(true);
  const tokens = useRef<Record<string, string>>({});
  const freshKey = useRef('');
  const syncRequestKey = useRef('');
  const lockEpoch = useRef(0);
  const wasUnlocked = useRef(false);
  const apply = useCallback((update: (old: State) => State) => {
    if (!mounted.current) return;
    current.current = update(current.current);
    setState(current.current);
  }, []);

  const sync = useCallback(async (signal?: AbortSignal, requireAccess=false) => {
    if (operation.current || savingRef.current) {if(requireAccess)throw Error('A save is in progress. Please retry.');return;}
    // A read already on its way for the same view is reused. If the login state or the period changed
    // since it started, its answer would be thrown away, so it is replaced right away instead of
    // leaving the page on "Loading" until the next 30-second refresh.
    const key=`${lockEpoch.current}|${queryRef.current}`;
    if(syncRequest.current){if(!requireAccess&&syncRequestKey.current===key)return;syncRequest.current.abort();}
    const controller=new AbortController();syncRequest.current=controller;syncRequestKey.current=key;
    const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    const timeout=setTimeout(()=>controller.abort(),45000);
    const requestedQuery=queryRef.current, requestedEpoch=lockEpoch.current;
    const epoch = writeEpoch.current;
    try {
      const data = await cemeteryApi<Snapshot>(undefined, controller.signal,requestedQuery);
      // A write can start while the read is in flight. Its older snapshot must not replace that write.
      if (signal?.aborted || syncRequest.current!==controller || operation.current || savingRef.current || epoch !== writeEpoch.current || requestedQuery!==queryRef.current || requestedEpoch!==lockEpoch.current) return;
      if(requireAccess&&!data.recordsAccessible)throw Error('Your Admin session could not be confirmed. Please log in again.');
      apply(old => mergeSnapshot(old, data, true));
      freshKey.current=requestedQuery;
      writeSnapshot(data.recordsAccessible, requestedQuery, data);
      setError(previous => current.current.loaded && previous === 'Records could not be loaded. Check your connection and retry.' ? '' : previous);
    } catch (e) {
      if (signal?.aborted) return;
      if(syncRequest.current!==controller)return;
      apply(old => ({...old, online: false}));
      if(requireAccess)throw e instanceof ApiError?e:Error(controller.signal.aborted?'Loading timed out. Please retry.':(e as Error).message);
      if (!current.current.loaded) setError('Records could not be loaded. Check your connection and retry.');
    } finally { clearTimeout(timeout);signal?.removeEventListener('abort',abort);if(syncRequest.current===controller)syncRequest.current=null; }
  }, [apply]);

  useEffect(()=>{
    // Logging out: answers requested before it are ignored and this tab's saved Admin copy is removed.
    if(!unlocked&&wasUnlocked.current){lockEpoch.current++;dropSnapshot(true);apply(old=>({...old,records:[],recordsAccessible:false}))}
    wasUnlocked.current=unlocked;
    // Show this tab's saved copy straight away, unless fresher data for this view has already arrived.
    // The server's answer (which checks the login itself) replaces it a moment later.
    if(freshKey.current!==query){const saved=readSnapshot(true,query)??readSnapshot(false,query);if(saved)apply(old=>mergeSnapshot(old,saved,false))}
    void sync()},[unlocked,query,apply,sync]);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void sync(controller.signal);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void sync(controller.signal); }, 30000);
    const reconnect = () => { if (document.visibilityState === 'visible') void sync(controller.signal); };
    const offline = () => apply(old => ({...old, online: false}));
    document.addEventListener('visibilitychange', reconnect);
    window.addEventListener('focus', reconnect);
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', offline);
    const unload = (event: BeforeUnloadEvent) => {
      if (Object.values(current.current.forms).some(form => form.dirty)) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', unload);
    return () => {
      mounted.current = false; controller.abort();syncRequest.current?.abort(); clearInterval(timer);
      document.removeEventListener('visibilitychange', reconnect);
      window.removeEventListener('focus', reconnect); window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', offline); window.removeEventListener('beforeunload', unload);
    };
  }, [apply, sync]);

  const markConflict = useCallback(async (name: string) => {
    try {
      const data = await cemeteryApi<Snapshot>();
      const remote = data.drafts[name];
      if (remote) apply(old => ({...old, records: data.records, forms: {...old.forms, [name]: {...old.forms[name], conflict: remote}}}));
    } catch { /* Keep the unsaved input and surface the original conflict. */ }
  }, [apply]);

  const save = useCallback(async (name: string) => {
    if (savingRef.current) return null;
    const form = current.current.forms[name];
    if (form.conflict) throw new Error('Choose which version to use before saving.');
    if (!form.dirty) return {revision: form.revision, updatedAt: form.updatedAt};
    savingRef.current = name; setSaving(name);
    writeEpoch.current++;
    try {
      const result = await cemeteryApi<SaveResult>({action: 'save', name, fields: form.fields, revision: form.revision});
      apply(old => ({...old, online: true, forms: {...old.forms, [name]: {...old.forms[name],
        revision: result.revision, updatedAt: result.updatedAt, dirty: old.forms[name].fields !== form.fields, saveError: undefined,
      }}}));
      return result;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) await markConflict(name);
      apply(old => ({...old, online: e instanceof ApiError ? old.online : false, forms: {...old.forms, [name]: {...old.forms[name], saveError: (e as Error).message}}}));
      throw e;
    } finally { savingRef.current = null; if (mounted.current) setSaving(null); }
  }, [apply, markConflict]);

  useEffect(() => {
    if (!canEdit || !state.loaded || !state.online || busy || saving) return;
    const name = formNames.find(name => state.forms[name].dirty && !state.forms[name].conflict && !state.forms[name].saveError);
    if (!name) return;
    const timer = setTimeout(() => { void save(name).catch(() => {}); }, 800);
    return () => clearTimeout(timer);
  }, [canEdit, state.forms, state.loaded, state.online, busy, saving, save]);

  const update = useCallback((name: string, ref: string, value: string) => {
    apply(old => ({...old, forms: {...old.forms, [name]: {...old.forms[name], fields: {...old.forms[name].fields, [ref]: cleanText(value)}, dirty: true, saveError: undefined}}}));
    tokens.current[name] = ''; setError(''); setNotice('');
  }, [apply]);

  // Empties a form for the next entry (after printing a transferred form, or Clear form). Autosave stores it.
  const clear = useCallback((name: string) => {
    apply(old => ({...old, forms: {...old.forms, [name]: {...old.forms[name], fields: clearFields(name, old.forms[name].fields), dirty: true, saveError: undefined}}}));
    tokens.current[name] = ''; setError('');
  }, [apply]);

  const resolve = useCallback((name: string, useRemote: boolean) => {
    apply(old => {
      const form = old.forms[name], remote = form.conflict;
      if (!remote) return old;
      return {...old, forms: {...old.forms, [name]: useRemote ? {...remote, dirty: false} : {...form, revision: remote.revision, conflict: undefined, saveError: undefined, dirty: true}}};
    });
    tokens.current[name] = ''; setError('');
  }, [apply]);

  const action = useCallback(async (name: string, transfer = false) => {
    if (operation.current || savingRef.current || !current.current.loaded) return;
    operation.current = true; writeEpoch.current++; setBusy(true); setError('');
    try {
      // Default forms also need a durable first revision before a transfer.
      if (!current.current.forms[name].revision) apply(old => ({...old, forms: {...old.forms, [name]: {...old.forms[name], dirty: true}}}));
      const saved = await save(name);
      if (!saved) return;
      if (transfer) {
        const token = tokens.current[name] || (tokens.current[name] = crypto.randomUUID());
        const result = await cemeteryApi<TransferResult>({action: 'transfer', name, revision: saved.revision, token});
        if (result.duplicate) {
          const snapshot = await cemeteryApi<Snapshot>();
          apply(old => ({...old, records: snapshot.records, forms: {...old.forms, [name]: {...snapshot.drafts[name], dirty: false}}}));
        } else {
          apply(old => ({...old, records: old.records.some(record => record.id === result.record.id) ? old.records : [...old.records, result.record],
            forms: {...old.forms, [name]: {fields: result.fields, revision: result.revision, updatedAt: result.updatedAt, dirty: false}},
          }));
        }
        tokens.current[name] = '';
        setNotice(`Entry added to ${result.record.sheet === 'transmital promissory' ? 'Promissory' : result.record.sheet === 'transmital Aranda' ? 'Aranda' : 'Municipal'} transmittal. The form keeps its data — press Print; printing clears the form.${result.record.sheet!=='transmital promissory'&&!String(result.record.values[12]??'').trim()?' Remember to encode its O.R. number using the O.R. button in the transmittal.':''}`);
      } else setNotice('Form saved.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) await markConflict(name);
      setError((e as Error).message);
    } finally { operation.current = false; setBusy(false); }
  }, [apply, markConflict, save]);

  const saveRecord = useCallback(async (record: RecordRow) => {
    if (operation.current || savingRef.current) return false;
    operation.current = true; writeEpoch.current++; setBusy(true); setError('');
    try {
      const fresh=isNewRow(record);
      const result = await cemeteryApi<{record: RecordRow}>(fresh?{action:'insertRecord',sheet:record.sheet,values:record.values,mobile:record.mobile??record.fields?.PH1,token:record.id.slice(6)}:{action: 'updateRecord', id: record.id, values: record.values,mobile:record.mobile??record.fields?.PH1, revision: record.revision ?? 0});
      apply(old => ({...old, records: fresh?old.records.some(row=>row.id===result.record.id)?old.records:[...old.records,result.record]:old.records.map(row => row.id === record.id ? result.record : row)}));
      setNotice('Record saved.'); return result.record as RecordRow;
    } catch (e) { setError((e as Error).message); return false; }
    finally { operation.current = false; setBusy(false); }
  }, [apply]);

  const deleteRecord = useCallback(async (record: RecordRow) => {
    if (operation.current || savingRef.current) return false;
    operation.current = true; writeEpoch.current++; setBusy(true); setError('');
    try {
      await cemeteryApi({action: 'deleteRecord', id: record.id, revision: record.revision ?? 0});
      apply(old => ({...old, records: old.records.filter(row => row.id !== record.id)}));
      setNotice('Entry deleted from the transmittal.'); return true;
    } catch (e) { setError((e as Error).message); return false; }
    finally { operation.current = false; setBusy(false); }
  }, [apply]);

  const savePermit = useCallback(async (record:RecordRow,fields:Fields) => {
    if(operation.current||savingRef.current)return false;
    operation.current=true;writeEpoch.current++;setBusy(true);setError('');
    try{
      const result=await cemeteryApi<{record:RecordRow}>({action:'updatePermit',id:record.id,revision:record.revision??0,fields});
      apply(old=>({...old,records:old.records.map(row=>row.id===record.id?result.record:row)}));
      setNotice('Permit and existing transmittal entry updated.');return result.record;
    }catch(e){setError((e as Error).message);return false}
    finally{operation.current=false;setBusy(false)}
  },[apply]);

  return {...state, busy, saving, error, notice, setNotice, update, clear, action, saveRecord, savePermit, deleteRecord, sync, resolve};
}
