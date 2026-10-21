import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSave,transact} from '../dist/garage-core.mjs';
import {SAVE_KEY,BACKUP_KEY,MAX_TRANSFER_BYTES,createTransfer,parseTransfer,readSnapshot,prepareImport,applyImport,prepareRestore,applyRestore} from '../dist/save-transfer.mjs';
const date='2026-10-21T12:00:00.000Z';
class MemoryStorage{
 constructor(raw=null){this.data=new Map([['captains-aquarium:save','unrelated']]);if(raw!==null)this.data.set(SAVE_KEY,raw);this.writes=[];}
 getItem(key){return this.data.get(key)??null;}
 setItem(key,value){this.writes.push(['set',key,value]);this.data.set(key,String(value));}
 removeItem(key){this.writes.push(['remove',key]);this.data.delete(key);}
}
function earned(){
 const value=normalizeSave({version:1,coins:98765,best:{tavaculo:31.125,f2002:29.5},car:'f2002',view:'cockpit',assist:false,auto:true,races:57});
 for(const [car,item] of [['tavaculo','paint-mint'],['tavaculo','wheels-gold'],['tavaculo','engine-gt'],['f2002','paint-violet'],['f2002','wheels-neon'],['f2002','tires-grip'],['f2002','brakes-sport']])assert.equal(transact(value,car,item).ok,true);
 return value;
}
const exported=value=>createTransfer(value,{exportedAt:date});
const assertCode=(callback,code)=>assert.throws(callback,error=>error.code===code);
function rewrite(text,mutate){const object=JSON.parse(text);mutate(object);return JSON.stringify(object);}

