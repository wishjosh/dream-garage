import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as current from '../dist/handling-physics.mjs';
import * as before from '../dist/handling-baseline.mjs';
import {benchmark,run} from '../dist/handling-bench.mjs';
const measured=benchmark(current),baseline=benchmark(before);
for(const check of measured.checks)test('source audit: '+check.name,()=>assert.ok(check.pass,JSON.stringify(measured[check.id]??check)));
test('baseline reproduces the diagnosed low-speed and integration defects',()=>{
 assert.equal(baseline.checks.find(c=>c.id==='low').pass,false);
 assert.equal(baseline.checks.find(c=>c.id==='convergence').pass,false);
 assert.ok(baseline.low.find(x=>x.speed===1).errorPercent>300);
});
test('combined tyre forces share a continuous finite load-limited friction budget',()=>{
 for(const load of [100,2000,8000,14000])for(const alpha of [-2,-.4,-.1,0,.1,.4,2])for(const demand of [-20000,-8000,0,8000,20000]){
  const f=current.combinedTyre(alpha,74000,load,demand);
  assert.ok(Number.isFinite(f.longitudinal)&&Number.isFinite(f.lateral));
  assert.ok(Math.hypot(f.longitudinal,f.lateral)<=load*(1+1e-12));
  assert.ok(f.lateral*alpha>=0&&f.longitudinal*demand>=0);
 }
 for(const alpha of [.139999,.140001,.439999,.440001]){
  const a=current.combinedTyre(alpha,74000,6000,3000),b=current.combinedTyre(alpha+1e-7,74000,6000,3000);
  assert.ok(Math.hypot(a.longitudinal-b.longitudinal,a.lateral-b.lateral)<.01);
 }
 const free=current.combinedTyre(.1,74000,6000,0),combined=current.combinedTyre(.1,74000,6000,9000);
 assert.ok(combined.lateral<free.lateral,'accelerating/braking spends some turning capacity');
});
test('normal loads sum to weight and move forward under deceleration',()=>{
 for(const ax of [-9,0,7]){
  const s=current.createCar(60);s.ax=ax;current.stepCar(s,{},1/240,{walls:false});
  assert.ok(Math.abs(s.frontLoad+s.rearLoad-current.CAR.mass*9.81)<1e-9);
  const rest=current.CAR.mass*9.81*current.CAR.b/(current.CAR.a+current.CAR.b);
  if(ax<0)assert.ok(s.frontLoad>rest);if(ax>0)assert.ok(s.frontLoad<rest);
 }
});
test('tyre lateral work opposes local sideways contact motion, including reverse',()=>{
 for(const speed of [-18,-5,0,1,60])for(const v of [-5,0,5])for(const yawRate of [-1,0,1])for(const steer of [-1,0,1]){
  const s=Object.assign(current.createCar(speed),{v,yawRate,steer:steer*.46});
  current.stepCar(s,{steer,brake:.4},1/240,{walls:false});
  assert.ok(s.frontForce*s.frontContactLateral<=1e-9);
  assert.ok(s.rearForce*s.rearContactLateral<=1e-9);
  assert.ok(s.frontLongitudinal*s.frontContactLongitudinal<=1e-9);
 }
});
test('mirrored inputs give mirrored free paths and consistent braking distances',()=>{
 for(const speed of [5,40,60,100])for(const brake of [0,.4,1]){
  const a=run(current,{speed,seconds:2,input:{steer:.3,brake}}),b=run(current,{speed,seconds:2,input:{steer:-.3,brake}});
  for(const key of ['x','heading','v','yawRate'])assert.ok(Math.abs(a.state[key]+b.state[key])<1e-9);
  assert.ok(Math.abs(a.state.z-b.state.z)<1e-9);
 }
});
test('large frame steps are internally subdivided, without amplifying a slow corner',()=>{
 const a=run(current,{speed:5,seconds:3,input:{steer:.25},dt:1/30});
 const b=run(current,{speed:5,seconds:3,input:{steer:.25},dt:1/120});
 assert.ok(Math.hypot(a.state.x-b.state.x,a.state.z-b.state.z)<1e-10);
});
test('saved comparison matches the executable model and frozen baseline hashes',async()=>{
 const data=JSON.parse(await fs.readFile(new URL('../dist/handling-results.json',import.meta.url)));
 for(const [key,name] of [['before','handling-baseline.mjs'],['after','handling-physics.mjs']]){
  const bytes=(await fs.readFile(new URL('../dist/'+name,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),data.hashes[key]);
 }
 assert.deepEqual(data.after.checks,measured.checks);
 function close(a,b,path='result'){
  if(typeof b==='number')assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),path);
  else if(b&&typeof b==='object'){assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(b))close(a[k],b[k],path+'.'+k);}
  else assert.equal(a,b,path);
 }
 close(data.before,baseline);close(data.after,measured);
});
