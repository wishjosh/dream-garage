// Shared by both control variants. SI units; positive steering/yaw is driver left.
// A planar two-axle model, not a calibrated reconstruction of a real Gallardo.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DT=1/120;
export const CAR=Object.freeze({mass:1320,a:1.45,b:1.15,height:.46,inertia:2350,
  frontMu:.98,rearMu:1.14,frontStiffness:74000,rearStiffness:130000,
  engine:9600,brake:13000,maxSpeed:47,maxSteer:.46});
export const CORNER=Object.freeze({radius:40,halfWidth:8,startZ:-48,end:128});
const mix=(a,b,k)=>a+(b-a)*k;
export function cornerPoint(s){
  const R=CORNER.radius;
  if(s<=0)return{x:0,z:s,heading:0,s};
  if(s<R*Math.PI/2){const h=s/R;return{x:R*(1-Math.cos(h)),z:R*Math.sin(h),heading:h,s};}
  return{x:R+s-R*Math.PI/2,z:R,heading:Math.PI/2,s};
}
export function nearestCorner(x,z){
  const R=CORNER.radius,h=clamp(Math.atan2(z,R-x),0,Math.PI/2);
  const candidates=[cornerPoint(clamp(z,-130,0)),cornerPoint(h*R),cornerPoint(R*Math.PI/2+clamp(x-R,0,150))];
  let p=candidates[0],d=Infinity;
  for(const c of candidates){const q=Math.hypot(x-c.x,z-c.z);if(q<d){d=q;p=c;}}
  return{...p,distance:d,lateral:(x-p.x)*Math.cos(p.heading)-(z-p.z)*Math.sin(p.heading)};
}
export function createCar(speedKmh=60){return{x:0,z:CORNER.startZ,heading:0,u:speedKmh/3.6,v:0,yawRate:0,
  steer:0,ax:0,ay:0,time:0,hits:0,collisionCooldown:0,wheelAngle:0,frontSlip:0,rearSlip:0,
  frontUse:0,rearUse:0,beta:0,handling:'grip',gas:0,braking:0,reverse:false,frontForce:0,rearForce:0,
  frontCapacity:1,rearCapacity:1,frontLoad:0,rearLoad:0,peakLateral:0,underTime:0,overTime:0,done:false,powerSlip:0,reverseDown:false,reverseAllowed:false,reverseBlocked:false};}
