import {RacePhysics as BaseRacePhysics,FIXED_DT} from '../../race-handling.mjs?v=race-safety-1';
export {FIXED_DT};
// Reuse the existing recovery, at the current course position, only for a bot
// which wants to accelerate but has been stationary for four simulated seconds.
export class RacePhysics extends BaseRacePhysics{
 constructor(...args){super(...args);this.aiRecoveryCount=0;}
 step(dt,input={},assist=true){const result=super.step(dt,input,assist);
  for(const e of this.entries.slice(1)){
   if(e.r.finished||e.r.speed>=.6||this.route(e).throttle<.5){e.stallSince=null;continue;}
   e.stallSince??=this.time;
   if(this.time-e.stallSince<4)continue;
   if(this.recover(e.r)){this.aiRecoveryCount++;e.stallSince=null;}
  }
  return result;
 }
}
