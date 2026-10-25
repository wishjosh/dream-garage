// Same two water surfaces used by the city renderer. Roads take priority.
export const CITY_WATER_ZONES=Object.freeze([{x:199,z:170,width:370,depth:600},{x:-140,z:440,width:500,depth:150}]);
export function isCityWater(x,z){return CITY_WATER_ZONES.some(a=>Math.abs(x-a.x)<=a.width/2&&Math.abs(z-a.z)<=a.depth/2);}
export const RECOVERY=Object.freeze({safe:10,edge:12,far:24,waterDelay:.35,farDelay:.45,edgeDelay:1.4,flash:1.6,cooldown:1.8,retry:.2});
export function createRecovery(anchorS=0){return{anchorS,cause:null,offSeconds:0,nextCheck:0,count:0,flashUntil:0,lastReason:null,holdUntil:0};}
export function recoveryCause(distance,inWater){return distance<=RECOVERY.edge?null:inWater?'water':distance>RECOVERY.far?'far':'off-course';}
export function sampleRecovery(state,{distance,s,inWater,dt,time}){
 if(distance<=RECOVERY.safe)state.anchorS=s;
 const cause=recoveryCause(distance,inWater);if(!cause||time<state.nextCheck){state.cause=cause;state.offSeconds=0;return null;}
 if(cause!==state.cause){state.cause=cause;state.offSeconds=0;}state.offSeconds+=dt;
 const delay=cause==='water'?RECOVERY.waterDelay:cause==='far'?RECOVERY.farDelay:RECOVERY.edgeDelay;
 return state.offSeconds+1e-9>=delay?cause:null;
}
export function markRecovered(state,time,reason){state.count++;state.holdUntil=time+(reason==='manual'?0:.25);state.lastReason=reason;state.offSeconds=0;state.cause=null;state.nextCheck=time+RECOVERY.cooldown;state.flashUntil=time+RECOVERY.flash;}
export function recoveryVisual(remaining,reducedMotion=false){const active=remaining>0,elapsed=RECOVERY.flash-Math.max(0,remaining);return{active,carVisible:!active||reducedMotion||(elapsed%.5)<.28,pulse:!active?0:reducedMotion?.5:.35+.65*(.5+.5*Math.cos(elapsed*Math.PI*4))};}
