import {DATA} from './data.mjs';
import {worldPoint,START_X} from './terrain.mjs';
import {clamp,nearestTrack,trackFrame,angleDelta} from '../../race-core.mjs';
export const PIT_SPEED=50/3.6,HORIZON=15,HOLD_Z=430-START_X-2.4,EXIT_Z=550-START_X;
export const PIT=DATA.campus.pit.map(worldPoint);let length=0;
for(let i=0;i<PIT.length;i++){if(i)length+=Math.hypot(PIT[i].x-PIT[i-1].x,PIT[i].z-PIT[i-1].z);PIT[i].s=length;}
export const PIT_LENGTH=length;
export function pitFrame(s){s=clamp(s,0,PIT_LENGTH);let i=1;while(i<PIT.length-1&&PIT[i].s<s)i++;const a=PIT[i-1],b=PIT[i],t=(s-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);return{x:a.x+dx*t,z:a.z+dz*t,tx:dx/l,tz:dz/l,s};}
export function nearestPit(x,z){let best={distance:Infinity};for(let i=1;i<PIT.length;i++){const a=PIT[i-1],b=PIT[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+dx*t,pz=a.z+dz*t,distance=Math.hypot(px-x,pz-z);if(distance<best.distance)best={...pitFrame(a.s+(b.s-a.s)*t),distance};}return best;}
export const HOLD_S=nearestPit(38,HOLD_Z).s;
// Deterministic game predictor: route-following traffic, current speed, +/-0.8 m/s²
// uncertainty, all lane positions, 0.25s steps plus car length/time-step margins.
// Missing, off-route or reversing traffic never produces a release.
export function predictMerge(track,traffic,{fromS=HOLD_S,speed=0}={}){
 if(!Array.isArray(traffic))return{clear:false,reason:'교통 정보 없음',horizon:HORIZON};
 for(const r of traffic)if(![r.x,r.z,r.forwardSpeed].every(Number.isFinite)||r.forwardSpeed<-.1||nearestTrack(track,r.x,r.z).distance>9)return{clear:false,reason:'교통 예측 불가',horizon:HORIZON};
 for(let t=0;t<=HORIZON+.001;t+=.25){
  const accel=2.5,capTime=Math.max(0,(PIT_SPEED-speed)/accel),d=t<=capTime?speed*t+.5*accel*t*t:speed*capTime+.5*accel*capTime*capTime+PIT_SPEED*(t-capTime);
  const p=pitFrame(fromS+d),n=nearestTrack(track,p.x,p.z);
  if(n.distance>9)continue;
  for(const r of traffic){
   const a=nearestTrack(track,r.x,r.z),v=Math.max(0,r.forwardSpeed);
   const lowTime=Math.min(t,v/.8),lo=v*lowTime-.4*lowTime*lowTime,hi=Math.min(36*t,v*t+.4*t*t);
   const mid=(lo+hi)/2,half=(hi-lo)/2+8+Math.max(v,PIT_SPEED)*.125;
   const delta=Math.abs(angleDelta((n.s-a.s-mid)/track.length*Math.PI*2,0))*track.length/(Math.PI*2);
   if(delta<half)return{clear:false,reason:'본선 차량 통과 대기',conflictId:r.id,atSeconds:t,horizon:HORIZON};
  }
 }
 return{clear:true,reason:'합류 가능 · 15초 예측',horizon:HORIZON};
}
export function pitGuide(e){const n=nearestPit(e.s.x,e.s.z),look=8+Math.abs(e.s.u)*.65,p=pitFrame(n.s+look),desired=Math.atan2(p.x-e.s.x,p.z-e.s.z);return{steer:clamp(Math.atan(2*(e.config.a+e.config.b)*Math.sin(angleDelta(desired,e.s.heading))/look)/e.config.maxSteer,-1,1),throttle:clamp((PIT_SPEED-e.s.u)*.65,0,1),brake:clamp((e.s.u-PIT_SPEED)*.5,0,1)};}
