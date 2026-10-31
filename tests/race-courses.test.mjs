import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {RacePhysics} from '../dist/course-race-physics.mjs';
import {makeRacer,finishRacer} from '../dist/race-core.mjs';
import assert from 'node:assert/strict';
import {RACE_COURSES,raceCourse,courseURL} from '../dist/race-courses.mjs';
import {COURSE_IDS} from '../dist/race-course-ids.mjs';
import {normalizeSave} from '../dist/garage-core.mjs';
import {createTransfer,parseTransfer,prepareImport,applyImport,prepareRestore,applyRestore,readSnapshot,SAVE_KEY,BACKUP_KEY} from '../dist/save-transfer.mjs';
class Memory{constructor(save){this.data=new Map([[SAVE_KEY,JSON.stringify(save)]]);this.writes=[];}getItem(k){return this.data.get(k)??null;}setItem(k,v){this.writes.push(k);this.data.set(k,v);}removeItem(k){this.data.delete(k);}}
const old=()=>normalizeSave({version:1,coins:4321,races:12,best:{tavaculo:29.5},courseBest:{'bayfront-long-1':{tavaculo:80}},owned:['paint-mint'],garage:{tavaculo:{paint:'paint-mint'}}});
test('known links keep the old tour; choices use stable, distinct record identities',()=>{
 assert.equal(raceCourse(null).id,'bayfront-long-1');assert.equal(raceCourse('unknown').id,'bayfront-long-1');
 assert.deepEqual(RACE_COURSES.map(c=>c.id),COURSE_IDS);for(const c of RACE_COURSES)assert.equal(c.create().id,c.id);
 const url=new URL(courseURL('https://example.test/dream-garage/?v=old&view=cockpit#garage','speed'));
 assert.equal(url.pathname,'/dream-garage/');assert.equal(url.searchParams.get('course'),'speed');assert.equal(url.searchParams.get('view'),'cockpit');assert.equal(url.searchParams.get('garage'),'1');assert.equal(url.hash,'#garage');
});
test('normalizing and transferring all four course records preserves the old economy and cars',()=>{
 const base=old(),value=structuredClone(base);for(const id of COURSE_IDS.slice(1))value.courseBest[id]={tavaculo:65.123,porsche:62.1,f2002:58.25};
 const normalized=normalizeSave(value);assert.deepEqual(normalized,value);assert.deepEqual(parseTransfer(createTransfer(value)).save,value);
 for(const k of ['coins','owned','garage','races','best'])assert.deepEqual(normalized[k],base[k]);
 const memory=new Memory(value);assert.equal(readSnapshot(memory).invalid,false);assert.deepEqual(readSnapshot(memory).save,value);assert.deepEqual(memory.writes,[]);
});
test('a change only to a new course record is imported, backed up and restored exactly',()=>{
 const first=old();first.courseBest['beginner-speed-1']={porsche:72};const next=structuredClone(first);next.courseBest['beginner-speed-1'].porsche=69;
 const memory=new Memory(first),raw=memory.getItem(SAVE_KEY),result=applyImport(memory,prepareImport(memory,createTransfer(next)));
 assert.equal(result.unchanged,false);assert.equal(JSON.parse(memory.getItem(SAVE_KEY)).courseBest['beginner-speed-1'].porsche,69);assert.equal(JSON.parse(memory.getItem(BACKUP_KEY)).raw,raw);
 const backup=memory.getItem(BACKUP_KEY);assert.equal(applyImport(memory,prepareImport(memory,createTransfer(next))).unchanged,true);assert.equal(memory.getItem(BACKUP_KEY),backup);
 applyRestore(memory,prepareRestore(memory));assert.equal(memory.getItem(SAVE_KEY),raw);
});
test('unknown or broken new course times never overwrite an existing save',()=>{
 for(const record of [{future:{porsche:60}},{'beginner-speed-1':{porsche:-1}},{'beginner-speed-1':{unknown:60}},{'beginner-speed-1':{porsche:null}}]){
  const memory=new Memory(old()),raw=memory.getItem(SAVE_KEY),bad=old();bad.courseBest=record;
  assert.throws(()=>createTransfer(bad),e=>e.code==='invalid_save');assert.equal(memory.getItem(SAVE_KEY),raw);assert.deepEqual(memory.writes,[]);
  const corrupt=JSON.stringify(bad),broken=new Memory(old());broken.data.set(SAVE_KEY,corrupt);assert.equal(readSnapshot(broken).invalid,true);assert.equal(broken.getItem(SAVE_KEY),corrupt);
 }
});
test('pre-Porsche two-slot exports still import after adding new course support',()=>{
 const value=old();delete value.garage.porsche;delete value.courseBest;const envelope={app:'dream-garage-save',formatVersion:1,exportedAt:'2026-10-30T00:00:00.000Z',save:value};
 const restored=parseTransfer(JSON.stringify(envelope)).save;assert.equal(restored.coins,4321);assert.equal(restored.garage.tavaculo.paint,'paint-mint');assert.equal(restored.best.tavaculo,29.5);assert.equal(restored.garage.porsche.engine,'engine-stock');
});

for(const key of ['speed','rhythm','braking'])test('formula field can complete '+key+' without mixing road cars',()=>{
 const track=raceCourse(key).create(),rigs=JSON.parse(readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url))),racers=Array.from({length:4},(_,i)=>makeRacer(track,{id:i?'bot'+i:'player',car:'f2002',s:i?7+(i-1)*7:0,lane:i%2?2.3:-2.3}));
 const physics=new RacePhysics(track,racers,rigs);for(let ticks=0;ticks<180*60&&!racers.every(r=>r.finished);ticks++){const e=physics.entries[0];physics.step(1/60,e.r.finished?{brake:1}:{...physics.route(e),wheelCommand:true},false);racers.forEach(r=>finishRacer(r,track,ticks/60));}
 assert.ok(racers.every(r=>r.finished));assert.equal(physics.aiRecoveryCount,0);physics.dispose();
});
