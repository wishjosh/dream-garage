import {CARS,CATEGORIES,CATALOG,DEFAULT_LOADOUT,normalizeSave,itemById} from './garage-core.mjs?v=porsche-main-1';

export const SAVE_KEY='hojin-city-gp:save:v1';
export const BACKUP_KEY='hojin-city-gp:save:before-import:v1';
export const MAX_TRANSFER_BYTES=128*1024;
const APP='dream-garage-save',BACKUP_APP='dream-garage-before-import';
const SAVE_FIELDS=['version','coins','best','car','view','assist','auto','owned','garage','races'];
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const error=(code,message)=>Object.assign(new Error(message),{code});
function invalid(message='저장 파일의 내용이 올바르지 않아요. 원래 게임에서 다시 내려받아 주세요.'){
 throw error('invalid_save',message);
}
function shape(value,allowed,required=allowed){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))invalid();
 if(Object.keys(value).some(key=>!allowed.includes(key))||required.some(key=>!own(value,key)))invalid();
}
function integer(value,max=Number.MAX_SAFE_INTEGER){return Number.isSafeInteger(value)&&value>=0&&value<=max;}
function checkSave(value,legacy=false){
 shape(value,[...SAVE_FIELDS,'courseBest'],legacy?['version']:SAVE_FIELDS);
 if(value.version!==1)throw error('unsupported_version','이 저장 버전은 아직 불러올 수 없어요. 게임을 새로고침해 주세요.');
 if(own(value,'coins')&&!integer(value.coins,1e9))invalid();
 if(own(value,'races')&&!integer(value.races))invalid();
 if(own(value,'car')&&!CARS.includes(value.car))invalid();
 if(own(value,'view')&&!['chase','cockpit'].includes(value.view))invalid();
 for(const key of ['assist','auto'])if(own(value,key)&&typeof value[key]!=='boolean')invalid();
 if(own(value,'best')){
  shape(value.best,CARS,[]);
  for(const time of Object.values(value.best))if(typeof time!=='number'||!Number.isFinite(time)||time<0)invalid();
 }
 if(own(value,'courseBest')){shape(value.courseBest,['bayfront-long-1'],[]);for(const times of Object.values(value.courseBest)){shape(times,CARS,[]);for(const time of Object.values(times))if(typeof time!=='number'||!Number.isFinite(time)||time<0)invalid();}}
 const owned=new Set(CATALOG.filter(item=>item.price===0).map(item=>item.id));
 if(own(value,'owned')){
  if(!Array.isArray(value.owned)||value.owned.length>CATALOG.length||new Set(value.owned).size!==value.owned.length)invalid();
  for(const id of value.owned){if(typeof id!=='string'||!itemById(id))invalid();owned.add(id);}
  if(!legacy&&CATALOG.some(item=>item.price===0&&!value.owned.includes(item.id)))invalid();
 }
 if(own(value,'garage')){
  shape(value.garage,CARS,legacy?[]:['tavaculo','f2002']);
  // Original version-1 exports have two garages. Only the new slot may be absent.
  if(!legacy&&!own(value.garage,'porsche')&&(value.car==='porsche'||own(value.best,'porsche')||Object.values(value.courseBest||{}).some(times=>own(times,'porsche'))))invalid();
  for(const car of Object.keys(value.garage)){
   const loadout=value.garage[car];shape(loadout,Object.keys(CATEGORIES),legacy?[]:Object.keys(CATEGORIES));
   for(const [category,id] of Object.entries(loadout))if(typeof id!=='string'||!owned.has(id)||itemById(id)?.category!==category)invalid();
  }
 }
}
export function validateSave(value){
 checkSave(value);
 return {version:1,...(value.courseBest?{courseBest:JSON.parse(JSON.stringify(value.courseBest))}:{}),coins:value.coins,best:{...value.best},car:value.car,view:value.view,assist:value.assist,auto:value.auto,owned:[...value.owned],garage:Object.fromEntries(CARS.map(car=>[car,{...(value.garage[car]||DEFAULT_LOADOUT)}])),races:value.races};
}
function storedSave(value){checkSave(value,true);return validateSave(normalizeSave(value));}
function timestamp(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)invalid();
 return value;
}
function parsedJSON(text){
 if(typeof text!=='string')throw error('invalid_file','JSON 저장 파일을 선택해 주세요.');
 if(new TextEncoder().encode(text).length>MAX_TRANSFER_BYTES)throw error('too_large','파일이 너무 커요. 드림 개러지에서 내려받은 저장 파일을 골라 주세요.');
 try{return JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw error('invalid_json','파일을 읽을 수 없어요. 드림 개러지의 JSON 저장 파일을 골라 주세요.');}
}
export function summarizeSave(value){
 const save=validateSave(value);
 return {courseBest:save.courseBest||{},coins:save.coins,races:save.races,paidOwned:save.owned.map(itemById).filter(item=>item.price>0).map(({id,name,category})=>({id,name,category})),garage:save.garage,best:save.best,car:save.car,view:save.view,assist:save.assist,auto:save.auto};
}
export function createTransfer(value,{exportedAt=new Date().toISOString()}={}){
 const text=JSON.stringify({app:APP,formatVersion:1,exportedAt:timestamp(exportedAt),save:validateSave(value)},null,2);
 if(new TextEncoder().encode(text).length>MAX_TRANSFER_BYTES)throw error('too_large','저장 내용이 너무 커서 파일로 만들 수 없어요.');
 return text;
}
export function parseTransfer(text){
 const envelope=parsedJSON(text);
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||envelope.app!==APP)throw error('wrong_game','드림 개러지에서 내려받은 저장 파일이 아니에요.');
 if(envelope.formatVersion!==1)throw error('unsupported_version','이 저장 파일 버전은 아직 지원하지 않아요. 게임을 새로고침해 주세요.');
 shape(envelope,['app','formatVersion','exportedAt','save']);
 const save=validateSave(envelope.save);
 return {save,exportedAt:timestamp(envelope.exportedAt),summary:summarizeSave(save)};
}
function read(storage,key){
 try{const value=storage.getItem(key);if(value!==null&&typeof value!=='string')throw Error();return value;}
 catch{throw error('storage_read','이 브라우저의 저장 기록을 읽을 수 없어요. 다른 기록으로 덮어쓰지 않았어요.');}
}
function snapshot(raw){
 if(raw===null){const save=normalizeSave(null);return {raw,save,summary:summarizeSave(save),invalid:false};}
 try{const save=storedSave(JSON.parse(raw));return {raw,save,summary:summarizeSave(save),invalid:false};}
 catch{return {raw,save:null,summary:null,invalid:true};}
}
export function readSnapshot(storage){return snapshot(read(storage,SAVE_KEY));}
export function prepareImport(storage,text){
 const parsed=parseTransfer(text),current=readSnapshot(storage);
 return {kind:'import',expectedRaw:current.raw,current,incoming:parsed.summary,save:parsed.save,exportedAt:parsed.exportedAt};
}
function writeExact(storage,key,raw){
 if(raw===null)storage.removeItem(key);else storage.setItem(key,raw);
 if(storage.getItem(key)!==raw)throw Error('Storage verification failed');
}
function rollback(storage,key,raw){
 try{if(storage.getItem(key)===raw)return true;}catch{}
 try{writeExact(storage,key,raw);return true;}catch{return false;}
}
function equalityKey(save){
 return JSON.stringify([CARS.map(car=>save.courseBest?.['bayfront-long-1']?.[car]??null),save.coins,save.races,save.car,save.view,save.assist,save.auto,[...save.owned].sort(),CARS.map(car=>save.best[car]??null),CARS.map(car=>Object.keys(CATEGORIES).map(category=>save.garage[car][category]))]);
}
function unchanged(raw,save){
 const current=snapshot(raw);return !current.invalid&&equalityKey(current.save)===equalityKey(save);
}
function checkExpected(storage,prepared,kind){
 if(!prepared||prepared.kind!==kind||!(typeof prepared.expectedRaw==='string'||prepared.expectedRaw===null))throw error('preview_required','먼저 가져올 기록의 내용을 확인해 주세요.');
 if(read(storage,SAVE_KEY)!==prepared.expectedRaw)throw error('save_changed','미리보기 뒤에 현재 기록이 바뀌었어요. 파일을 다시 골라 내용을 확인해 주세요.');
}
export function applyImport(storage,prepared){
 checkExpected(storage,prepared,'import');
 const save=validateSave(prepared.save);
 if(unchanged(prepared.expectedRaw,save))return {save,unchanged:true};
 const previousBackup=read(storage,BACKUP_KEY);
 const backup=JSON.stringify({app:BACKUP_APP,formatVersion:1,createdAt:new Date().toISOString(),raw:prepared.expectedRaw});
 try{writeExact(storage,BACKUP_KEY,backup);}catch{
  rollback(storage,BACKUP_KEY,previousBackup);
  throw error('backup_failed','현재 기록의 백업을 만들지 못해 가져오기를 중단했어요. 현재 기록은 바꾸지 않았어요.');
 }
 // Recheck after backup creation to avoid replacing a record changed since preview.
 if(read(storage,SAVE_KEY)!==prepared.expectedRaw){
  rollback(storage,BACKUP_KEY,previousBackup);
  throw error('save_changed','현재 기록이 바뀌었어요. 파일을 다시 골라 내용을 확인해 주세요.');
 }
 try{writeExact(storage,SAVE_KEY,JSON.stringify(save));}
 catch{
  const restored=rollback(storage,SAVE_KEY,prepared.expectedRaw);
  if(restored)rollback(storage,BACKUP_KEY,previousBackup);
  throw error(restored?'save_failed':'recovery_required',restored?'기록을 저장하지 못해 가져오기를 취소했어요. 원래 기록을 유지했어요.':'기록 저장을 마치지 못했어요. 가져오기 전 원문은 이 브라우저의 별도 백업에 보관했어요.');
 }
 return {save,unchanged:false};
}
function parseBackup(raw){
 if(raw===null)throw error('no_backup','이 브라우저에는 가져오기 전 백업이 없어요.');
 let backup;try{backup=JSON.parse(raw);}catch{throw error('invalid_backup','백업 내용을 안전하게 읽을 수 없어 복원하지 않았어요.');}
 try{
  shape(backup,['app','formatVersion','createdAt','raw']);
  if(backup.app!==BACKUP_APP||backup.formatVersion!==1||!(typeof backup.raw==='string'||backup.raw===null))invalid();
  timestamp(backup.createdAt);
 }catch{throw error('invalid_backup','백업 내용을 안전하게 읽을 수 없어 복원하지 않았어요.');}
 const restored=snapshot(backup.raw);
 if(restored.invalid)throw error('invalid_backup','가져오기 전 원문은 보관되어 있지만 내용이 손상되어 자동 복원할 수 없어요. 백업은 지우지 않았어요.');
 return {...backup,save:restored.save};
}
export function prepareRestore(storage){
 const backupRaw=read(storage,BACKUP_KEY),backup=parseBackup(backupRaw),current=readSnapshot(storage);
 return {kind:'restore',expectedRaw:current.raw,current,incoming:summarizeSave(backup.save),save:backup.save,backupRaw,restoreRaw:backup.raw,createdAt:backup.createdAt};
}
export function applyRestore(storage,prepared){
 checkExpected(storage,prepared,'restore');
 if(typeof prepared.backupRaw!=='string'||read(storage,BACKUP_KEY)!==prepared.backupRaw)throw error('backup_changed','백업이 바뀌었어요. 복원할 내용을 다시 확인해 주세요.');
 const backup=parseBackup(prepared.backupRaw);
 if(prepared.expectedRaw===backup.raw)return {save:backup.save,unchanged:true};
 try{writeExact(storage,SAVE_KEY,backup.raw);}
 catch{
  const restored=rollback(storage,SAVE_KEY,prepared.expectedRaw);
  throw error(restored?'restore_failed':'recovery_required',restored?'복원을 저장하지 못했어요. 현재 기록을 유지했어요.':'복원을 마치지 못했어요. 가져오기 전 백업은 지우지 않았어요.');
 }
 return {save:backup.save,unchanged:false};
}
