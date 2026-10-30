import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/vendor/three.module.js';
import {RacePhysics,vehicleConfig} from '../dist/race-handling.mjs';
import {createCar,stepCar,DT,CAR} from '../dist/handling-physics.mjs';
import {makeRacer,finishRacer,nearestTrack} from '../dist/race-core.mjs';
const rigs=JSON.parse(fs.readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));
const points=[[0,0],[0,85],[-10,125],[-65,145],[-130,125],[-175,85],[-180,20],[-145,-30],[-75,-55],[-15,-30]];
const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)),true,'catmullrom',.35);
const track={length:curve.getLength(),frames:Array.from({length:420},(_,i)=>{const p=curve.getPointAt(i/420),d=curve.getTangentAt(i/420).normalize();return{x:p.x,z:p.z,tx:d.x,tz:d.z,rx:d.z,rz:-d.x};})};
function setup(car='tavaculo',options={}){const r=makeRacer(track,{car});return{r,p:new RacePhysics(track,[r],rigs,{barriers:false,...options})};}
function advance(p,seconds,input={},assist=false,dt=1/60){let hits=[];for(let i=0;i<Math.round(seconds/dt);i++)hits.push(...p.step(dt,input,assist).hits);return hits;}
test('main Tavaculo free travel is identical to the verified study, including braking/slip/recovery',()=>{
 const{r,p}=setup(),s=Object.assign(createCar(60),{x:r.x,z:r.z,heading:r.heading,v:-2.5,yawRate:.5,powerSlip:.8});Object.assign(p.entries[0].s,s);
 for(const input of [{steer:.25,throttle:1},{steer:.25,brake:.5},{steer:0,brake:.4},{steer:0,throttle:1}]){
  for(let i=0;i<240;i++){p.step(DT,input,false);stepCar(s,input,DT,{walls:false});}
  for(const key of ['x','z','heading','u','v','yawRate','frontSlip','rearSlip'])assert.ok(Math.abs(p.entries[0].s[key]-s[key])<1e-10,key);
 }p.dispose();
});
test('stock and purchased parts map to the shared tyre configuration',()=>{
 assert.deepEqual(vehicleConfig('tavaculo'),CAR);const c=vehicleConfig('tavaculo',{force:1.18,maxSpeed:1.08,grip:1.18,brake:1.2});
 assert.equal(c.engine,CAR.engine*1.18);assert.equal(c.frontMu,CAR.frontMu*1.18);assert.equal(c.rearMu,CAR.rearMu*1.18);assert.equal(c.brake,CAR.brake*1.2);assert.equal(c.maxSpeed,CAR.maxSpeed*1.08);
 const a=setup(),b=setup('tavaculo',{playerTuning:{force:1.18}});advance(a.p,2,{throttle:true});advance(b.p,2,{throttle:true});assert.ok(b.r.speed>a.r.speed);a.p.dispose();b.p.dispose();
});
for(const car of ['tavaculo','f2002']){
 test(car+' dedicated controls, brake priority, reverse gate and drift recovery',()=>{
  const{r,p}=setup(car);advance(p,2,{throttle:true});assert.ok(r.forwardSpeed>7);
  advance(p,4,{reverse:true});assert.ok(r.reverseBlocked&&r.speed<.2);
  advance(p,.1,{});advance(p,1,{reverse:true});assert.ok(r.forwardSpeed<-.6);
  advance(p,3,{throttle:true,reverse:true,brake:true,drift:true,left:true});assert.ok(r.speed<.2&&!r.drifting);
  p.recover(r);advance(p,2,{throttle:true});advance(p,.55,{left:true,drift:true});assert.ok(r.drifting&&Math.abs(r.lateralSpeed)>.2);
  advance(p,3,{brake:true});assert.ok(Math.abs(r.lateralSpeed)<.1&&r.speed<.2&&!r.drifting);p.dispose();
 });
 test(car+' completes the actual city with scripted inputs and three physical opponents',()=>{
  const r=makeRacer(track,{car,lane:-2.3}),racers=[r,...[0,1,2].map(i=>makeRacer(track,{id:'bot'+i,car:i===1?'tavaculo':'f2002',s:7+i*7,lane:i%2?-2.3:2.3}))];
  const p=new RacePhysics(track,racers,rigs);let ticks=0,hits=0,maxLateral=0;
  for(;ticks<120*120&&!r.finished;ticks++){hits+=p.step(DT,p.route(p.entries[0]),false).hits.filter(h=>h.id===r.id).length;racers.forEach(x=>finishRacer(x,track,ticks*DT));maxLateral=Math.max(maxLateral,Math.abs(nearestTrack(track,r.x,r.z).lateral));}
  assert.ok(r.finished,JSON.stringify({car,seconds:ticks*DT,distance:r.distance,speed:r.speed,x:r.x,z:r.z,hits,maxLateral}));assert.equal(r.gate,4);assert.ok(maxLateral<9);assert.ok(racers.every(x=>Number.isFinite(x.speed)));p.dispose();
 });
}
test('barriers stop an outward car and recovery never grants progress',()=>{
 const{r,p}=setup('tavaculo',{barriers:true});p.entries[0].s.heading=r.heading+Math.PI/2;
 const hits=advance(p,3,{throttle:true});assert.ok(hits.some(h=>h.kind==='barrier'));assert.ok(Math.abs(nearestTrack(track,r.x,r.z).lateral)<8.8);
 const distance=r.distance;p.recover(r);assert.equal(r.distance,distance);assert.equal(r.speed,0);assert.equal(r.driveMode,'coast');p.dispose();
});
test('car impact transfers momentum without a second tyre force or teleport',()=>{
 const a=makeRacer(track),b=makeRacer(track,{id:'bot',s:5});const p=new RacePhysics(track,[a,b],rigs,{barriers:false});p.entries[0].s.u=20;
 // Keep the struck car stationary until impact rather than driving its AI.
 p.route=()=>({steer:0,throttle:0,brake:0});const hits=advance(p,.4,{});
 assert.ok(hits.some(h=>h.kind==='car'));assert.ok(b.speed>3);assert.ok(a.speed<20);p.dispose();
});
test('display timing, manual direction and wheel spin remain consistent',()=>{
 const results=[];for(const dt of [1/30,1/60,1/120]){const{r,p}=setup();advance(p,2,{throttle:true},false,dt);advance(p,.5,{left:true,drift:true},false,dt);results.push([r.x,r.z,r.speed,r.steeringAngle]);assert.ok(r.steeringAngle>0);assert.ok(r.wheelSpin<0);p.dispose();}
 for(const values of results.slice(1))values.forEach((v,i)=>assert.ok(Math.abs(v-results[0][i])<1e-9));
});

