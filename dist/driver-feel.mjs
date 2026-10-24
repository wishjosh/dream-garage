const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Game controls, separate from the tyre model. Zero always means straight wheels.
export function assistedSteer(raw,speed,wheelbase,maxSteer=.46,drift=false){
 const value=clamp(Number(raw)||0,-1,1),v=Math.abs(speed),dead=.025;
 const u=Math.max(0,(Math.abs(value)-dead)/(1-dead));
 const response=.55*u+.45*u*u*u;
 const limit=clamp(.055+Math.atan(wheelbase*8.5/Math.max(1,v*v)),.085,maxSteer);
 const angleLimit=drift?Math.min(maxSteer,limit*1.65):limit;
 return Math.sign(value)*response*angleLimit/maxSteer;
}
// Dissipative recovery: no route target, counter-steering or added propulsion.
export function stabilize(s,{neutral=false,brake=false,reverse=false,driftLevel=0},dt){
 if(reverse||s.u<-.2)return;
 const weight=clamp(1-driftLevel*1.7,0,1);
 if(!weight)return;
 const rate=(neutral?3.8:brake?2.2:.65)*weight;
 if(neutral||Math.abs(s.beta)>.045)s.v*=Math.exp(-rate*dt);
 if(neutral)s.yawRate*=Math.exp(-rate*dt);
 else if(Math.abs(s.beta)>.10)s.yawRate*=Math.exp(-rate*.5*dt);
}
