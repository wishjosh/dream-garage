import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCityCourse,courseSector,SECTORS,COURSE_ID} from '../dist/city-course.mjs';
import {RacePhysics} from '../dist/race-handling.mjs';
import {makeRacer,finishRacer,nearestTrack,angleDelta} from '../dist/race-core.mjs';
import {recoverImpact,contactClosing} from '../dist/collision-feel.mjs';
import {normalizeSave} from '../dist/garage-core.mjs';
import {createTransfer,parseTransfer,prepareImport,applyImport,SAVE_KEY} from '../dist/save-transfer.mjs';
const track=createCityCourse(),rigs=JSON.parse(fs.readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));
test('extended course has six sectors, opposite turns and safely separated road edges',()=>{
 assert.ok(track.length>1500&&track.length<2000);assert.equal(SECTORS.length,6);let positive=0,negative=0;
 for(let i=0;i<track.frames.length;i++){const a=track.frames[i],b=track.frames[(i+1)%track.frames.length],delta=angleDelta(Math.atan2(b.tx,b.tz),Math.atan2(a.tx,a.tz));if(delta>.002)positive++;if(delta<-.002)negative++;
  for(let j=i+1;j<track.frames.length;j++){const arc=Math.min(j-i,track.frames.length-(j-i))*track.length/track.frames.length;if(arc>45)assert.ok(Math.hypot(a.x-track.frames[j].x,a.z-track.frames[j].z)>24,'Road segments overlap');}
 }assert.ok(positive>10&&negative>10);assert.equal(courseSector(0).name,'출발 대로');assert.equal(courseSector(.5).name,'가든 S자');
});
function collide(car,closing,side=false,hz=120){
 const a=makeRacer(track,{id:'a',car}),b=makeRacer(track,{id:'b',car}),p=new RacePhysics(track,[a,b],rigs,{barriers:false});p.route=()=>({steer:0});
 const sa=p.entries[0].s,sb=p.entries[1].s;Object.assign(sa,{x:side?-2.3:0,z:0,heading:0,u:side?15:20,v:side?closing:0});Object.assign(sb,{x:0,z:side?1:5,heading:0,u:side?15:20-closing,v:0});p.entries.forEach(e=>p.sync(e,false));
 let hits=[],maxRoll=0,maxPitch=0,maxSide=0;for(let i=0;i<3*hz;i++){hits.push(...p.step(1/hz,{steer:0},false).hits.filter(h=>h.id==='b'));maxRoll=Math.max(maxRoll,Math.abs(b.motion.roll));maxPitch=Math.max(maxPitch,Math.abs(b.motion.pitch));maxSide=Math.max(maxSide,Math.abs(sb.x));}
 const out={hits,maxRoll,maxPitch,maxSide,x:sb.x,z:sb.z,u:sb.u,v:sb.v,yaw:sb.yawRate};p.dispose();return out;
}
test('small, medium and large closing speeds produce distinct actual collision events',()=>{
 for(const car of ['tavaculo','f2002'])for(const [closing,level] of [[2,'light'],[6,'medium'],[20,'heavy']]){const result=collide(car,closing);assert.equal(result.hits[0]?.level,level);assert.ok(result.maxPitch>0);assert.ok(Math.abs(result.hits[0].closing-closing)<.1);}
});
test('normal approach speed excludes high-speed parallel rubbing and includes angular impact',()=>{
 const c={bi:{id:1},bj:{id:2},ni:{x:1,z:0},ri:{x:0,z:2},rj:{x:0,z:0}};
 assert.equal(contactClosing(c,new Map([[1,{x:0,z:40,yaw:0}],[2,{x:0,z:40,yaw:0}]])),0);
 assert.equal(contactClosing(c,new Map([[1,{x:3,z:40,yaw:1}],[2,{x:0,z:40,yaw:0}]])),5);
});
test('side impact recovery limits medium sideways travel while preserving a larger heavy response',()=>{
 for(const car of ['tavaculo','f2002']){const m=collide(car,6,true),h=collide(car,12,true);assert.ok(m.maxSide<6);assert.ok(h.maxSide>m.maxSide);assert.ok(m.maxRoll>.001);assert.ok(Math.abs(m.v)<.01&&Math.abs(m.yaw)<.01);assert.ok(Math.abs(h.v)<.05&&Math.abs(h.yaw)<.05);}
});
test('post-impact help dissipates energy without changing steering or applying it outside impacts',()=>{
 const s={u:15,v:4,yawRate:1,steer:.1},copy={...s};recoverImpact(s,.1,0);assert.deepEqual(s,copy);recoverImpact(s,.1,1);assert.ok(s.u*s.u+s.v*s.v<copy.u*copy.u+copy.v*copy.v);assert.ok(s.yawRate<1);assert.equal(s.steer,.1);
});
test('collision response is independent of 30/60/120Hz presentation',()=>{
 const a=collide('tavaculo',6,true,30);for(const hz of [60,120]){const b=collide('tavaculo',6,true,hz);for(const key of ['x','z','u','v','yaw'])assert.ok(Math.abs(a[key]-b[key])<1e-9);}
});
for(const car of ['tavaculo','f2002'])test(car+' and three opponents finish the actual extended course',()=>{
 const r=makeRacer(track,{car,lane:-2.3}),racers=[r,...[0,1,2].map(i=>makeRacer(track,{id:'bot'+i,car:i===1?'tavaculo':'f2002',s:7+i*7,lane:i%2?-2.3:2.3}))],p=new RacePhysics(track,racers,rigs);let maxLateral=0;
 for(let i=0;i<180*120&&!racers.every(r=>r.finished);i++){p.step(1/120,r.finished?{brake:1}:p.route(p.entries[0]),false);racers.forEach(r=>finishRacer(r,track,i/120));maxLateral=Math.max(maxLateral,Math.abs(nearestTrack(track,r.x,r.z).lateral));}
 assert.ok(racers.every(r=>r.finished));assert.ok(r.finishTime>75&&r.finishTime<130);assert.ok(maxLateral<8.8);p.dispose();
});
test('legacy records survive and extended-course records export and import without loss',()=>{
 const old=normalizeSave({version:1,coins:4321,races:12,best:{tavaculo:29.5}}),next=structuredClone(old);next.courseBest[COURSE_ID]={tavaculo:95.2,f2002:91.7};
 assert.equal(next.best.tavaculo,29.5);assert.deepEqual(parseTransfer(createTransfer(next)).save,next);
 const data=new Map([[SAVE_KEY,JSON.stringify(old)]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const prepared=prepareImport(storage,createTransfer(next));assert.equal(prepared.incoming.courseBest[COURSE_ID].tavaculo,95.2);const result=applyImport(storage,prepared);assert.equal(result.unchanged,false);assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)),next);const reordered=structuredClone(next);reordered.courseBest[COURSE_ID]={f2002:91.7,tavaculo:95.2};assert.equal(applyImport(storage,prepareImport(storage,createTransfer(reordered))).unchanged,true);
 const legacy={...old};delete legacy.courseBest;assert.equal(parseTransfer(createTransfer(legacy)).save.best.tavaculo,29.5);
 const bad=structuredClone(next);bad.courseBest[COURSE_ID].tavaculo=-1;assert.throws(()=>parseTransfer(JSON.stringify({app:'dream-garage-save',formatVersion:1,exportedAt:new Date().toISOString(),save:bad})));
});