test('export and parse preserve money, both garages, ownership, records, races and settings',()=>{
 const value=earned(),text=exported(value),parsed=parseTransfer(text);
 assert.deepEqual(parsed.save,value);assert.equal(parsed.exportedAt,date);assert.equal(parsed.summary.paidOwned.length,7);
 assert.equal(parsed.summary.garage.f2002.paint,'paint-violet');assert.deepEqual(parsed.summary.best,value.best);
 assert.equal(text.includes('dream-garage-save'),true);
});
test('preview never writes and shows current and incoming records separately',()=>{
 const current=normalizeSave({version:1,coins:111}),raw=JSON.stringify(current),storage=new MemoryStorage(raw),incoming=earned();
 const pending=prepareImport(storage,exported(incoming));
 assert.equal(pending.expectedRaw,raw);assert.equal(pending.current.save.coins,111);assert.equal(pending.incoming.coins,incoming.coins);assert.deepEqual(storage.writes,[]);assert.equal(storage.getItem(SAVE_KEY),raw);
});
test('import backs up exact prior text and replaces rather than adds money',()=>{
 const current=normalizeSave({version:1,coins:222}),raw=JSON.stringify(current,null,4),storage=new MemoryStorage(raw),incoming=earned();
 const result=applyImport(storage,prepareImport(storage,exported(incoming)));
 assert.equal(result.unchanged,false);assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)),incoming);
 assert.equal(JSON.parse(storage.getItem(BACKUP_KEY)).raw,raw);assert.equal(storage.writes[0][1],BACKUP_KEY);assert.equal(storage.writes[1][1],SAVE_KEY);
 assert.equal(storage.getItem('captains-aquarium:save'),'unrelated');
});
test('applying same file twice leaves balance and first backup unchanged',()=>{
 const storage=new MemoryStorage(JSON.stringify(normalizeSave({version:1,coins:18}))),text=exported(earned());
 applyImport(storage,prepareImport(storage,text));const backup=storage.getItem(BACKUP_KEY),count=storage.writes.length;
 const repeated=applyImport(storage,prepareImport(storage,text));
 assert.equal(repeated.unchanged,true);assert.equal(storage.getItem(BACKUP_KEY),backup);assert.equal(storage.writes.length,count);assert.deepEqual(repeated.save,earned());
});
test('restore previews and returns exact previous raw while preserving the backup',()=>{
 const value=normalizeSave({version:1,coins:543}),raw=JSON.stringify(value,null,2),storage=new MemoryStorage(raw);
 applyImport(storage,prepareImport(storage,exported(earned())));const backup=storage.getItem(BACKUP_KEY),count=storage.writes.length;
 const pending=prepareRestore(storage);assert.equal(storage.writes.length,count);assert.equal(pending.incoming.coins,543);
 const result=applyRestore(storage,pending);assert.deepEqual(result.save,value);assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.getItem(BACKUP_KEY),backup);
 assert.equal(applyRestore(storage,prepareRestore(storage)).unchanged,true);
});
test('empty destination is backed up as null and restores to an absent save key',()=>{
 const storage=new MemoryStorage();assert.equal(readSnapshot(storage).save.coins,0);
 applyImport(storage,prepareImport(storage,exported(earned())));assert.equal(JSON.parse(storage.getItem(BACKUP_KEY)).raw,null);
 const restored=applyRestore(storage,prepareRestore(storage));assert.equal(storage.getItem(SAVE_KEY),null);assert.deepEqual(restored.save,normalizeSave(null));
});
test('legacy stored wallet and settings are read without discarding valid old fields',()=>{
 const old={version:1,coins:2900,best:{tavaculo:32.5},car:'f2002',view:'cockpit',assist:false,auto:true},storage=new MemoryStorage(JSON.stringify(old));
 const current=readSnapshot(storage);assert.equal(current.invalid,false);for(const key of Object.keys(old))assert.deepEqual(current.save[key],old[key]);
 assert.deepEqual(parseTransfer(exported(current.save)).save,current.save);assert.deepEqual(storage.writes,[]);
});
test('corrupted current raw is preserved before an import and never silently restored as defaults',()=>{
 const raw='{broken original wallet',storage=new MemoryStorage(raw);assert.equal(readSnapshot(storage).invalid,true);
 applyImport(storage,prepareImport(storage,exported(earned())));const backup=storage.getItem(BACKUP_KEY);assert.equal(JSON.parse(backup).raw,raw);
 assertCode(()=>prepareRestore(storage),'invalid_backup');assert.equal(storage.getItem(BACKUP_KEY),backup);assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)),earned());
});
for(const [label,mutate,code] of [
 ['another game',o=>o.app='captains-aquarium','wrong_game'],
 ['future file version',o=>o.formatVersion=2,'unsupported_version'],
 ['future save version',o=>o.save.version=2,'unsupported_version'],
 ['negative money',o=>o.save.coins=-1,'invalid_save'],
 ['fractional money',o=>o.save.coins=1.2,'invalid_save'],
 ['too much money',o=>o.save.coins=1e9+1,'invalid_save'],
 ['numeric money string',o=>o.save.coins='100','invalid_save'],
 ['missing ownership',o=>delete o.save.owned,'invalid_save'],
 ['unknown owned part',o=>o.save.owned.push('engine-secret'),'invalid_save'],
 ['duplicate owned part',o=>o.save.owned.push(o.save.owned[0]),'invalid_save'],
 ['unknown car',o=>o.save.car='different-car','invalid_save'],
 ['unowned loadout',o=>o.save.garage.tavaculo.engine='engine-sprint','invalid_save'],
 ['wrong category loadout',o=>o.save.garage.tavaculo.paint='engine-gt','invalid_save'],
 ['negative record',o=>o.save.best.tavaculo=-1,'invalid_save'],
 ['null record',o=>o.save.best.tavaculo=null,'invalid_save'],
 ['extra future data',o=>o.save.championships=[1,2],'invalid_save'],
 ['invalid boolean setting',o=>o.save.assist='false','invalid_save'],
 ['impossible export date',o=>o.exportedAt='2026-02-31T00:00:00.000Z','invalid_save']
])test(`rejects ${label} without modifying current storage`,()=>{
 const raw=JSON.stringify(normalizeSave({version:1,coins:111})),storage=new MemoryStorage(raw);
 assertCode(()=>prepareImport(storage,rewrite(exported(earned()),mutate)),code);assert.equal(storage.getItem(SAVE_KEY),raw);assert.deepEqual(storage.writes,[]);
});
test('malformed, empty, oversized and multibyte oversized files are rejected',()=>{
 assertCode(()=>parseTransfer('{broken'),'invalid_json');assertCode(()=>parseTransfer(''),'invalid_json');
 assertCode(()=>parseTransfer(' '.repeat(MAX_TRANSFER_BYTES+1)),'too_large');
 assertCode(()=>parseTransfer('가'.repeat(Math.floor(MAX_TRANSFER_BYTES/3)+1)),'too_large');
 assertCode(()=>parseTransfer(JSON.stringify(earned())),'wrong_game');
 assert.deepEqual(parseTransfer('\uFEFF'+exported(earned())).save,earned());
});
test('non-finite values cannot be exported or accepted as saved records',()=>{
 for(const value of [Infinity,NaN,-Infinity]){const save=earned();save.best.tavaculo=value;assertCode(()=>exported(save),'invalid_save');}
 const raw=JSON.stringify(earned()).replace('31.125','1e999');assert.equal(readSnapshot(new MemoryStorage(raw)).invalid,true);
});
test('preview is rejected if another tab changed current save before apply',()=>{
 const storage=new MemoryStorage(JSON.stringify(normalizeSave({version:1,coins:8}))),pending=prepareImport(storage,exported(earned()));
 const latest=JSON.stringify(normalizeSave({version:1,coins:12}));storage.setItem(SAVE_KEY,latest);const count=storage.writes.length;
 assertCode(()=>applyImport(storage,pending),'save_changed');assert.equal(storage.getItem(SAVE_KEY),latest);assert.equal(storage.getItem(BACKUP_KEY),null);assert.equal(storage.writes.length,count);
});
test('backup quota failure stops before touching the primary record',()=>{
 const raw=JSON.stringify(normalizeSave({version:1,coins:40})),storage=new MemoryStorage(raw);
 storage.setItem=(key)=>{assert.equal(key,BACKUP_KEY);throw Error('Quota exceeded');};
 assertCode(()=>applyImport(storage,prepareImport(storage,exported(earned()))),'backup_failed');assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.getItem(BACKUP_KEY),null);
});
test('backup readback mismatch is detected and primary record stays unchanged',()=>{
 const raw=JSON.stringify(normalizeSave({version:1,coins:40})),storage=new MemoryStorage(raw),original=storage.setItem.bind(storage);
 storage.setItem=(key,value)=>{if(key!==BACKUP_KEY)original(key,value);};
 assertCode(()=>applyImport(storage,prepareImport(storage,exported(earned()))),'backup_failed');assert.equal(storage.getItem(SAVE_KEY),raw);
});
test('primary write failure preserves old save and preexisting backup',()=>{
 const raw=JSON.stringify(normalizeSave({version:1,coins:73})),storage=new MemoryStorage(raw),oldBackup='previous opaque backup';storage.data.set(BACKUP_KEY,oldBackup);
 const original=storage.setItem.bind(storage);storage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('Quota exceeded');original(key,value);};
 assertCode(()=>applyImport(storage,prepareImport(storage,exported(earned()))),'save_failed');assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.getItem(BACKUP_KEY),oldBackup);
});
test('partial primary write is rolled back and cannot report success',()=>{
 const raw=JSON.stringify(normalizeSave({version:1,coins:73})),storage=new MemoryStorage(raw),original=storage.setItem.bind(storage);let fail=true;
 storage.setItem=(key,value)=>{original(key,value);if(key===SAVE_KEY&&fail){fail=false;throw Error('Interrupted after write');}};
 assertCode(()=>applyImport(storage,prepareImport(storage,exported(earned()))),'save_failed');assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.getItem(BACKUP_KEY),null);
});
test('unrecoverable storage failure leaves original raw in backup and reports recovery required',()=>{
 const raw=JSON.stringify(normalizeSave({version:1,coins:73})),storage=new MemoryStorage(raw),original=storage.setItem.bind(storage);
 storage.setItem=(key,value)=>{if(key===SAVE_KEY){storage.data.set(key,'damaged by failing storage');throw Error('Broken storage');}original(key,value);};
 assertCode(()=>applyImport(storage,prepareImport(storage,exported(earned()))),'recovery_required');assert.equal(JSON.parse(storage.getItem(BACKUP_KEY)).raw,raw);
});
test('restore refuses a changed backup or changed live save',()=>{
 const storage=new MemoryStorage(JSON.stringify(normalizeSave({version:1,coins:12})));applyImport(storage,prepareImport(storage,exported(earned())));
 const pending=prepareRestore(storage);storage.data.set(BACKUP_KEY,'changed');assertCode(()=>applyRestore(storage,pending),'backup_changed');
 storage.data.set(BACKUP_KEY,pending.backupRaw);storage.data.set(SAVE_KEY,JSON.stringify(normalizeSave({version:1,coins:24})));assertCode(()=>applyRestore(storage,pending),'save_changed');
});
test('restore write failure rolls back and retains backup',()=>{
 const storage=new MemoryStorage(JSON.stringify(normalizeSave({version:1,coins:12})));applyImport(storage,prepareImport(storage,exported(earned())));
 const current=storage.getItem(SAVE_KEY),backup=storage.getItem(BACKUP_KEY),pending=prepareRestore(storage);
 storage.setItem=()=>{throw Error('No storage');};assertCode(()=>applyRestore(storage,pending),'restore_failed');assert.equal(storage.getItem(SAVE_KEY),current);assert.equal(storage.getItem(BACKUP_KEY),backup);
});
test('blocked reads and invalid backup never become a success or a default replacement',()=>{
 const storage=new MemoryStorage();storage.getItem=()=>{throw Error('Blocked');};assertCode(()=>readSnapshot(storage),'storage_read');
 const normal=new MemoryStorage();assertCode(()=>prepareRestore(normal),'no_backup');normal.data.set(BACKUP_KEY,'{"formatVersion":2}');assertCode(()=>prepareRestore(normal),'invalid_backup');assert.deepEqual(normal.writes,[]);
});

