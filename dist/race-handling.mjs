import {assistedSteer,stabilize} from './driver-feel.mjs?v=city-feel-1';
import {createBodyMotion,stepBodyMotion} from './body-motion.mjs?v=city-feel-1';
// Flat city adapter. Tyres/integration are shared with the measured study.
// Cannon solves wall/car impulses only; it does not add a second tyre model.
import * as C from './vendor/cannon-es.js';
import {CAR,DT,createCar,stepCar} from './handling-physics.mjs?v=city-config-1';
import {clamp,angleDelta,trackFrame,nearestTrack,recordProgress} from './race-core.mjs';
import {wheelVisualPose} from './vehicle-physics.mjs?v=wheels-1';
export const FIXED_DT=DT;
export const VEHICLES=Object.freeze({
 tavaculo:CAR,
 // Game configuration, not measured F2002 telemetry or aerodynamic simulation.
 f2002:Object.freeze({...CAR,mass:650,a:1.95,b:1.60,height:.28,inertia:1550,frontMu:1.16,rearMu:1.32,frontStiffness:47000,rearStiffness:80000,engine:6000,brake:7400,maxSpeed:53})
});
export function vehicleConfig(car,tuning={}){
 const c={...(VEHICLES[car]||CAR)};
 c.engine*=tuning.force||1;c.maxSpeed*=tuning.maxSpeed||1;
 c.frontMu*=tuning.grip||1;c.rearMu*=tuning.grip||1;c.brake*=tuning.brake||1;
 return c;
}
const UP=new C.Vec3(0,1,0);
export class RacePhysics{
 constructor(track,racers,rigs,{barriers=true,playerTuning=null}={}){
  Object.assign(this,{track,racers,rigs,accumulator:0,time:0,entries:[],hits:[],presentationEnabled:true});
  this.world=new C.World({gravity:new C.Vec3(0,0,0),allowSleep:false});
  this.world.broadphase=new C.SAPBroadphase(this.world);this.world.solver.iterations=12;
  this.world.defaultContactMaterial.friction=.12;this.world.defaultContactMaterial.restitution=.08;
  if(barriers)this.addBarriers();
  racers.forEach((r,index)=>{
   const config=vehicleConfig(r.car,index===0?playerTuning||{}:{}),rig=rigs[r.car];
   const body=new C.Body({mass:config.mass,linearDamping:0,angularDamping:0});
   body.addShape(new C.Box(new C.Vec3(r.car==='f2002'?.88:.98,.26,r.car==='f2002'?2.37:2.14)));
   body.linearFactor.set(1,0,1);body.angularFactor.set(0,1,0);
   body.invInertia.set(0,1/config.inertia,0);body.updateInertiaWorld(true);
   body.raceKind='car';body.racerId=r.id;this.world.addBody(body);
   const s=Object.assign(createCar(0),{x:r.x,z:r.z,heading:r.heading});
   const e={r,index,config,rig,body,s,inputSteer:0,driftLevel:0,motion:createBodyMotion(),collisionAt:-10};this.entries.push(e);
   this.placeBody(e);this.sync(e,false);
  });
 }
 addBarriers(){
  const count=Math.floor(this.track.length/5),segment=this.track.length/count;
  for(let i=0;i<count;i++){
   const f=trackFrame(this.track,i/count*this.track.length),yaw=Math.atan2(f.tx,f.tz);
   for(const side of [-1,1]){
    const b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(.23,.6,segment/2+.12))});
    b.position.set(f.x+f.rx*side*8.8,.64,f.z+f.rz*side*8.8);b.quaternion.setFromEuler(0,yaw,0);b.updateAABB();b.raceKind='barrier';this.world.addBody(b);
   }
  }
 }
 route(e){
  const s=e.s,n=nearestTrack(this.track,s.x,s.z),speed=Math.abs(s.u),look=9+speed*.55;
  const target=trackFrame(this.track,n.s+look),lane=e.index?e.r.lane*.65:0;
  const desired=Math.atan2(target.x+target.rx*lane-s.x,target.z+target.rz*lane-s.z);
  const steer=Math.atan(2*(e.config.a+e.config.b)*Math.sin(angleDelta(desired,s.heading))/look)/e.config.maxSteer;
  let curvature=.004;
  for(const d of [0,12,24,36]){
   const a=trackFrame(this.track,n.s+d),b=trackFrame(this.track,n.s+d+12);
   curvature=Math.max(curvature,Math.abs(angleDelta(Math.atan2(b.tx,b.tz),Math.atan2(a.tx,a.tz)))/12);
  }
  const targetSpeed=Math.min(e.index?26-e.index:29,Math.sqrt(5.0/curvature));
  return{steer:clamp(steer,-1,1),throttle:clamp((targetSpeed-s.u)*.7,0,1),brake:clamp((s.u-targetSpeed)*.27,0,.8)};
 }
 drive(e,input,assist){
  const s=e.s,turn=(input.left?1:0)-(input.right?1:0);
  let steer=Number.isFinite(input.steer)?clamp(input.steer,-1,1):turn;
  if(!Number.isFinite(input.steer)){
   e.inputSteer+=clamp(steer-e.inputSteer,-(turn?(input.drift?3.1:1.55):2.4)*DT,(turn?(input.drift?3.1:1.55):2.4)*DT);steer=e.inputSteer;
  }else e.inputSteer=steer;
  let brake=Number(input.brake)||0,throttle=Number(input.throttle||input.drift||input.reverse)||0;
  const drifting=!!input.drift&&!brake&&!input.reverse&&Math.abs(s.u)>6.5&&Math.abs(steer)>.1;
  e.driftLevel+=(Number(drifting)-e.driftLevel)*(1-Math.exp(-DT*(drifting?8:7)));
  const rawSteer=steer;
  if(assist&&!input.wheelCommand)steer=assistedSteer(steer,s.u,e.config.a+e.config.b,e.config.maxSteer,drifting);
  const vehicle=e.driftLevel>1e-6?{...e.config,rearMu:e.config.rearMu*(1-.48*e.driftLevel)}:e.config;
  stepCar(s,{steer,throttle,brake,reverse:input.reverse},DT,{walls:false,vehicle});
  if(assist&&!input.wheelCommand)stabilize(s,{neutral:Math.abs(rawSteer)<.025,brake:brake>0,reverse:input.reverse,driftLevel:e.driftLevel},DT);
  stepBodyMotion(e.motion,{ax:s.ax,ay:s.ay,speed:Math.hypot(s.u,s.v)},e.r.car,DT);
  e.r.rawSteer=rawSteer;e.r.commandedSteer=steer;e.r.stabilityAssist=!!assist;
  e.r.drifting=drifting;e.r.driftLevel=e.driftLevel;
  e.r.reverseBlocked=s.reverseBlocked;e.r.driveMode=s.reverse?'reverse':brake||s.reverseBlocked?'brake':throttle?'forward':'coast';e.r.braking=brake>0;
 }
 placeBody(e,rewind=0){
  const{s,body:b}=e,sh=Math.sin(s.heading),ch=Math.cos(s.heading);
  const vx=s.u*sh+s.v*ch,vz=s.u*ch-s.v*sh;
  // Free travel was integrated by stepCar. Rewind the collision-only solver's
  // translation so its one time step lands on that exact predicted position.
  b.position.set(s.x-vx*rewind,.60,s.z-vz*rewind);
  b.quaternion.setFromAxisAngle(UP,s.heading-s.yawRate*rewind);
  b.velocity.set(vx,0,vz);b.angularVelocity.set(0,s.yawRate,0);
  b.force.set(0,0,0);b.torque.set(0,0,0);b.aabbNeedsUpdate=true;b.updateInertiaWorld(true);
 }
 collisions(){
  this.entries.forEach(e=>this.placeBody(e,DT));this.world.step(DT);
  for(const e of this.entries){
   const contacts=this.world.contacts.filter(c=>c.bi===e.body||c.bj===e.body);
   if(!contacts.length)continue;
   const{s,body:b}=e,oldV=Math.hypot(b.velocity.x-(s.u*Math.sin(s.heading)+s.v*Math.cos(s.heading)),b.velocity.z-(s.u*Math.cos(s.heading)-s.v*Math.sin(s.heading)));
   s.x=b.position.x;s.z=b.position.z;
   // Collision torque changes subsequent yaw; keep the exact tyre-integrated
   // heading this step instead of introducing a second quaternion integrator.
   s.u=b.velocity.x*Math.sin(s.heading)+b.velocity.z*Math.cos(s.heading);
   s.v=b.velocity.x*Math.cos(s.heading)-b.velocity.z*Math.sin(s.heading);s.yawRate=b.angularVelocity.y;
   // Sustained wall rubbing loses speed, without a score/coin penalty.
   if(contacts.some(c=>(c.bi===b?c.bj:c.bi).raceKind==='barrier')){const loss=Math.exp(-DT*.9);s.u*=loss;s.v*=loss;}
   if(oldV>1.2&&this.time-e.collisionAt>.6){
    e.collisionAt=this.time;
    const other=contacts[0].bi===b?contacts[0].bj:contacts[0].bi;
    this.hits.push({id:e.r.id,kind:other.raceKind,impact:oldV});
   }
  }
 }
 sync(e,progress=true){
  const{s,r,rig}=e,sh=Math.sin(s.heading),ch=Math.cos(s.heading),q=new C.Quaternion();q.setFromAxisAngle(UP,s.heading);
  const bodyQ=q.clone(),tilt=new C.Quaternion();
  if(this.presentationEnabled){tilt.setFromEuler(e.motion.pitch,0,e.motion.roll,'XYZ');bodyQ.mult(tilt,bodyQ);}
  Object.assign(r,{x:s.x,z:s.z,y:.045,heading:s.heading,speed:Math.hypot(s.u,s.v),forwardSpeed:s.u,lateralSpeed:s.v,steer:s.steer/e.config.maxSteer,steeringAngle:s.steer,
   velocity:[s.u*sh+s.v*ch,0,s.u*ch-s.v*sh],quaternion:[bodyQ.x,bodyQ.y,bodyQ.z,bodyQ.w],motion:{...e.motion,enabled:this.presentationEnabled},grounded:4,sliding:s.handling!=='grip',handling:s.handling,beta:s.beta,frontSlip:s.frontSlip,rearSlip:s.rearSlip,wheelSpin:-s.wheelAngle*.33/rig.radius});
  // All four wheels touch the flat city plane. This is geometry, not suspension.
  r.wheels=rig.wheels.map(w=>{const p=w.position,rotation=r.wheelSpin,steering=w.front?s.steer:0,pose=wheelVisualPose(q,steering,rotation);
   return{position:[s.x+p[0]*ch+p[2]*sh,p[1]+.045,s.z-p[0]*sh+p[2]*ch],...pose,quaternion:pose.visualQuaternion,rotation,suspension:0,contact:true};});
  if(progress&&!r.finished)recordProgress(r,this.track,nearestTrack(this.track,r.x,r.z).s);
 }
 step(dt,input={},assist=true){
  this.accumulator+=clamp(dt,0,.1);this.hits=[];let steps=0;
  while(this.accumulator+1e-10>=DT&&steps<12){
   for(const e of this.entries)this.drive(e,e.index?(e.r.finished?{brake:1}:this.route(e)):input,e.index?false:assist);
   this.collisions();this.time+=DT;this.entries.forEach(e=>this.sync(e));this.accumulator-=DT;steps++;
  }
  return{steps,hits:this.hits};
 }
 recover(r){
  const e=this.entries.find(e=>e.r===r);if(!e)return;
  const f=nearestTrack(this.track,r.x,r.z);
  const lane=[0,-3.2,3.2,-5.4,5.4].find(l=>this.entries.every(other=>other===e||Math.hypot(other.s.x-(f.x+f.rx*l),other.s.z-(f.z+f.rz*l))>5.8));
  if(lane===undefined)return false;
  e.s=Object.assign(createCar(0),{x:f.x+f.rx*lane,z:f.z+f.rz*lane,heading:Math.atan2(f.tx,f.tz)});
  e.inputSteer=0;e.driftLevel=0;e.motion=createBodyMotion();Object.assign(r,{s:f.s,drifting:false,driftLevel:0,reverseBlocked:false,driveMode:'coast',braking:false});
  this.placeBody(e);this.sync(e,false);return true;
 }
 advice(r){
  const e=this.entries.find(e=>e.r===r);if(!e||e.s.u<4)return null;
  const n=nearestTrack(this.track,r.x,r.z),speed=e.s.u;
  if(Math.abs(angleDelta(r.heading,Math.atan2(n.tx,n.tz)))>Math.PI/2)return '반대 방향 · 도로 복귀';
  for(let d=8;d<=96;d+=8){
   const a=trackFrame(this.track,n.s+d),b=trackFrame(this.track,n.s+d+12);
   const k=Math.abs(angleDelta(Math.atan2(b.tx,b.tz),Math.atan2(a.tx,a.tz)))/12;
   const target=Math.sqrt(5.4*e.config.frontMu/Math.max(.001,k));
   const decel=clamp(e.config.brake/e.config.mass*.60,4,9);
   const distance=(speed*speed-target*target)/(2*decel)+speed*.65+6;
   if(speed>target+2&&d<distance)return '코너 앞 · 브레이크';
  }return null;
 }
 dispose(){for(const b of [...this.world.bodies])this.world.removeBody(b);}
}
