import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COURSES,createCourse} from '../dist/studies/city-geometry/courses.mjs';
import {RacePhysics} from '../dist/studies/city-geometry/physics.mjs';
import {vehicleConfig} from '../dist/race-handling.mjs';
import {makeRacer,finishRacer,nearestTrack} from '../dist/race-core.mjs';
const rigs=JSON.parse(readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));
rigs.porsche=rigs.tavaculo; // Only the tyre/wheel geometry contract is used by this CPU test.
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
for(const course of COURSES){
 test(course.id+' has a continuous loop, usable width and no road crossing',()=>{
  const t=createCourse(course.id);assert.ok(t.length>1900&&t.length<1950);
  const f=t.frames,ds=t.length/f.length;
  for(let i=0;i<f.length;i++){
   const a=f[i],b=f[(i+1)%f.length],angle=Math.atan2(b.tx*a.tz-b.tz*a.tx,b.tx*a.tx+b.tz*a.tz);
   assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<ds*1.03,'seam or sample gap');
   assert.ok(Math.abs(angle)/ds<1/18,'corner radius below 18m');
   for(let j=i+20;j<f.length;j++){
    if(f.length-j+i<20)continue;
    const c=f[j],d=f[(j+1)%f.length];
    assert.ok(Math.hypot(a.x-c.x,a.z-c.z)>26,'nearby road sections overlap');
    assert.ok(!(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0),'crossing');
   }
  }
 });
 test(course.id+' supports a complete lap with four physical stock supercars',context=>{
  const track=createCourse(course.id),racers=['tavaculo','porsche','tavaculo','porsche'].map((car,i)=>makeRacer(track,{car,id:i?'bot'+i:'player',s:i?7+(i-1)*7:0,lane:i%2?2.3:-2.3}));
  const physics=new RacePhysics(track,racers,rigs,{autoRecovery:true});let maxLateral=0,ticks=0;
  for(;ticks<160*60&&!racers.every(r=>r.finished);ticks++){
   const player=physics.entries[0];physics.step(1/60,player.r.finished?{brake:1}:{...physics.route(player),wheelCommand:true},false);
   for(const r of racers){finishRacer(r,track,ticks/60);assert.ok(Number.isFinite(r.speed));if(!r.finished)maxLateral=Math.max(maxLateral,Math.abs(nearestTrack(track,r.x,r.z).lateral));}
  }
  const report={seconds:ticks/60,maxLateral,recoveries:physics.aiRecoveryCount,cars:racers.map(r=>({id:r.id,finished:r.finished,distance:r.distance,speed:r.speed}))};
  context.diagnostic(JSON.stringify(report));
  assert.ok(racers.every(r=>r.finished),JSON.stringify(report));assert.ok(maxLateral<8.2,JSON.stringify(report));assert.equal(physics.aiRecoveryCount,0,JSON.stringify(report));physics.dispose();
 });
}
test('study never touches main persistence and does not grant rewards',()=>{
 const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const game=read('dist/studies/city-geometry/game.mjs');
 assert.doesNotMatch(game,/localStorage|sessionStorage|SAVE_KEY|readSnapshot|installSaveTransfer|save\.coins\s*\+=/);
 assert.match(game,/function persist\(\)\{\}/);assert.match(game,/auto:false/);
 assert.deepEqual(vehicleConfig('porsche'),vehicleConfig('tavaculo'));
 assert.match(read('dist/studies/city-geometry/app.mjs'),/token===loadToken/);
});
