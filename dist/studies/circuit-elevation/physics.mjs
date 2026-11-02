import {spectatorVariant,withinSpectatorPaving} from './spectators.mjs';
import {facilityVariant,facilityColliders,withinYard} from './facilities.mjs';
import {pitLayout} from './layout.mjs';
import {RacePhysics as FlatPhysics,FIXED_DT} from '../../course-race-physics.mjs';
import * as C from '../../vendor/cannon-es.js';
import {wheelVisualPose} from '../../vehicle-physics.mjs';
import {trackFrame,nearestTrack,clamp} from '../../race-core.mjs';
import {markRecovered} from '../../course-recovery.mjs';
import {terrainHeight,terrainGradient,inRunoff,inside,SITE,ROAD_Y,campusPoint} from './terrain.mjs';
import {DATA} from './data.mjs';
import {pitSignal,cornerApproachS} from './trackside.mjs?v=distance-extension-1';
import {createPit,DEFAULT_PIT,PIT_SPEED,HOLD_Z,EXIT_Z} from './pit.mjs';
export {FIXED_DT};
const G=9.81,UP=new C.Vec3(0,1,0);
export class RacePhysics extends FlatPhysics{
 constructor(track,racers,rigs,options={}){
  super(track,racers,rigs,{...options,barriers:false,autoRecovery:false});
  this.spectators=spectatorVariant(options.spectators||'before');this.facilities=facilityVariant(options.facilities||'before');this.layout=pitLayout(options.layout);this.pitRoute=createPit(this.layout);
  this.autoRecovery=options.autoRecovery??true;this.merge={clear:false,reason:'출구 접근 전',horizon:15};this.predictAt=0;
  this.metrics={minContacts:4,maxWheelError:0,maxGrade:0,gateWait:0,mergeReleases:0,minMergeGap:null};
  this.addCampusBarriers();this.entries.forEach(e=>this.sync(e,false));
 }
 addCampusBarriers(){
  const separator=new C.Body({mass:0,shape:new C.Box(new C.Vec3(.3,.5,90))});separator.position.set(this.layout.separatorX,.5,340-DATA.campus.start[0]);separator.raceKind='barrier';this.world.addBody(separator);
  for(let i=0;i<SITE.length;i++){const a=SITE[i],b=SITE[(i+1)%SITE.length],len=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(len/8);for(let j=0;j<count;j++){const x=a.x+(b.x-a.x)*(j+.5)/count,z=a.z+(b.z-a.z)*(j+.5)/count,bod=new C.Body({mass:0,shape:new C.Box(new C.Vec3(.25,.7,len/count/2+.05))});bod.position.set(x,terrainHeight(x,z)+.7,z);bod.quaternion.setFromEuler(0,Math.atan2(b.x-a.x,b.z-a.z),0);bod.raceKind='barrier';this.world.addBody(bod);}}
  for(const f of facilityColliders(this.layout,this.facilities,this.spectators)){const [x0,y0,x1,y1]=f.box,w=y1-y0,d=x1-x0,x=-(y0+y1)/2,z=(x0+x1)/2-DATA.campus.start[0],b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(w/2,f.height/2,d/2))});b.position.set(x,terrainHeight(x,z)+f.height/2,z);b.facilityId=f.id;b.raceKind='barrier';this.world.addBody(b);}
 }
 surface(e){const n=nearestTrack(this.track,e.s.x,e.s.z),p=(this.pitRoute||DEFAULT_PIT).nearestPit(e.s.x,e.s.z);return n.distance<=8.2?'road':p.distance<=(this.layout?.halfWidth||6)?'pit':inRunoff(e.s.x,e.s.z)?'runoff':(withinYard(e.s.x,campusPoint(e.s.x,e.s.z)[0],this.facilities)||withinSpectatorPaving(e.s.x,campusPoint(e.s.x,e.s.z)[0],this.spectators))?'apron':'grass';}
 placeBody(e,rewind=0){super.placeBody(e,rewind);e.body.position.y=terrainHeight(e.s.x,e.s.z)+.6;e.body.aabbNeedsUpdate=true;}
 route(e){return e.pit?.active?(this.pitRoute||DEFAULT_PIT).pitGuide(e):super.route(e);}
 drive(e,input,assist){
  e.pit??={active:false,released:false,wait:0,merged:false};const cp=campusPoint(e.s.x,e.s.z),p=(this.pitRoute||DEFAULT_PIT).nearestPit(e.s.x,e.s.z);
  if(e.pit.merged){const lapS=nearestTrack(this.track,e.s.x,e.s.z).s;if(lapS>350&&lapS<this.track.length-350)e.pit={active:false,released:false,wait:0,merged:false};}
  if(!e.pit.merged&&cp[0]>180&&cp[0]<545&&-cp[1]>10&&p.distance<(this.layout?.halfWidth||6))e.pit.active=true;
  if(e.pit.active){
   input={...input};
   if(e.s.u>=PIT_SPEED-.15)input.throttle=0;
   if(e.s.u>PIT_SPEED)input.brake=Math.max(Number(input.brake)||0,.65);
   if(!e.pit.released&&e.s.z>HOLD_Z-45){
    if(!this.merge||this.time>=this.predictAt){this.merge=this.pitRoute.predictMerge(this.track,this.entries.filter(o=>o!==e&&!o.pit?.active).map(o=>o.r));this.predictAt=this.time+.2;}
    // Always stop once before a release: this predictor starts from rest at the line.
    const room=Math.max(0,HOLD_Z-e.s.z),vstop=Math.sqrt(2*4.5*room);
    if(e.s.u>vstop){input.throttle=0;input.brake=1;}
    if(room<.5&&Math.abs(e.s.u)<.8){
     e.s.z=HOLD_Z;e.s.u=0;e.s.v=0;e.pit.stopUntil??=this.time+.5;
     this.merge=this.pitRoute.predictMerge(this.track,this.entries.filter(o=>o!==e&&!o.pit?.active).map(o=>o.r));
     if(this.merge.clear&&this.time>=e.pit.stopUntil){e.pit.released=true;this.metrics.mergeReleases++;}
     else{input.throttle=0;input.brake=1;e.pit.wait+=FIXED_DT;this.metrics.gateWait+=FIXED_DT;}
    }
   }
  }
  const priorU=e.s.u;
  const gradient=terrainGradient(e.s.x,e.s.z),grade=gradient.x*Math.sin(e.s.heading)+gradient.z*Math.cos(e.s.heading),sideGrade=gradient.x*Math.cos(e.s.heading)-gradient.z*Math.sin(e.s.heading);
  const surface=this.surface(e),factor=surface==='grass'?.58:surface==='runoff'?.88:1,original=e.config;
  const contacts=e.r.grounded??4,normal=clamp((G+(e.ground?.acceleration||0))/G,.75,1.15)*(contacts/4);
  e.config={...original,frontMu:original.frontMu*factor*normal,rearMu:original.rearMu*factor*normal,engine:original.engine*(contacts/4),brake:original.brake*factor*(contacts/4)};
  e.s.u-=G*grade*FIXED_DT;e.s.v-=G*sideGrade*FIXED_DT;
  super.drive(e,input,assist);e.config=original;
  if(surface==='grass'){const k=Math.exp(-FIXED_DT*.8);e.s.u*=k;e.s.v*=k;}
  if(e.pit.active){
   e.s.u=Math.min(e.s.u,priorU+2.5*FIXED_DT);const speed=Math.hypot(e.s.u,e.s.v);if(speed>PIT_SPEED){e.s.u*=PIT_SPEED/speed;e.s.v*=PIT_SPEED/speed;}
   if(!e.pit.released&&e.s.z>=HOLD_Z){e.s.z=HOLD_Z;e.s.u=0;e.s.v=0;}
   if(e.s.z>=EXIT_Z&&nearestTrack(this.track,e.s.x,e.s.z).distance<8.2){e.pit.active=false;e.pit.merged=true;}
  }
 }
 collisions(){super.collisions();for(const e of this.entries)if(e.pit?.active&&!e.pit.released&&e.s.z>HOLD_Z){e.s.z=HOLD_Z;e.s.u=0;e.s.v=0;this.placeBody(e);}}
 sync(e,progress=true){
  // Base constructor dispatches here before the subclass is initialized.
  const record=progress&&!e.pit?.active&&nearestTrack(this.track,e.s.x,e.s.z).distance<=12;
  super.sync(e,record);
  const {s,r,rig}=e,g=terrainGradient(s.x,s.z),forward=g.x*Math.sin(s.heading)+g.z*Math.cos(s.heading),right=g.x*Math.cos(s.heading)-g.z*Math.sin(s.heading);
  const target=terrainHeight(s.x,s.z)+ROAD_Y,pitch=-Math.atan(forward),roll=Math.atan(right),yaw=new C.Quaternion();yaw.setFromAxisAngle(UP,s.heading);
  e.ground??={y:target,vy:0,pitch,roll,acceleration:0};const ground=e.ground;
  if(progress){const a=clamp(95*(target-ground.y)-18*(ground.vy-(s.u*forward+s.v*right)),-G,2*G);ground.vy+=a*FIXED_DT;ground.y+=ground.vy*FIXED_DT;ground.acceleration=a;ground.pitch+=(pitch-ground.pitch)*(1-Math.exp(-FIXED_DT*18));ground.roll+=(roll-ground.roll)*(1-Math.exp(-FIXED_DT*18));}
  else{Object.assign(ground,{y:target,vy:s.u*forward+s.v*right,pitch,roll,acceleration:0});}
  if(ground.y<target-.06){ground.y=target-.06;ground.vy=Math.max(ground.vy,s.u*forward+s.v*right);}
  const tilt=new C.Quaternion(),q=yaw.clone();tilt.setFromEuler(ground.pitch,0,ground.roll,'XYZ');q.mult(tilt,q);
  const body=q.clone();if(this.presentationEnabled){tilt.setFromEuler(e.motion.pitch,0,e.motion.roll,'XYZ');body.mult(tilt,body);}
  Object.assign(r,{y:ground.y,quaternion:[body.x,body.y,body.z,body.w],grade:forward*100,terrainPitch:ground.pitch,terrainRoll:ground.roll,verticalSpeed:ground.vy,surface:this.surface(e),pit:{...e.pit}});
  r.velocity[1]=ground.vy;
  r.wheels=rig.wheels.map(w=>{const local=new C.Vec3(...w.position),rotated=q.vmult(local),x=s.x+rotated.x,z=s.z+rotated.z,want=terrainHeight(x,z)+ROAD_Y+w.position[1],free=ground.y+rotated.y,extension=free-want,contact=extension<=.16;
   const y=contact?want:free-.16,pose=wheelVisualPose(q,w.front?s.steer:0,r.wheelSpin);
   return{position:[x,y,z],...pose,quaternion:pose.visualQuaternion,rotation:r.wheelSpin,suspension:clamp(-extension,-.16,.16),contact,error:contact?Math.abs(y-want):Math.max(0,y-want)};});
  r.grounded=r.wheels.filter(w=>w.contact).length;
  if(this.metrics&&progress){if(e.index===0&&e.pit?.released){for(const o of this.entries.slice(1)){const gap=Math.hypot(s.x-o.s.x,s.z-o.s.z);this.metrics.minMergeGap=Math.min(this.metrics.minMergeGap??Infinity,gap);}}this.metrics.minContacts=Math.min(this.metrics.minContacts,r.grounded);this.metrics.maxGrade=Math.max(this.metrics.maxGrade,Math.abs(r.grade));for(const w of r.wheels)this.metrics.maxWheelError=Math.max(this.metrics.maxWheelError,w.error);}
 }
 checkRecovery(){
  const e=this.entries[0];if(!this.autoRecovery||!e||e.r.finished)return;const n=nearestTrack(this.track,e.s.x,e.s.z);
  if(n.distance<8.2&&!e.pit?.active)e.recovery.anchorS=n.s;
  const allowed=inside(SITE,e.s.x,e.s.z)&&(e.pit?.active||inRunoff(e.s.x,e.s.z)||withinYard(e.s.x,campusPoint(e.s.x,e.s.z)[0],this.facilities)||withinSpectatorPaving(e.s.x,campusPoint(e.s.x,e.s.z)[0],this.spectators)||n.distance<12);
  if(allowed){e.offTime=0;return;}e.offTime=(e.offTime||0)+FIXED_DT;
  if(e.offTime>6&&this.time>=e.recovery.nextCheck){if(this.recover(e.r,{atS:e.recovery.anchorS,reason:'outside-campus'}))e.offTime=0;}
 }
 recover(r,options={}){const e=this.entries.find(e=>e.r===r);if(e)e.pit={active:false,released:false,wait:0,merged:false};const ok=super.recover(r,options);if(ok&&e){e.ground=null;this.sync(e,false);}return ok;}
 setupScenario(scenario='start',traffic='pack',corner=1){
  const tour=scenario==='pitlane';if(tour)scenario='pit';
  const e=this.entries[0];let s=scenario==='corner'?cornerApproachS(this.track,corner):scenario==='slope'?this.track.length*.28:scenario==='runoff'?DATA.corners[2].s:0,lateral=scenario==='runoff'?19:-2.3;
  const f=trackFrame(this.track,s);Object.assign(e.s,{x:f.x+f.rx*lateral,z:f.z+f.rz*lateral,heading:Math.atan2(f.tx,f.tz),u:0,v:0,yawRate:0});Object.assign(e.r,{s,distance:s,gate:Math.floor(s/this.track.length*4),finished:false});
  e.pit={active:scenario==='pit',released:false,wait:0,merged:false};
  if(scenario==='pit')Object.assign(e.s,{x:this.layout.centerX,z:HOLD_Z-(tour?110:24),heading:0});
  for(const [i,o] of this.entries.slice(1).entries()){const at=traffic==='clear'?this.track.length*.4+i*35:scenario==='pit'?this.track.length-400+i*45:s+60+i*45,ff=trackFrame(this.track,at);Object.assign(o.s,{x:ff.x+ff.rx*o.r.lane,z:ff.z+ff.rz*o.r.lane,heading:Math.atan2(ff.tx,ff.tz),u:scenario==='pit'?30:15,v:0,yawRate:0});Object.assign(o.r,{s:ff.s,distance:ff.s,gate:Math.floor(ff.s/this.track.length*4),finished:false});o.pit={active:false,released:false,wait:0,merged:false};}
  this.entries.forEach(o=>{o.ground=null;this.placeBody(o);this.sync(o,false);});this.predictAt=0;this.merge={clear:false,reason:'출구 접근 전',horizon:15};
 }
 studySnapshot(){return{metrics:{...this.metrics},merge:{...this.merge},cars:this.entries.map(e=>({id:e.r.id,y:e.r.y,grade:e.r.grade,grounded:e.r.grounded,surface:e.r.surface,pit:{...e.pit}}))};}
 advice(r){const e=this.entries.find(e=>e.r===r);if(e?.pit?.active)return pitSignal(r,this.merge).advice;if(r.surface==='runoff')return'회복 공간 · 속도를 줄이고 도로로 복귀';if(r.surface==='grass')return'잔디 · 낮은 속도로 복귀';return super.advice(r);}
}
