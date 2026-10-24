export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const mod=(v,n)=>((v%n)+n)%n;
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function trackFrame(track,s){
 const f=mod(s,track.length)/track.length*track.frames.length,i=Math.floor(f),a=track.frames[i],b=track.frames[(i+1)%track.frames.length],t=f-i;
 const tx=a.tx+(b.tx-a.tx)*t,tz=a.tz+(b.tz-a.tz)*t,len=Math.hypot(tx,tz);
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,tx:tx/len,tz:tz/len,rx:tz/len,rz:-tx/len,s:mod(s,track.length)};
}
export function nearestTrack(track,x,z){
 let best=Infinity,bestI=0,bestT=0,bestX=0,bestZ=0;const n=track.frames.length;
 for(let i=0;i<n;i++){
  const a=track.frames[i],b=track.frames[(i+1)%n],dx=b.x-a.x,dz=b.z-a.z;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+t*dx,pz=a.z+t*dz,d=(px-x)**2+(pz-z)**2;
  if(d<best){best=d;bestI=i;bestT=t;bestX=px;bestZ=pz;}
 }
 const answer={...trackFrame(track,(bestI+bestT)/n*track.length),x:bestX,z:bestZ};
 answer.lateral=(x-answer.x)*answer.rx+(z-answer.z)*answer.rz;answer.distance=Math.sqrt(best);return answer;
}
export function makeRacer(track,{id='player',car='tavaculo',s=0,lane=0}={}){
 const f=trackFrame(track,s);return {id,car,x:f.x+f.rx*lane,z:f.z+f.rz*lane,heading:Math.atan2(f.tx,f.tz),speed:0,steer:0,s:mod(s,track.length),distance:s,gate:0,finished:false,finishTime:null,hitCooldown:0,lane};
}
export function recordProgress(r,track,nextS){
 let d=nextS-r.s;if(d>track.length/2)d-=track.length;if(d< -track.length/2)d+=track.length;
 // Recovery or a teleport must never count as racing distance.
 if(Math.abs(d)<12)r.distance+=d;
 r.s=nextS;
 while(r.gate<4 && r.distance>=(r.gate+1)*track.length/4)r.gate++;
}
export function rankOf(player,racers){return 1+racers.filter(r=>r!==player && (r.finished || r.distance>player.distance)).length;}
export const PRIZES=[1000,650,400,150];
export function finishRacer(r,track,time){if(!r.finished && r.distance>=track.length && r.gate===4){r.finished=true;r.finishTime=time;return true;}return false;}
