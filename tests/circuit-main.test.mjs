import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {raceCourse,courseURL} from '../dist/race-courses.mjs';
import {loadCourseRuntime} from '../dist/course-runtime.mjs';
import {CIRCUIT_ID} from '../dist/circuit-course.mjs';
import {normalizeSave,tuning,CATEGORIES} from '../dist/garage-core.mjs';
import {createTransfer,parseTransfer,readSnapshot,SAVE_KEY} from '../dist/save-transfer.mjs';
import {createPreviewSession} from '../dist/garage-preview-core.mjs';
import {createRaceSettlement} from '../dist/race-settlement.mjs';
import {makeRacer,finishRacer} from '../dist/race-core.mjs';
import {opponentCars} from '../dist/main-vehicles.mjs';
const rigs=JSON.parse(readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));
const manifest=JSON.parse(readFileSync(new URL('../dist/assets/vehicle-compare/porsche-911/manifest.json',import.meta.url)));
rigs.porsche={radius:manifest.wheelCenters.fl[1],wheels:Object.entries(manifest.wheelCenters).map(([id,[x,y,z]])=>({name:'wheel_'+id,position:[-x,y,-z],front:id[0]==='f'}))};
const runtime=await loadCourseRuntime(raceCourse('circuit'));
for(const car of ['tavaculo','porsche','f2002'])test(car+' circuit race → reward → purchase → reload → tuned next race',()=>{
 const save=normalizeSave({version:1,coins:4321,races:12,car,courseBest:{'geometry-speed-1':{tavaculo:111}},owned:['paint-mint'],garage:{tavaculo:{paint:'paint-mint'}}}),before=structuredClone(save),track=raceCourse('circuit').create();
 const racers=[makeRacer(track,{car,lane:-2.3}),...opponentCars(car).map((car,i)=>makeRacer(track,{car,id:'bot'+i,s:7+i*7,lane:i%2?-2.3:2.3}))],player=racers[0];
 const physics=runtime.createPhysics(track,racers,rigs,{autoRecovery:true,playerTuning:tuning(save,car)}),settle=createRaceSettlement(CIRCUIT_ID);
 const baseEngine=physics.entries[0].config.engine;
 assert.equal(physics.layout.id,'compact');assert.equal(settle.finish(save,player,racers,0),null);assert.deepEqual(save,before);
 let elapsed=0,maxHeight=0;
 try {
  for(let ticks=0;ticks<200*60&&!player.finished;ticks++){
   physics.step(1/60,{...physics.route(physics.entries[0]),wheelCommand:true},false);elapsed+=1/60;
   racers.slice(1).forEach(r=>finishRacer(r,track,elapsed));finishRacer(player,track,elapsed);maxHeight=Math.max(maxHeight,player.y);
  }
  assert.equal(player.finished,true);assert.ok(maxHeight>7.5);assert.equal(physics.recoveryStats().count,0);
  const award=settle.finish(save,player,racers,elapsed);assert.ok(award.prize>=150);assert.equal(save.coins,before.coins+award.prize);assert.equal(save.races,13);assert.equal(save.courseBest[CIRCUIT_ID][car],elapsed);
  const once=structuredClone(save);assert.equal(settle.finish(save,player,racers,elapsed),null);assert.deepEqual(save,once);
  const preview=createPreviewSession({categories:Object.keys(CATEGORIES)});preview.begin(save,car,'engine-sprint');assert.equal(tuning(save,car).force,1);preview.cancel();assert.deepEqual(save,once);
  preview.begin(save,car,'engine-sprint');assert.equal(preview.confirm(save,car).ok,true);assert.equal(save.coins,once.coins-650);assert.equal(preview.confirm(save,car).ok,false);
  const storage=new Map([[SAVE_KEY,JSON.stringify(save)]]),restored=readSnapshot({getItem:key=>storage.get(key)||null}).save;
  assert.deepEqual(restored,save);assert.deepEqual(parseTransfer(createTransfer(save)).save,save);assert.deepEqual(restored.courseBest['geometry-speed-1'],before.courseBest['geometry-speed-1']);
  for(const other of Object.keys(before.garage).filter(c=>c!==car))assert.deepEqual(restored.garage[other],before.garage[other]);
  const next=runtime.createPhysics(track,[makeRacer(track,{car})],rigs,{playerTuning:tuning(restored,car)});
  try{assert.ok(Math.abs(next.entries[0].config.engine/baseEngine-1.18)<1e-9);}finally{next.dispose();}
 }finally{physics.dispose();}
});
test('circuit records are separate from the original flat speed course and study',()=>{
 assert.equal(raceCourse('speed').id,'geometry-speed-1');assert.equal(raceCourse(null).key,'tour');assert.equal(raceCourse(CIRCUIT_ID).key,'circuit');
 assert.notEqual(CIRCUIT_ID,'circuit-elevation-study-1');const url=new URL(courseURL('https://example.test/dream-garage/?view=cockpit','circuit'));assert.equal(url.searchParams.get('course'),'circuit');assert.equal(url.searchParams.get('view'),'cockpit');
});
test('slower second race retains the best and a fresh race can earn another prize',()=>{
 const save=normalizeSave(null),player={car:'porsche',finished:true,distance:100},racers=[player];
 createRaceSettlement(CIRCUIT_ID).finish(save,player,racers,90);const result=createRaceSettlement(CIRCUIT_ID).finish(save,player,racers,100);
 assert.equal(result.previousBest,90);assert.equal(result.record,false);assert.equal(save.courseBest[CIRCUIT_ID].porsche,90);assert.equal(save.coins,2000);assert.equal(save.races,2);
});
