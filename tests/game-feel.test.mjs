import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assistedSteer,stabilize} from '../dist/driver-feel.mjs';
import {createBodyMotion,stepBodyMotion,BODY_FEEL} from '../dist/body-motion.mjs';
import {RacePhysics} from '../dist/race-handling.mjs';
import {makeRacer} from '../dist/race-core.mjs';
import {createSlide,beginSlide,moveSlide} from '../dist/city-steering.mjs';
const rigs=JSON.parse(fs.readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));
const track={length:2000,frames:Array.from({length:360},(_,i)=>{const a=i/360*Math.PI*2;return{x:320*Math.cos(a),z:320*Math.sin(a),tx:-Math.sin(a),tz:Math.cos(a),rx:Math.cos(a),rz:Math.sin(a)};})};
function setup(car='tavaculo'){const r=makeRacer(track,{car}),p=new RacePhysics(track,[r],rigs,{barriers:false});return{r,p};}
function advance(p,time,input,assist=true,hz=120){for(let i=0;i<Math.round(time*hz);i++)p.step(1/hz,input,assist);}
test('assisted input is symmetric, monotonic and zero stays zero at every speed',()=>{
 for(const v of [0,5,12,20,30,45]){let last=0;for(let i=0;i<=100;i++){const u=i/100,x=assistedSteer(u,v,2.6);assert.ok(x>=last-1e-12&&x<=1);assert.equal(x,-assistedSteer(-u,v,2.6)||0);last=x;}assert.equal(assistedSteer(0,v,2.6),0);}
 assert.ok(assistedSteer(1,30,2.6)<assistedSteer(1,10,2.6));assert.ok(assistedSteer(.1,0,2.6)<.06);
});
test('the same CSS-pixel movement commands the same input on phone sizes',()=>{
 const values=[111.2,136.4,211,216].map(width=>{const s=createSlide();beginSlide(s,1,80,width);moveSlide(s,1,75);return s.value;});assert.ok(values.every(v=>v===values[0]));
});
test('assistance never follows the road after releasing steering',()=>{
 for(const car of ['tavaculo','f2002']){const{r,p}=setup(car);p.route=()=>{throw Error('Player autopilot called');};p.entries[0].s.u=60/3.6;const h=r.heading;advance(p,1,{steer:0});assert.equal(r.commandedSteer,0);assert.ok(Math.abs(r.heading-h)<1e-10);advance(p,1,{});assert.ok(Math.abs(r.heading-h)<1e-10);p.dispose();}
});
test('stability help only dissipates slip/yaw and lets deliberate drift remain',()=>{
 const s={u:20,v:4,yawRate:.7,beta:.2};stabilize(s,{neutral:true},.1);assert.equal(s.u,20);assert.ok(s.v>0&&s.v<4&&s.yawRate>0&&s.yawRate<.7);
 const d={u:20,v:4,yawRate:.7,beta:.2};stabilize(d,{neutral:true,driftLevel:1},.1);assert.deepEqual(d,{u:20,v:4,yawRate:.7,beta:.2});
});
test('a stationary steering wheel does not tilt the body; motion settles without input',()=>{
 for(const car of ['tavaculo','f2002']){const s=createBodyMotion();for(let i=0;i<120;i++)stepBodyMotion(s,{ax:0,ay:0,speed:0},car,1/120);assert.deepEqual(s,createBodyMotion());for(let i=0;i<120;i++)stepBodyMotion(s,{ax:5,ay:6,speed:16},car,1/120);assert.ok(s.roll>0&&s.pitch<0);for(let i=0;i<240;i++)stepBodyMotion(s,{speed:0},car,1/120);assert.ok(Math.abs(s.roll)+Math.abs(s.pitch)<1e-5);}
});
test('achieved corner/brake forces have correct body signs and bounded overshoot',()=>{
 for(const car of ['tavaculo','f2002']){const s=createBodyMotion(),c=BODY_FEEL[car];for(let i=0;i<120;i++)stepBodyMotion(s,{ax:-8,ay:-12,speed:25},car,1/120);assert.ok(s.roll<0&&s.pitch>0);assert.ok(Math.abs(s.roll)<=c.maxRoll&&s.pitch<=c.maxPitch);}
 const a=createBodyMotion(),b=createBodyMotion();for(let i=0;i<120;i++){stepBodyMotion(a,{ay:6,speed:20},'tavaculo',1/120);stepBodyMotion(b,{ay:6,speed:20},'f2002',1/120);}assert.ok(a.roll>b.roll*2);
});
test('presentation toggle changes body pose but not trajectory or road wheel contact',()=>{
 const a=setup(),b=setup();b.p.presentationEnabled=false;
 for(const input of [{steer:0,throttle:1},{steer:.5,throttle:1},{steer:0,brake:1}]){advance(a.p,1,input);advance(b.p,1,input);for(const key of ['x','z','heading','speed','distance'])assert.equal(a.r[key],b.r[key]);assert.ok(a.r.wheels.every((w,i)=>Math.abs(w.position[1]-rigs.tavaculo.wheels[i].position[1]-.045)<1e-8));}
 a.p.dispose();b.p.dispose();
});
test('new assisted controls and body motion are consistent at 30/60/120Hz',()=>{
 const results=[];for(const hz of [30,60,120]){const{r,p}=setup();advance(p,2,{steer:0,throttle:1},true,hz);advance(p,1,{steer:.55,throttle:1},true,hz);advance(p,1,{steer:0},true,hz);results.push([r.x,r.z,r.heading,r.motion.roll,r.motion.pitch]);p.dispose();}for(const row of results.slice(1))row.forEach((v,i)=>assert.ok(Math.abs(v-results[0][i])<1e-9));
});
test('assisted release improves recovery without an opposite wheel command',()=>{
 for(const car of ['tavaculo','f2002']){const{r,p}=setup(car);advance(p,2,{steer:0,throttle:1});advance(p,.7,{steer:.65,throttle:1});assert.ok(r.motion.roll>.003);advance(p,1.5,{steer:0});assert.equal(r.commandedSteer,0);assert.ok(Math.abs(r.steeringAngle)<.001);assert.ok(Math.abs(p.entries[0].s.yawRate)<.04);p.dispose();}
});
test('recovery chooses a clear lane and never advances race progress',()=>{
 const r=makeRacer(track),other=makeRacer(track,{id:'other'}),p=new RacePhysics(track,[r,other],rigs,{barriers:false});const before=r.distance;
 // Centre is occupied: no unsafe teleport directly into the other car.
 assert.equal(p.recover(r),false);assert.equal(r.distance,before);
 p.entries[1].s.x+=20;assert.equal(p.recover(r),true);assert.equal(r.distance,before);assert.deepEqual(p.entries[0].motion,createBodyMotion());p.dispose();
});

