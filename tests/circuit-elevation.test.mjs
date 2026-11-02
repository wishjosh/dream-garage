import {STAND,PARKING,parkingBays,spectatorReviewPose} from '../dist/studies/circuit-elevation/spectators.mjs';
import {FACILITY_BUILDINGS,facilityColliders} from '../dist/studies/circuit-elevation/facilities.mjs';
import {pitLayout,campusFacilities,layoutMeasurements} from '../dist/studies/circuit-elevation/layout.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCityCourse} from '../dist/studies/circuit-elevation/course.mjs';
import {RacePhysics} from '../dist/studies/circuit-elevation/physics.mjs';
import {terrainHeight,terrainGradient,ROAD_Y,inRunoff} from '../dist/studies/circuit-elevation/terrain.mjs';
import {predictMerge,nearestPit,HOLD_Z,HOLD_S,PIT_SPEED} from '../dist/studies/circuit-elevation/pit.mjs';
import {DATA} from '../dist/studies/circuit-elevation/data.mjs';
import {makeRacer,nearestTrack,trackFrame} from '../dist/race-core.mjs';
const rigs=JSON.parse(readFileSync(new URL('../dist/assets/vehicle-rigs.json',import.meta.url)));rigs.porsche=rigs.tavaculo;
function make(car='tavaculo',count=1,layout='spacious',facilities='before',spectators='before'){const t=createCityCourse(),r=Array.from({length:count},(_,i)=>makeRacer(t,{car:i%2?'porsche':car,id:i?'bot'+i:'player',s:i*50,lane:i%2?2.3:-2.3}));return new RacePhysics(t,r,rigs,{autoRecovery:true,layout,facilities,spectators});}
function run(p,seconds,input){for(let i=0;i<seconds*60;i++)p.step(1/60,typeof input==='function'?input():input,false);}
test('height field reproduces reviewed profile and analytic gradient',()=>{
 const t=createCityCourse();let max=0,maxGrade=0,error=0;
 for(const f of t.frames){const h=terrainHeight(f.x,f.z),g=terrainGradient(f.x,f.z);max=Math.max(max,h);maxGrade=Math.max(maxGrade,Math.abs(g.x*f.tx+g.z*f.tz)*100);error=Math.max(error,Math.abs((terrainHeight(f.x+.01,f.z)-terrainHeight(f.x-.01,f.z))/.02-g.x));}
 assert.ok(max>7.99&&max<=8);assert.ok(Math.abs(maxGrade-DATA.campus.checks.maxGrade)<.01||Math.abs(maxGrade-2.446718)<.01);assert.ok(error<1e-8);
});
for(const car of ['tavaculo','porsche'])test(car+' completes elevated lap with contact and no teleport',ctx=>{
 const p=make(car),e=p.entries[0];let ticks=0,maxLateral=0,minY=Infinity,maxY=0;
 for(;ticks<160*60&&e.r.distance<p.track.length;ticks++){p.step(1/60,{...p.route(e),wheelCommand:true},false);maxLateral=Math.max(maxLateral,nearestTrack(p.track,e.r.x,e.r.z).distance);minY=Math.min(minY,e.r.y);maxY=Math.max(maxY,e.r.y);assert.ok(Number.isFinite(e.r.y));assert.equal(e.r.grounded,4);}
 ctx.diagnostic(JSON.stringify({car,time:ticks/60,maxLateral,minY,maxY,...p.metrics}));
 assert.ok(e.r.distance>=p.track.length);assert.ok(maxLateral<8.2);assert.ok(maxY-minY>7.9);assert.equal(p.recoveryStats().count,0);assert.ok(p.metrics.maxWheelError<.001);p.dispose();
});
test('gravity affects forward speed on the same grade in opposite directions',()=>{
 const coast=heading=>{const p=make(),e=p.entries[0];Object.assign(e.s,{x:-325,z:0,heading,u:15,v:0});p.sync(e,false);run(p,1,{});const speed=e.s.u;p.dispose();return speed;};
 assert.ok(coast(-Math.PI/2)<coast(Math.PI/2)-.3);
});
test('recovery space permits manual driving back without forced teleport',ctx=>{
 const p=make();p.setupScenario('runoff');const e=p.entries[0];assert.equal(e.r.surface,'runoff');const initial=nearestTrack(p.track,e.s.x,e.s.z).distance;
 run(p,12,()=>({...p.route(e),wheelCommand:true}));const end=nearestTrack(p.track,e.s.x,e.s.z).distance;
 ctx.diagnostic(JSON.stringify({initial,end,recovery:p.recoveryStats().count}));assert.ok(end<8.2);assert.equal(p.recoveryStats().count,0);p.dispose();
});
test('out-of-campus recovery waits and refuses occupied return positions',()=>{
 const p=make('tavaculo',6),e=p.entries[0],f=trackFrame(p.track,0);Object.assign(e.s,{x:600,z:1000,u:0,v:0});p.sync(e,false);
 const lanes=[0,-3.2,3.2,-5.4,5.4];p.entries.slice(1).forEach((o,i)=>Object.assign(o.s,{x:f.x+f.rx*lanes[i],z:f.z+f.rz*lanes[i]}));
 assert.equal(p.recover(e.r,{atS:0}),false);p.entries.slice(1).forEach(o=>{o.s.x+=500;});assert.equal(p.recover(e.r,{atS:0}),true);assert.equal(e.r.grounded,4);p.dispose();
});
test('merge predictor rejects conflict and unavailable or off-route data',()=>{
 const t=createCityCourse(),f=trackFrame(t,-110),r={id:'test',x:f.x,z:f.z,forwardSpeed:20};
 assert.equal(predictMerge(t,null).clear,false);assert.equal(predictMerge(t,[{...r,forwardSpeed:NaN}]).clear,false);assert.equal(predictMerge(t,[{...r,x:10000}]).clear,false);
 assert.equal(predictMerge(t,[r]).clear,false);assert.equal(predictMerge(t,[]).clear,true);
});
for(const traffic of ['pack','clear'])test('pit '+traffic+' obeys cap, stops at gate then joins without contact',ctx=>{
 const p=make('tavaculo',4);p.setupScenario('pit',traffic);const e=p.entries[0];let maxPit=0,stopped=false,released=false,wait=0,hits=0,minGap=Infinity;
 for(let i=0;i<45*60&&!e.pit.merged;i++){
  p.step(1/60,{...p.route(e),wheelCommand:true},false);
  if(e.pit.active)maxPit=Math.max(maxPit,e.r.speed);
  if(!e.pit.released&&Math.abs(e.s.z-HOLD_Z)<.5&&e.r.speed<.8)stopped=true;
  released||=e.pit.released;hits+=p.hits.filter(h=>h.id===e.r.id&&h.kind==='car').length;
  if(e.pit.released)for(const o of p.entries.slice(1))minGap=Math.min(minGap,Math.hypot(e.s.x-o.s.x,e.s.z-o.s.z));
 }
 wait=e.pit.wait;ctx.diagnostic(JSON.stringify({traffic,maxPit,stopped,released,merged:e.pit.merged,wait,hits,minGap,z:e.s.z,x:e.s.x,merge:p.merge}));
 assert.ok(maxPit<=PIT_SPEED+.01);assert.ok(stopped);assert.ok(released&&e.pit.merged);assert.equal(hits,0);if(traffic==='pack')assert.ok(wait>1);else assert.ok(wait<.6);p.dispose();
});
test('study cannot read/write main storage or award main-game money',()=>{
 const game=readFileSync(new URL('../dist/studies/circuit-elevation/game.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(game,/localStorage|sessionStorage|SAVE_KEY|readSnapshot|installSaveTransfer|save\.coins\s*\+=/);assert.match(game,/function persist\(\)\{\}/);assert.match(game,/auto:false/);
 const scene=readFileSync(new URL('../dist/studies/circuit-elevation/scene.mjs',import.meta.url),'utf8');assert.match(scene,/DATA.corners/);
});

test('airborne suspension loses contact then settles back onto terrain',()=>{
 const p=make(),e=p.entries[0];e.ground.y+=.7;run(p,.05,{throttle:1});assert.equal(e.r.grounded,0);run(p,2,{});assert.equal(e.r.grounded,4);assert.ok(Math.abs(e.r.y-(terrainHeight(e.r.x,e.r.z)+ROAD_Y))<.06);p.dispose();
});
test('unpredictable traffic holds a pit car at the line while throttle is held',()=>{
 const p=make('tavaculo',2);p.setupScenario('pit','clear');const o=p.entries[1];Object.assign(o.s,{x:2000,z:2000,u:0,v:0});p.sync(o,false);const e=p.entries[0];run(p,12,()=>({...p.route(e),wheelCommand:true}));assert.equal(e.pit.released,false);assert.ok(e.s.z<=HOLD_Z+.001);assert.equal(e.s.u,0);assert.equal(p.merge.clear,false);assert.equal(e.r.grounded,4);p.dispose();
});
test('four mixed cars complete the elevated route without road departure',ctx=>{
 const p=make('tavaculo',4),e=p.entries[0];let ticks=0,maxLateral=0;
 for(;ticks<155*60&&p.racers.some(r=>r.distance<p.track.length);ticks++){p.step(1/60,{...p.route(e),wheelCommand:true},false);for(const r of p.racers){maxLateral=Math.max(maxLateral,nearestTrack(p.track,r.x,r.z).distance);assert.equal(r.grounded,4);}}
 ctx.diagnostic(JSON.stringify({seconds:ticks/60,maxLateral,cars:p.racers.map(r=>({car:r.car,distance:r.distance,y:r.y})),recovery:p.recoveryStats().count}));assert.ok(p.racers.every(r=>r.distance>=p.track.length));assert.ok(maxLateral<8.2);assert.equal(p.recoveryStats().count,0);p.dispose();
});

test('parallel pit separator prevents an early sideways exit onto main road',()=>{
 const p=make();p.setupScenario('pit');const e=p.entries[0];Object.assign(e.s,{x:20,z:HOLD_Z-20,heading:-Math.PI/2,u:5,v:0});p.sync(e,false);let hit=false;for(let i=0;i<120;i++){p.step(1/60,{},false);hit||=p.hits.some(h=>h.kind==='barrier');}assert.ok(e.s.x>16);assert.ok(hit);p.dispose();
});

test('pitlane art comparison starts beside bays and obeys existing pit exit',()=>{
 const p=make('tavaculo',4);p.setupScenario('pitlane');const e=p.entries[0];assert.equal(e.pit.active,true);assert.ok(Math.abs(e.s.z-(HOLD_Z-110))<.01);assert.equal(e.r.surface,'pit');
 let maxPit=0;for(let i=0;i<50*60&&!e.pit.merged;i++){p.step(1/60,{...p.route(e),wheelCommand:true},false);if(e.pit.active)maxPit=Math.max(maxPit,e.r.speed);}
 assert.equal(e.pit.merged,true);assert.ok(maxPit<50/3.6+.05);assert.ok(p.metrics.gateWait>=.5);assert.equal(p.recoveryStats().count,0);p.dispose();
});

for(const car of ['tavaculo','porsche'])for(const traffic of ['pack','clear'])test('compact pit '+car+' '+traffic+' keeps stop, cap and contact-free merge',ctx=>{
 const p=make(car,4,'compact');p.setupScenario('pitlane',traffic);const e=p.entries[0];assert.equal(e.s.x,20);assert.equal(e.r.surface,'pit');
 let maxPit=0,hits=0,stopped=false;for(let i=0;i<55*60&&!e.pit.merged;i++){
  p.step(1/60,{...p.route(e),wheelCommand:true},false);if(e.pit.active)maxPit=Math.max(maxPit,e.r.speed);
  if(!e.pit.released&&Math.abs(e.s.z-HOLD_Z)<.6&&e.r.speed<.8)stopped=true;
  hits+=p.hits.filter(h=>h.id===e.r.id).length;assert.equal(e.r.grounded,4);
 }
 ctx.diagnostic(JSON.stringify({car,traffic,maxPit,hits,stopped,merged:e.pit.merged,wait:p.metrics.gateWait,minGap:p.metrics.minMergeGap}));
 assert.equal(e.pit.merged,true);assert.equal(stopped,true);assert.ok(maxPit<50/3.6+.05);assert.ok(p.metrics.gateWait>=.5);assert.equal(hits,0);assert.equal(p.recoveryStats().count,0);p.dispose();
});
test('compact geometry and collision footprints agree without changing course or rigs',()=>{
 const p=make('tavaculo',1,'compact'),m=layoutMeasurements(p.layout),pit=campusFacilities(p.layout).find(f=>f.id==='pit');
 assert.ok(Math.abs(m.trackPitGap-5.8)<1e-9);assert.equal(m.apron,6);assert.equal(m.buildingLength,80);assert.equal(m.buildingDepth,18);assert.equal(m.doorWidth,6);
 const building=p.world.bodies.find(b=>Math.abs(b.position.x-41)<.001&&b.shapes[0]?.halfExtents?.z===40);assert.ok(building);assert.equal(building.shapes[0].halfExtents.x,9);assert.equal(-pit.box[3],32);
 const barrier=p.world.bodies.find(b=>b.position.x===11&&b.shapes[0]?.halfExtents?.z===90);assert.ok(barrier);
 assert.equal(p.track.length,createCityCourse().length);assert.deepEqual(p.entries[0].rig,rigs.tavaculo);
 const old=make();assert.equal(old.layout.centerX,38);assert.equal(layoutMeasurements(old.layout).apron,14);p.dispose();old.dispose();
});


test('split facilities replace the old full-zone collision blocks and preserve other facilities',()=>{
 const old=make('tavaculo',1,'compact','before'),p=make('tavaculo',1,'compact','split');
 const ids=p.world.bodies.filter(b=>b.facilityId).map(b=>b.facilityId);
 assert.ok(!ids.includes('paddock')&&!ids.includes('medical'));assert.ok(ids.includes('pit')&&ids.includes('stand'));
 for(const f of FACILITY_BUILDINGS){const b=p.world.bodies.find(b=>b.facilityId===f.id),[a,y0,c,y1]=f.box;assert.ok(b);assert.equal(b.shapes[0].halfExtents.x,(y1-y0)/2);assert.equal(b.shapes[0].halfExtents.z,(c-a)/2);assert.equal(b.shapes[0].halfExtents.y,f.height/2);assert.ok(f.box[0]>=250);}
 assert.equal(old.world.bodies.filter(b=>['paddock','medical'].includes(b.facilityId)).length,2);
 assert.deepEqual(p.entries[0].rig,old.entries[0].rig);assert.equal(p.track.length,old.track.length);old.dispose();p.dispose();
});
for(const zone of [{name:'paddock',x:158,along:350},{name:'medical',x:130,along:745},{name:'medical access',x:180,along:660}])test('split '+zone.name+' open yard permits a car to wait without hidden collisions or recovery',()=>{
 const p=make('tavaculo',1,'compact','split'),e=p.entries[0];Object.assign(e.s,{x:zone.x,z:zone.along-DATA.campus.start[0],heading:0,u:0,v:0});p.placeBody(e);p.sync(e,false);let hits=0;
 for(let i=0;i<8*60;i++){p.step(1/60,{brake:1},false);hits+=p.hits.length;}
 assert.equal(p.recoveryStats().count,0);assert.equal(hits,0);assert.equal(e.r.surface,'apron');assert.equal(e.r.grounded,4);assert.ok(Math.abs(e.s.x-zone.x)<.1);p.dispose();
});
test('split workshop has a physical front wall at the rendered footprint',()=>{
 const p=make('tavaculo',1,'compact','split'),e=p.entries[0];Object.assign(e.s,{x:118,z:310-DATA.campus.start[0],heading:Math.PI/2,u:7,v:0});p.placeBody(e);p.sync(e,false);let hit=false;
 for(let i=0;i<180;i++){p.step(1/60,{throttle:1},false);hit ||= p.hits.some(h=>h.kind==='barrier');}
 assert.ok(hit);assert.ok(e.s.x<126);assert.equal(p.recoveryStats().count,0);p.dispose();
});


test('scaled spectator layout preserves adopted pit and work buildings while replacing the stand footprint',()=>{
 const old=make('tavaculo',1,'compact','split','before'),p=make('tavaculo',1,'compact','split','scaled');
 const oldBodies=old.world.bodies.filter(b=>b.facilityId&&b.facilityId!=='stand'),bodies=p.world.bodies.filter(b=>b.facilityId&&b.facilityId!=='stand');
 assert.deepEqual(bodies.map(b=>[b.facilityId,b.position.toArray(),b.shapes[0].halfExtents.toArray()]),oldBodies.map(b=>[b.facilityId,b.position.toArray(),b.shapes[0].halfExtents.toArray()]));
 const stand=p.world.bodies.find(b=>b.facilityId==='stand');assert.equal(stand.shapes[0].halfExtents.x,10);assert.equal(stand.shapes[0].halfExtents.z,42);assert.deepEqual(p.entries[0].rig,old.entries[0].rig);old.dispose();p.dispose();
});
test('scaled parking bays fit both measured models and leave three 7 metre aisles clear',()=>{
 const bays=parkingBays();assert.equal(bays.length,144);
 for(const bay of bays){assert.ok(bay.width>2.254&&bay.depth>4.535);for(const [lo,hi] of PARKING.aisles)assert.ok(bay.x+bay.depth/2<=lo+.001||bay.x-bay.depth/2>=hi-.001);assert.ok(bay.along-bay.width/2>=PARKING.box[0]&&bay.along+bay.width/2<=PARKING.box[2]);}
 const pose=spectatorReviewPose('parking',true);assert.ok(bays.some(b=>Math.abs(b.x-pose.car.x)<.001&&Math.abs(b.along-pose.car.along)<.001));
});
for(const pos of [{name:'parking bay',x:150.25,along:21.75},{name:'parking aisle',x:163,along:24},{name:'visitor access',x:195,along:-32},{name:'visitor entry',x:212,along:-40}])test('scaled '+pos.name+' has no hidden wall or automatic return',()=>{
 const p=make('tavaculo',1,'compact','split','scaled'),e=p.entries[0];Object.assign(e.s,{x:pos.x,z:pos.along-DATA.campus.start[0],heading:Math.PI/2,u:0,v:0});p.placeBody(e);p.sync(e,false);let hits=0;
 for(let i=0;i<8*60;i++){p.step(1/60,{brake:1},false);hits+=p.hits.length;}
 assert.equal(hits,0);assert.equal(p.recoveryStats().count,0);assert.equal(e.r.surface,'apron');assert.equal(e.r.grounded,4);p.dispose();
});
test('scaled stand stops a vehicle at the new front edge',()=>{
 const p=make('tavaculo',1,'compact','split','scaled'),e=p.entries[0];Object.assign(e.s,{x:73,z:40-DATA.campus.start[0],heading:Math.PI/2,u:7,v:0});p.placeBody(e);p.sync(e,false);let hit=false;
 for(let i=0;i<180;i++){p.step(1/60,{throttle:1},false);hit ||= p.hits.some(h=>h.kind==='barrier');}
 assert.ok(hit);assert.ok(e.s.x<80);p.dispose();
});

test('corner comparison restarts both cars at the identical stationary approach',()=>{
 const states=[];
 for(const car of ['tavaculo','porsche']){
  const p=make(car,4,'compact','split','scaled'),r=p.entries[0].r;
  p.setupScenario('corner','clear');
  const initial=[r.x,r.z,r.heading,r.s,r.distance];
  assert.ok(Math.abs(r.s-(DATA.corners[0].s-240))<1e-6);assert.equal(r.pit.active,false);assert.equal(r.grounded,4);
  run(p,1,{throttle:true});assert.ok(r.speed>0);
  p.setupScenario('corner','clear');assert.deepEqual([r.x,r.z,r.heading,r.s,r.distance],initial);assert.equal(r.speed,0);
  states.push(initial);p.dispose();
 }
 assert.deepEqual(states[0],states[1]);
});