test('assistance preserves straight input and never silently takes over steering',()=>{
 const{r,p}=setup();p.route=()=>({steer:-.3,throttle:0,brake:1});
 advance(p,1,{throttle:true},true);assert.ok(r.forwardSpeed>2);assert.equal(r.braking,false);assert.ok(Math.abs(r.steeringAngle)<1e-9);
 advance(p,1.5,{left:true,throttle:true},true);assert.ok(r.steeringAngle>0&&r.commandedSteer>0);assert.equal(r.braking,false);p.dispose();
});
test('main entry uses the verified adapter and preserves the existing save modules',()=>{
 const game=fs.readFileSync(new URL('../dist/game.mjs',import.meta.url),'utf8');
 assert.match(game,/import \{RacePhysics,FIXED_DT\} from '\.\/studies\/mixed-city\/physics\.mjs/);
 assert.match(fs.readFileSync(new URL('../dist/studies/mixed-city/physics.mjs',import.meta.url),'utf8'),/RacePhysics extends BaseRacePhysics/);
 assert.match(game,/const SAVE=SAVE_KEY/);assert.match(game,/installSaveTransfer/);
 assert.equal(fs.readFileSync(new URL('../dist/save-transfer.mjs',import.meta.url),'utf8').includes('hojin-city-gp:save:v1'),true);
});