test('assisted brake steering keeps the requested turn direction for both cars',()=>{
 for(const car of ['tavaculo','f2002'])for(const speed of [40,60,100])for(const sign of [-1,1]){
  const {r,p}=setup(car);p.entries[0].s.u=speed/3.6;const h=r.heading;
  advance(p,.6,{steer:sign*.6,brake:1});assert.ok((r.heading-h)*sign>0);assert.ok(r.forwardSpeed<speed/3.6);p.dispose();
 }
});
test('assisted driving preserves deliberate drift and a separate reverse input',()=>{
 for(const car of ['tavaculo','f2002']){
  const {r,p}=setup(car);p.entries[0].s.u=15;advance(p,.6,{steer:.65,drift:true});assert.ok(r.driftLevel>.9&&r.drifting);
  advance(p,2,{steer:0,brake:1});assert.ok(r.driftLevel<.001&&!r.drifting);p.recover(r);
  advance(p,1,{steer:0,reverse:true});assert.ok(r.forwardSpeed<-.5);assert.equal(r.driveMode,'reverse');p.dispose();
 }
});
test('corner advice is informational and disappears below the braking threshold',()=>{
 const tight={...track,frames:track.frames.map(f=>({...f,x:f.x/8,z:f.z/8})),length:250};
 const r=makeRacer(tight),p=new RacePhysics(tight,[r],rigs,{barriers:false}),s=p.entries[0].s;
 s.u=25;p.sync(p.entries[0],false);const before=JSON.stringify(s);assert.equal(p.advice(r),'코너 앞 · 브레이크');assert.equal(JSON.stringify(s),before);
 s.u=5;assert.equal(p.advice(r),null);r.heading+=Math.PI;assert.equal(p.advice(r),'반대 방향 · 도로 복귀');s.u=0;assert.equal(p.advice(r),null);p.dispose();
});
