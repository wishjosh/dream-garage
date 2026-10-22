import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCar,stepCar,DT,CAR,cornerPoint,nearestCorner} from '../dist/handling-physics.mjs';
import {createControls,readControls,pressControl,moveSlide,releaseControl,clearControls,setControlMode,slideValue} from '../dist/handling-input.mjs';
const advance=(s,seconds,input,options={walls:false})=>{for(let i=0;i<Math.round(seconds/DT);i++)stepCar(s,typeof input==='function'?input(s):input,DT,options);return s;};
test('higher speed at the same wheel angle produces a wider path and front saturation',()=>{
 const slow=advance(createCar(40),1.5,{steer:.25}),fast=advance(createCar(100),1.5,{steer:.25});
 assert.ok(Math.abs(slow.beta)<.04);assert.equal(slow.underTime,0);assert.ok(fast.underTime>1);
 assert.ok(Math.abs(fast.yawRate/fast.u)<Math.abs(slow.yawRate/slow.u)*.35);
 assert.ok(Math.abs(fast.frontSlip)>Math.abs(slow.frontSlip)*4);assert.ok(Math.abs(fast.steer-slow.steer)<1e-10);
});
test('power consumes rear grip and creates actual yaw and sideways motion without a drift button',()=>{
 const coast=advance(createCar(60),1.5,{steer:.25}),power=advance(createCar(60),1.5,{steer:.25,throttle:1});
 assert.equal(coast.overTime,0);assert.ok(power.overTime>.5);assert.ok(Math.abs(power.beta)>Math.abs(coast.beta)*8);
 assert.ok(power.yawRate>coast.yawRate*1.7);assert.ok(Math.abs(power.v)>3);assert.notEqual(power.x,coast.x);
 assert.ok(power.rearLoad>coast.rearLoad);assert.ok(power.frontLoad<coast.frontLoad);
});
test('early throttle release and countersteer recover the slide without snapping the pose',()=>{
 const s=advance(createCar(60),.85,{steer:.25,throttle:1});const beta=Math.abs(s.beta),before={x:s.x,z:s.z,h:s.heading};assert.ok(beta>.08);
 stepCar(s,{steer:-.3},DT,{walls:false});assert.ok(Math.hypot(s.x-before.x,s.z-before.z)<.3);assert.ok(Math.abs(s.heading-before.h)<.02);
 advance(s,2,s=>({steer:Math.max(-.45,Math.min(.45,s.beta*2-s.yawRate*.18))}));
 assert.ok(Math.abs(s.beta)<beta*.1);assert.ok(Math.abs(s.yawRate)<.04);assert.ok(s.u>10);
});
test('straight full acceleration does not invent a lateral force or a spin',()=>{const s=advance(createCar(60),4,{throttle:1});assert.equal(s.x,0);assert.equal(s.v,0);assert.equal(s.heading,0);assert.equal(s.overTime,0);assert.ok(s.u>30);});
test('braking sheds momentum without reversing, reverse requires a fresh press at rest',()=>{
 const s=advance(createCar(60),3,{brake:1});assert.ok(Math.abs(s.u)<.08);assert.ok(s.u>=0);
 const moving=advance(createCar(40),3,{reverse:true,throttle:1});assert.equal(moving.reverseAllowed,false);assert.ok(moving.u>=0);
 stepCar(moving,{},DT,{walls:false});advance(moving,1,{reverse:true,throttle:1});assert.ok(moving.u< -1);assert.ok(moving.u>=-5);
});
test('stationary steering and a stopped brake remain finite and still',()=>{const s=createCar(0);advance(s,8,{brake:1,steer:1});assert.equal(s.x,0);assert.equal(s.z,-48);assert.equal(s.heading,0);assert.ok(Object.values(s).filter(v=>typeof v==='number').every(Number.isFinite));});
test('barriers remove outward momentum and count impacts rather than steering toward the track',()=>{
 const s=createCar(60);s.x=6.99;s.v=5;stepCar(s,{},DT);assert.ok(s.x<=7.01);assert.equal(s.hits,1);assert.ok(s.v<1);
 const free=createCar(60);free.x=6.99;free.v=5;stepCar(free,{},DT,{walls:false});assert.ok(free.v>1);assert.equal(free.hits,0);
});
test('the corner has continuous positions and headings at entry and exit',()=>{for(const t of [0,40*Math.PI/2]){const a=cornerPoint(t-.001),b=cornerPoint(t+.001);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.003);assert.ok(Math.abs(a.heading-b.heading)<.001);const n=nearestCorner(b.x,b.z);assert.ok(n.distance<.001);}});
test('fixed integration yields identical paths at 30, 60 and 120 display frames',()=>{
 const results=[];for(const fps of [30,60,120]){const s=createCar(60);let acc=0;for(let i=0;i<fps*2;i++){acc+=1/fps;while(acc>=DT-1e-10){stepCar(s,{steer:.18,throttle:.3},DT,{walls:false});acc-=DT;}}results.push(s);}
 for(const s of results.slice(1))for(const key of ['x','z','u','v','heading'])assert.ok(Math.abs(s[key]-results[0][key])<1e-8);
});
test('button steering ramps up, can be trimmed, and unwinds after release',()=>{const c=createControls();pressControl(c,1,'left');for(let i=0;i<24;i++)readControls(c,DT);assert.ok(c.value>.2&&c.value<.5);releaseControl(c,1);for(let i=0;i<60;i++)readControls(c,DT);assert.equal(c.value,0);});
test('thumb position holds an intermediate angle and ignores a second steering finger',()=>{const c=createControls('slide');assert.ok(pressControl(c,1,'slide',.32));assert.equal(pressControl(c,2,'slide',-1),false);for(let i=0;i<120;i++)readControls(c,DT);assert.equal(c.value,.32);moveSlide(c,2,-1);assert.equal(c.target,.32);moveSlide(c,1,.38);for(let i=0;i<30;i++)readControls(c,DT);assert.equal(c.value,.38);releaseControl(c,1);for(let i=0;i<120;i++)readControls(c,DT);assert.equal(c.value,0);});
test('steering and pedals work together; cancelling one finger keeps the other',()=>{const c=createControls('slide');pressControl(c,1,'slide',.3);pressControl(c,2,'gas');assert.equal(readControls(c,.1).throttle,1);releaseControl(c,2);assert.equal(readControls(c,.1).throttle,0);assert.equal(c.target,.3);assert.equal(c.sliderId,1);clearControls(c);const r=readControls(c,.1);assert.equal(r.steer,0);assert.equal(r.throttle,0);assert.equal(c.sliderId,null);});
test('switching control modes clears keys and touches and maps slider edges correctly',()=>{const c=createControls();pressControl(c,1,'gas');c.keys.add('ArrowLeft');setControlMode(c,'slide');assert.equal(c.held.size,0);assert.equal(c.keys.size,0);assert.equal(c.value,0);assert.equal(slideValue(10,10,100),1);assert.equal(slideValue(60,10,100),0);assert.equal(slideValue(110,10,100),-1);assert.equal(slideValue(-100,10,100),1);});

