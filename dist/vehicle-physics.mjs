import * as C from './vendor/cannon-es.js';
import {clamp,angleDelta,trackFrame,nearestTrack,recordProgress} from './race-core.mjs';

export const FIXED_DT=1/60;
export const VEHICLES={
 tavaculo:{mass:1320,rideHeight:.57,spring:42,rest:.23,travel:.13,grip:2.7,force:5900,maxSpeed:38,brake:95,halfWidth:.98,halfLength:2.14,halfHeight:.22},
 f2002:{mass:650,rideHeight:.55,spring:65,rest:.17,travel:.09,grip:3.4,force:3600,maxSpeed:44,brake:52,halfWidth:.88,halfLength:2.37,halfHeight:.19}
};
const UP=new C.Vec3(0,1,0),FORWARD=new C.Vec3(0,0,1),SIDE=new C.Vec3(1,0,0);
const vec=new C.Vec3(),local=new C.Vec3(),up=new C.Vec3(),forward=new C.Vec3();
export function wheelVisualPose(bodyQuaternion,steering,rotation){
 const spindle=new C.Quaternion(),steer=new C.Quaternion(),spin=new C.Quaternion(),visual=new C.Quaternion();
 steer.setFromAxisAngle(UP,steering);bodyQuaternion.mult(steer,spindle);
 // cannon-es uses a negative rotation for forward with Y up. Our model axle is +X.
 spin.setFromAxisAngle(SIDE,-rotation);spindle.mult(spin,visual);
 const array=q=>[q.x,q.y,q.z,q.w];return {steeringQuaternion:array(spindle),visualQuaternion:array(visual)};
}
export class RacePhysics{
 constructor(track,racers,rigs,{barriers=true,playerTuning=null}={}){
  this.track=track;this.racers=racers;this.rigs=rigs;this.accumulator=0;this.entries=[];this.hits=[];this.time=0;
  this.world=new C.World({gravity:new C.Vec3(0,-9.81,0),allowSleep:false});
  this.world.broadphase=new C.SAPBroadphase(this.world);this.world.solver.iterations=8;this.world.defaultContactMaterial.friction=.15;this.world.defaultContactMaterial.restitution=.14;
  const floor=new C.Body({mass:0,shape:new C.Plane()});floor.quaternion.setFromEuler(-Math.PI/2,0,0);floor.position.y=.045;floor.updateAABB();floor.raceKind='road';this.world.addBody(floor);
  if(barriers)this.addBarriers();
  racers.forEach((r,i)=>this.addCar(r,i,i===0?playerTuning:null));
  // Let suspension reach its static ride height before the countdown.
  for(let i=0;i<90;i++){this.entries.forEach(e=>this.drive(e,{brake:true},false));this.world.step(FIXED_DT);}
  this.entries.forEach(e=>{e.body.velocity.set(0,0,0);e.body.angularVelocity.set(0,0,0);this.sync(e,false);e.r.s=nearestTrack(track,e.r.x,e.r.z).s;});this.hits=[];
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
 addCar(r,index,tuning=null){
  const config={...VEHICLES[r.car]};if(tuning)for(const key of ['force','maxSpeed','grip','brake'])config[key]*=tuning[key]||1;
  const rig=this.rigs[r.car],b=new C.Body({mass:config.mass,linearDamping:.012,angularDamping:.3});
  b.addShape(new C.Box(new C.Vec3(config.halfWidth,config.halfHeight,config.halfLength)));
  b.position.set(r.x,config.rideHeight+.045,r.z);b.quaternion.setFromEuler(0,r.heading,0);b.raceKind='car';b.racerId=r.id;
  const car=new C.RaycastVehicle({chassisBody:b,indexRightAxis:0,indexUpAxis:1,indexForwardAxis:2});
  for(const wheel of rig.wheels){
   const p=wheel.position;
   car.addWheel({radius:rig.radius,directionLocal:new C.Vec3(0,-1,0),axleLocal:new C.Vec3(1,0,0),
    chassisConnectionPointLocal:new C.Vec3(p[0],p[1]-config.rideHeight+config.rest-9.81/(4*config.spring),p[2]),
    suspensionRestLength:config.rest,suspensionStiffness:config.spring,maxSuspensionTravel:config.travel,
    dampingRelaxation:3.4,dampingCompression:5.0,maxSuspensionForce:config.mass*9.81*.9,
    frictionSlip:config.grip,rollInfluence:.18,isFrontWheel:wheel.front,useCustomSlidingRotationalSpeed:false});
  }
  car.addToWorld(this.world);
  const e={r,index,config,rig,body:b,car,steering:0,collisionAt:-10,reverseDown:false,reverseAllowed:false,driftLevel:0};this.entries.push(e);
  b.addEventListener('collide',event=>{
   const impact=Math.abs(event.contact.getImpactVelocityAlongNormal());
   if(impact>1.6 && this.time-e.collisionAt>.65){this.hits.push({id:r.id,kind:event.body.raceKind,impact});e.collisionAt=this.time;}
  });
 }
 autopilot(e,lane=0){
  const r=e.r,n=nearestTrack(this.track,r.x,r.z),look=11+Math.max(0,r.speed)*.55,f=trackFrame(this.track,n.s+look);
  const wanted=Math.atan2(f.x+f.rx*lane-r.x,f.z+f.rz*lane-r.z),err=angleDelta(wanted,r.heading);
  const wheelbase=e.rig.wheels[0].position[2]-e.rig.wheels[2].position[2];
  return Math.atan(2*wheelbase*Math.sin(err)/look);
 }
 botInput(e){
  if(e.r.finished)return{brake:true,steer:0};
  const f=trackFrame(this.track,e.r.s),ahead=trackFrame(this.track,e.r.s+24);
  const curvature=Math.abs(angleDelta(Math.atan2(ahead.tx,ahead.tz),Math.atan2(f.tx,f.tz)))/24;
  const cornerSpeed=Math.sqrt(6.8/Math.max(.005,curvature));
  const target=Math.min([27,25.5,24][e.index-1]||25,cornerSpeed);
  return{throttle:clamp((target-e.r.forwardSpeed)*.42,0,1),brake:clamp((e.r.forwardSpeed-target-1.5)*.22,0,1),steer:this.autopilot(e,e.r.lane*.75)};
 }
 drive(e,input,assist){
  const {body:b,car,config,r}=e;
  b.vectorToLocalFrame(b.velocity,local);const speed=Math.max(0,local.z),turn=(input.left?1:0)-(input.right?1:0);
  const reverse=!!input.reverse;
  // A press made while moving only brakes. Release and press again at rest to reverse.
  if(reverse&&!e.reverseDown)e.reverseAllowed=Math.abs(local.z)<.45&&Math.abs(local.x)<.7;
  if(!reverse)e.reverseAllowed=false;
  e.reverseDown=reverse;
  let brake=clamp(Number(input.brake||0),0,1),gas=clamp(Number(input.throttle||input.drift||0),0,1),back=0;
  if(reverse){gas=0;if(!e.reverseAllowed||local.z>.5)brake=1;else back=brake?0:1;}
  else if(local.z<-.2){brake=Math.max(brake,.65);gas=0;}
  if(brake)gas=back=0;
  const driftWanted=!!input.drift&&!reverse&&!brake&&speed>=6.5&&!!turn&&r.grounded>=2;
  e.driftLevel+=(Number(driftWanted)-e.driftLevel)*(1-Math.exp(-FIXED_DT*(driftWanted?8:6)));
  const limit=.48/(1+speed*.05),steerLimit=limit*(1+e.driftLevel*.22);
  let steer=input.steer ?? turn*steerLimit;
  if(input.steer===undefined&&assist&&!turn&&!reverse&&local.z>=-.2&&e.driftLevel<.15)steer=this.autopilot(e,0);
  steer=clamp(steer,-steerLimit,steerLimit);e.steering+=(steer-e.steering)*(1-Math.exp(-FIXED_DT*7.5));
  car.setSteeringValue(e.steering,0);car.setSteeringValue(e.steering,1);
  const power=gas*config.force*clamp(1-(speed/config.maxSpeed)**4,0,1)*(1-e.driftLevel*.18);
  const reverseSpeed=4,reverseForce=back*config.force*.38*clamp(1-(Math.max(0,-local.z)/reverseSpeed)**2,0,1);
  for(let w=0;w<4;w++){
   car.wheelInfos[w].frictionSlip=config.grip*(w>=2?1-e.driftLevel*.68:1-e.driftLevel*.06);
   car.applyEngineForce(w>=2?-power+reverseForce:0,w);car.setBrake(config.brake*brake,w);
  }
  if(driftWanted){const yawTarget=turn*Math.min(.9,.35+speed*.018);b.torque.y+=(yawTarget-b.angularVelocity.y)*config.mass*2.6;}
  // Tires regain grip gradually after release; no heading or position is teleported.
  if(!driftWanted&&e.driftLevel>.02){b.torque.y-=b.angularVelocity.y*config.mass*.45*e.driftLevel;}
  r.drifting=driftWanted&&e.driftLevel>.25;r.driftLevel=e.driftLevel;
  r.reverseBlocked=reverse&&!e.reverseAllowed;r.driveMode=brake?'brake':back?'reverse':gas?'forward':'coast';r.braking=brake>0;
  b.quaternion.vmult(UP,up);b.quaternion.vmult(FORWARD,forward);
  // A gentle upright stabilizer prevents frustrating rollovers without locking
  // pitch, roll, yaw or lateral velocity. Tire contact still drives the car.
  b.torque.x+=-up.z*config.mass*16-b.angularVelocity.x*config.mass*1.5;
  b.torque.z+=up.x*config.mass*16-b.angularVelocity.z*config.mass*1.5;
  const v=b.velocity.length();
  if(v>.05){const drag=config.mass*(.1+.0024*v*v);vec.copy(b.velocity);vec.scale(-drag/v,vec);b.applyForce(vec);}
  // Prevent a stationary brake from becoming unintended reversing.
  if(brake && Math.abs(local.z)<.15 && Math.abs(local.x)<.15){b.velocity.x*=.7;b.velocity.z*=.7;}
  r.steer=e.steering/.48;r.steeringAngle=e.steering;
 }
 sync(e,progress=true){
  const {r,body:b,car,config}=e;b.quaternion.vmult(FORWARD,forward);b.vectorToLocalFrame(b.velocity,local);
  r.x=b.position.x;r.z=b.position.z;r.y=b.position.y-config.rideHeight;
  r.heading=Math.atan2(forward.x,forward.z);r.speed=Math.hypot(b.velocity.x,b.velocity.z);r.forwardSpeed=local.z;r.lateralSpeed=local.x;
  r.velocity=[b.velocity.x,b.velocity.y,b.velocity.z];r.quaternion=[b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w];
  r.grounded=car.numWheelsOnGround;r.sliding=car.sliding;r.wheelSpin=car.wheelInfos[2].rotation;
  r.wheels=car.wheelInfos.map((w,i)=>{const contact=w.isInContact;car.updateWheelTransform(i);const t=w.worldTransform;return{...wheelVisualPose(b.quaternion,w.steering,w.rotation),position:[t.position.x,t.position.y,t.position.z],quaternion:[t.quaternion.x,t.quaternion.y,t.quaternion.z,t.quaternion.w],rotation:w.rotation,suspension:w.suspensionLength,contact};});
  if(progress && !r.finished)recordProgress(r,this.track,nearestTrack(this.track,r.x,r.z).s);
 }
 step(dt,input={},assist=true){
  this.accumulator+=Math.min(dt,.1);let steps=0;this.hits=[];
  while(this.accumulator>=FIXED_DT-1e-9 && steps<6){
   this.entries.forEach((e,i)=>this.drive(e,i===0?input:this.botInput(e),i===0 && assist));
   this.world.step(FIXED_DT);this.time+=FIXED_DT;this.entries.forEach(e=>this.sync(e));
   this.accumulator-=FIXED_DT;steps++;
  }
  return{steps,hits:[...this.hits]};
 }
 recover(r){
  const e=this.entries.find(e=>e.r===r),f=nearestTrack(this.track,r.x,r.z),b=e.body;
  b.position.set(f.x,e.config.rideHeight+.1,f.z);b.quaternion.setFromEuler(0,Math.atan2(f.tx,f.tz),0);b.velocity.set(0,0,0);b.angularVelocity.set(0,0,0);b.force.set(0,0,0);b.torque.set(0,0,0);b.aabbNeedsUpdate=true;b.wakeUp();
  e.steering=0;e.reverseDown=false;e.reverseAllowed=false;e.driftLevel=0;r.drifting=false;r.driftLevel=0;r.reverseBlocked=false;r.driveMode='coast';e.car.wheelInfos.forEach(w=>{w.steering=0;w.rotation=0;w.deltaRotation=0;w.suspensionLength=e.config.rest;});r.s=f.s;this.sync(e,false);
 }
 dispose(){for(const e of this.entries)e.car.removeFromWorld(this.world);this.entries=[];}
}