export function combinedTyre(alpha,stiffness,capacity,longitudinalDemand){
  // Both axles share longitudinal/lateral demand continuously within one limit.
  // Neither drive nor braking can erase the entire lateral-force budget first.
  const lateralDemand=stiffness*alpha;
  const ratio=Math.hypot(longitudinalDemand,lateralDemand)/Math.max(1,capacity);
  const scale=ratio>1e-10?Math.tanh(ratio)/ratio:1;
  const loss=.08*clamp((Math.abs(alpha)-.14)/.30,0,1);
  return{longitudinal:longitudinalDemand*scale,lateral:lateralDemand*scale*(1-loss)};
}
export function stepCar(s,input={},dt=DT,options={}){
  if(!Number.isFinite(dt)||dt<=0||s.done)return s;
  const count=Math.ceil(dt/(1/240));
  for(let i=0;i<count;i++)substep(s,input,dt/count,options);
  return s;
}
function substep(s,input={},dt=DT,{walls=true,vehicle=CAR}={}){
  if(!Number.isFinite(dt)||dt<=0||s.done)return s;
  const c=vehicle,L=c.a+c.b,speed=Math.abs(s.u);
  const steerTarget=clamp(Number(input.steer)||0,-1,1)*c.maxSteer;
  s.steer=mix(s.steer,steerTarget,1-Math.exp(-dt*9));
  const brake=clamp(Number(input.brake)||0,0,1),reverse=!!input.reverse;
  let gas=brake?0:clamp(Number(input.throttle)||0,0,1);
  if(reverse&&!s.reverseDown)s.reverseAllowed=Math.abs(s.u)<.45&&Math.abs(s.v)<.7;
  if(!reverse)s.reverseAllowed=false;s.reverseDown=reverse;s.reverseBlocked=reverse&&!s.reverseAllowed;
  if(s.reverseBlocked)gas=0;
  s.gas=brake||s.reverseBlocked?0:mix(s.gas,gas,1-Math.exp(-dt*(gas>s.gas?5:12)));s.braking=brake;s.reverse=reverse&&s.reverseAllowed;
  const acceleration=clamp(s.ax,-9,7),transfer=c.mass*acceleration*c.height/L;
  const frontLoad=clamp(c.mass*9.81*c.b/L-transfer,2000*c.mass/CAR.mass,c.mass*9.81-2000*c.mass/CAR.mass);
  const rearLoad=c.mass*9.81-frontLoad,frontCap=frontLoad*c.frontMu,rearBase=rearLoad*c.rearMu;
  const drive=(s.reverse?-c.engine*.32:s.u<-.2?0:c.engine)*s.gas*clamp(1-(speed/c.maxSpeed)**4,0,1);
  const stopping=brake||(s.reverseBlocked?1:0)||(!reverse&&s.u<-.2&&gas ? .65 : 0);
  const brakeForce=stopping*c.brake*Math.tanh(s.u*3);
  // Game-tuned driven-tyre post-peak loss: build progressively only under high
  // drive demand and recover promptly on lift. Not wheel/RPM slip simulation.
  const powerDemand=clamp((Math.abs(drive)/rearBase-.65)/.35,0,1);
  s.powerSlip=mix(s.powerSlip||0,powerDemand,1-Math.exp(-dt*(powerDemand>(s.powerSlip||0)?3:7)));
  const rearCap=rearBase*(1-0.18*s.powerSlip);
  const rearDemand=drive-brakeForce*.36;
  const divisor=Math.max(2.5,speed);
  const frontVx=s.u*Math.cos(s.steer)+(s.v+c.a*s.yawRate)*Math.sin(s.steer);
  const frontVy=-s.u*Math.sin(s.steer)+(s.v+c.a*s.yawRate)*Math.cos(s.steer);
  const alphaF=-Math.atan2(frontVy,Math.max(2.5,Math.abs(frontVx)));
  const rearVy=s.v-c.b*s.yawRate;
  const alphaR=-Math.atan(rearVy/divisor);
  const front=combinedTyre(alphaF,c.frontStiffness,frontCap,-stopping*c.brake*.64*Math.tanh(frontVx*3));
  // A loaded tyre does not lose contact simply because the car is slow.
  // Local slip regularization and <= 1/240 s substeps keep rest stable.
  const contact=1;
  const fxFront=front.longitudinal*contact,fyFront=front.lateral*contact;
  const rear=combinedTyre(alphaR,c.rearStiffness,rearCap,rearDemand);
  const fxRear=rear.longitudinal,fyRear=rear.lateral*contact;
  const lateralFront=fyFront*Math.cos(s.steer)+fxFront*Math.sin(s.steer);
  const longitudinalFront=fxFront*Math.cos(s.steer)-fyFront*Math.sin(s.steer);
  const drag=-s.u*(c.mass*.018+.46*speed);
  const ax=(longitudinalFront+fxRear+drag)/c.mass;
  const ay=(lateralFront+fyRear)/c.mass;

  const yawAcceleration=(c.a*lateralFront-c.b*fyRear)/c.inertia;
  const oldU=s.u;
  // Rotate the force-updated velocity into the new body frame exactly.
  // Coriolis terms change coordinates, not kinetic energy.
  const turn=(s.yawRate+.5*yawAcceleration*dt)*dt;
  const forward=s.u+ax*dt,lateral=s.v+ay*dt;
  s.u=forward*Math.cos(turn)+lateral*Math.sin(turn);
  s.v=lateral*Math.cos(turn)-forward*Math.sin(turn);
  s.yawRate+=yawAcceleration*dt;
  if(stopping&&!s.gas&&((oldU>=0&&s.u<0)||(oldU<=0&&s.u>0)))s.u=0;
  s.u=clamp(s.u,-5,55);
  s.heading+=turn;
  const sh=Math.sin(s.heading),ch=Math.cos(s.heading);
  let vx=s.u*sh+s.v*ch,vz=s.u*ch-s.v*sh;
  s.x+=vx*dt;s.z+=vz*dt;s.time+=dt;s.wheelAngle+=s.u*dt/.33;
  const road=nearestCorner(s.x,s.z);s.peakLateral=Math.max(s.peakLateral,Math.abs(road.lateral));
  s.collisionCooldown=Math.max(0,s.collisionCooldown-dt);
  if(walls&&Math.abs(road.lateral)>CORNER.halfWidth-1){
    const side=Math.sign(road.lateral),nx=Math.cos(road.heading)*side,nz=-Math.sin(road.heading)*side;
    const outward=vx*nx+vz*nz,penetration=Math.abs(road.lateral)-(CORNER.halfWidth-1);
    s.x-=nx*penetration;s.z-=nz*penetration;
    if(outward>0){vx-=nx*outward*1.12;vz-=nz*outward*1.12;s.u=vx*sh+vz*ch;s.v=vx*ch-vz*sh;s.yawRate*=.7;
      if(outward>1&&s.collisionCooldown===0){s.hits++;s.collisionCooldown=.6;}}
  }
  s.ax=mix(s.ax,ax,1-Math.exp(-dt*9));s.ay=mix(s.ay,ay,1-Math.exp(-dt*9));
  s.frontSlip=alphaF;s.rearSlip=alphaR;s.beta=Math.atan2(s.v,Math.max(1,Math.abs(s.u)));
  s.frontUse=Math.hypot(c.frontStiffness*alphaF,fxFront)/Math.max(1,frontCap);
  s.rearUse=Math.hypot(c.rearStiffness*alphaR,fxRear)/Math.max(1,rearCap);
  s.frontLongitudinal=fxFront;s.rearLongitudinal=fxRear;
  s.frontContactLongitudinal=frontVx;s.frontContactLateral=frontVy;
  s.rearContactLateral=rearVy;
  s.frontForce=fyFront;s.rearForce=fyRear;s.frontCapacity=frontCap;s.rearCapacity=rearCap;s.frontLoad=frontLoad;s.rearLoad=rearLoad;
  const desiredYaw=s.u*Math.tan(s.steer)/L;
  const over=Math.abs(alphaR)>.08&&s.rearUse>1.05&&Math.abs(s.beta)>.07&&(Math.abs(alphaR)>Math.abs(alphaF)*.88||s.powerSlip>.5);
  const under=Math.abs(alphaF)>.08&&s.frontUse>1.08&&Math.abs(desiredYaw)>Math.abs(s.yawRate)*1.25;
  s.handling=over?'oversteer':under?'understeer':'grip';
  if(s.handling==='oversteer')s.overTime+=dt;if(s.handling==='understeer')s.underTime+=dt;
  return s;
}