test('braking and steering together turn toward the input on both sides at every start speed',()=>{
 for(const speed of [10,40,60,100])for(const brake of [.3,1])for(const amount of [.25,1]){
  const left=advance(createCar(speed),1,{steer:amount,brake}),right=advance(createCar(speed),1,{steer:-amount,brake});
  const context=JSON.stringify({speed,brake,amount});
  assert.ok(left.heading>0&&left.x>0,'left turns left '+context);
  assert.ok(right.heading<0&&right.x<0,'right turns right '+context);
  assert.ok(Math.abs(left.heading+right.heading)<1e-10,'mirrored yaw '+context);
  assert.ok(Math.abs(left.x+right.x)<1e-10,'mirrored path '+context);
  assert.ok(left.u<speed/3.6&&right.u<speed/3.6,'still decelerates '+context);
 }
});
test('braking into a turn and holding steering through a stop preserve the intended direction',()=>{
 for(const sign of [-1,1]){
  const s=advance(createCar(60),.4,{steer:sign*.25});const start=s.heading;
  advance(s,.6,{steer:sign*.25,brake:1});assert.ok((s.heading-start)*sign>0);
  const slow=advance(createCar(5),3,{steer:sign,brake:1});
  assert.ok(slow.heading*sign>=0);assert.ok(slow.u>=0&&slow.u<.03);
  assert.ok(Math.abs(slow.v)<.01&&Math.abs(slow.yawRate)<.01);
 }
});