test('ownership and object key ordering do not replace the original backup on reimport',()=>{
 const storage=new MemoryStorage(JSON.stringify(normalizeSave({version:1,coins:18}))),value=earned();
 applyImport(storage,prepareImport(storage,exported(value)));const backup=storage.getItem(BACKUP_KEY),count=storage.writes.length;
 value.owned.reverse();value.best={f2002:value.best.f2002,tavaculo:value.best.tavaculo};
 value.garage={f2002:Object.fromEntries(Object.entries(value.garage.f2002).reverse()),tavaculo:Object.fromEntries(Object.entries(value.garage.tavaculo).reverse())};
 assert.equal(applyImport(storage,prepareImport(storage,exported(value))).unchanged,true);assert.equal(storage.getItem(BACKUP_KEY),backup);assert.equal(storage.writes.length,count);
});
test('changes during backup creation are detected without overwriting the newer live save',()=>{
 const raw=JSON.stringify(normalizeSave({version:1,coins:18})),latest=JSON.stringify(normalizeSave({version:1,coins:600})),storage=new MemoryStorage(raw),set=storage.setItem.bind(storage);
 storage.setItem=(key,value)=>{set(key,value);if(key===BACKUP_KEY)storage.data.set(SAVE_KEY,latest);};
 assertCode(()=>applyImport(storage,prepareImport(storage,exported(earned()))),'save_changed');assert.equal(storage.getItem(SAVE_KEY),latest);assert.equal(storage.getItem(BACKUP_KEY),null);
});
test('a second different import backs up the latest current save rather than the earliest one',()=>{
 const storage=new MemoryStorage(JSON.stringify(normalizeSave({version:1,coins:18}))),first=earned();applyImport(storage,prepareImport(storage,exported(first)));
 const latest=JSON.stringify(first),second={...first,coins:first.coins+150,races:first.races+1};applyImport(storage,prepareImport(storage,exported(second)));
 assert.equal(JSON.parse(storage.getItem(BACKUP_KEY)).raw,latest);assert.deepEqual(applyRestore(storage,prepareRestore(storage)).save,first);
});
