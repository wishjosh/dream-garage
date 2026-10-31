import {RacePhysics as CityPhysics,FIXED_DT} from './studies/mixed-city/physics.mjs?v=mixed-city-3';
import {trackFrame,nearestTrack,angleDelta,clamp} from './race-core.mjs';
export {FIXED_DT};
// Reviewed beginner-course pace: same engine/tyres/brakes for every car. Pace follows the road,
// with earlier braking, not player distance, hidden power or catch-up boosts.
export class RacePhysics extends CityPhysics{
 route(e){
  const s=e.s,n=nearestTrack(this.track,s.x,s.z),speed=Math.abs(s.u),look=10+speed*.58;
  const lane=e.index?e.r.lane*.65:0,target=trackFrame(this.track,n.s+look);
  const desired=Math.atan2(target.x+target.rx*lane-s.x,target.z+target.rz*lane-s.z);
  const steer=Math.atan(2*(e.config.a+e.config.b)*Math.sin(angleDelta(desired,s.heading))/look)/e.config.maxSteer;
  let targetSpeed=e.index?34-(e.index-1)*.6:35;
  for(let d=0;d<=140;d+=8){
   const a=trackFrame(this.track,n.s+d),b=trackFrame(this.track,n.s+d+10);
   const k=Math.max(.0005,Math.abs(angleDelta(Math.atan2(b.tx,b.tz),Math.atan2(a.tx,a.tz)))/10);
   const corner=Math.sqrt(4.7/k),room=Math.max(0,d-speed*.4-5);
   targetSpeed=Math.min(targetSpeed,Math.sqrt(corner*corner+2*4.5*room));
  }
  return{steer:clamp(steer,-1,1),throttle:clamp((targetSpeed-s.u)*.7,0,1),brake:clamp((s.u-targetSpeed)*.3,0,.9)};
 }
}
