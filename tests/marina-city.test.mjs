import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createMarinaCourse,BLOCKS,STREETS,inWater,bridgeDeck,streetDistance} from '../dist/marina-city/plan.mjs';
import {RacePhysics} from '../dist/course-race-physics.mjs';
import {makeRacer,finishRacer,nearestTrack} from '../dist/race-core.mjs';
import {normalizeSave} from '../dist/garage-core.mjs';
import {raceCourse} from '../dist/race-courses.mjs';
const track=createMarinaCourse();
test('Marina street loop stays continuous, non-overlapping and on the city road network',()=>{
 assert.ok(track.length>2400&&track.length<2800);const ds=track.length/track.frames.length;
 for(let i=0;i<track.frames.length;i++){const a=track.frames[i],b=track.frames[(i+1)%track.frames.length];assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<ds*1.01);assert.ok(Math.abs(Math.atan2(a.tx*b.tz-a.tz*b.tx,a.tx*b.tx+a.tz*b.tz))/ds<1/34);assert.ok(STREETS.some(s=>streetDistance(a.x,a.z,s)<11),'road network disconnected');for(let j=i+24;j<track.frames.length;j+=8){if(track.frames.length-j+i<24)continue;assert.ok(Math.hypot(a.x-track.frames[j].x,a.z-track.frames[j].z)>30,'track folds into itself');}}
});
test('Marina buildings and water leave the road corridor clear, with one supported channel crossing',()=>{
 let waterSamples=0;for(const f of track.frames){if(inWater(f.x,f.z)){waterSamples++;assert.ok(bridgeDeck(f.x,f.z),'unsupported road over water');}for(const b of BLOCKS){const dx=Math.max(0,Math.abs(f.x-b.x)-b.w/2),dz=Math.max(0,Math.abs(f.z-b.z)-b.d/2);assert.ok(Math.hypot(dx,dz)>13,`${b.id} encroaches road at ${f.s}`);}}assert.ok(waterSamples>20&&waterSamples<45);
});
test('new Marina records preserve existing wallet, purchases, selected car and older course records',()=>{
 const old={version:1,coins:150,car:'porsche',owned:['paint-mint'],garage:{porsche:{paint:'paint-mint'}},courseBest:{'speed-ring-circuit-1':{porsche:193.13},'marina-city-1':{porsche:160}}};const save=normalizeSave(old);assert.equal(save.coins,150);assert.equal(save.garage.porsche.paint,'paint-mint');assert.equal(save.car,'porsche');assert.deepEqual(save.courseBest,old.courseBest);assert.equal(raceCourse('marina').id,track.id);
});
test('Marina original facade package is self-contained and contains actual windows',()=>{
 const base=new URL('../dist/assets/marina-city/facade/',import.meta.url),doc=JSON.parse(readFileSync(new URL('facade.gltf',base)));for(const file of [...doc.buffers,...doc.images])assert.ok(existsSync(new URL(file.uri,base)),file.uri);assert.ok(doc.nodes.some(n=>n.name==='window_centered_double_01'));assert.ok(doc.buffers[0].byteLength<400000);
});
for(const car of ['tavaculo','porsche','f2002'])test(`Marina ${car}: four vehicles complete the street course without off-road recovery`,context=>{
 const rigs=JSON.parse(readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));rigs.porsche=rigs.tavaculo;
 const racers=Array.from({length:4},(_,i)=>makeRacer(track,{car,id:i?'bot'+i:'player',s:i?7+(i-1)*7:0,lane:i%2?2.3:-2.3}));const physics=new RacePhysics(track,racers,rigs,{raceRecovery:true,finishDriveThrough:true});physics.presentationEnabled=false;let ticks=0,maxLateral=0;
 for(;ticks<240*60&&!racers.every(r=>r.finished);ticks++){physics.step(1/60,{...physics.route(physics.entries[0]),wheelCommand:true},false);for(const r of racers){finishRacer(r,track,ticks/60);if(!r.finished)maxLateral=Math.max(maxLateral,Math.abs(nearestTrack(track,r.x,r.z).lateral));}}
 context.diagnostic(JSON.stringify({car,seconds:ticks/60,maxLateral,recoveries:physics.aiRecoveryCount,finished:racers.map(r=>r.finished)}));assert.ok(racers.every(r=>r.finished));assert.ok(maxLateral<8.2);assert.equal(physics.aiRecoveryCount,0);physics.dispose();
});
