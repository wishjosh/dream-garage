// Reproducible open-loop fixtures. No camera, road-following controller or walls.
// SI inputs. Constant-speed tests explicitly impose u; free tests never do.
export const SPEC=Object.freeze({version:1,dt:1/120,baselineCommit:'25afbf5803310ccea54584f55138d86ff93a6452',
 lowYawErrorPercent:5,linearYawErrorPercent:5,recoverySeconds:3,
 recoveryBetaDegrees:1,recoveryLateralMS:.2,recoveryYawRadS:.05,recoveryHoldSeconds:.5,
 convergenceMetres:.15,passiveEnergyGainJ:.01});
export const SOURCES=[
 {name:'VPP · Tires',url:'https://vehiclephysics.com/blocks/tires/',scope:'하중×마찰계수의 접지 한계, 미끄러짐과 접지의 관계. VPP의 slip velocity(m/s) 기본 수치를 이 모델의 slip angle(rad)에 옮기지 않음.'},
 {name:'PhysX 5.6.1 · Vehicles',url:'https://nvidia-omniverse.github.io/PhysX/physx/5.6.1/docs/Vehicles.html',scope:'앞뒤·좌우 힘의 합산 한계, 저속 수치 안정성, 작은 시간 간격. PhysX SDK 실행 결과와 비교한 것은 아님.'}
];
export const energy=(m,s)=>.5*m.CAR.mass*(s.u*s.u+s.v*s.v)+.5*m.CAR.inertia*s.yawRate*s.yawRate;
export function run(m,{speed=60,seconds=3,input={},initial={},dt=SPEC.dt,fixedSpeed=false}={}){
 const s=Object.assign(m.createCar(speed),{z:0},initial),samples=[],u0=s.u;let distance=0,stop=null,recovered=null,stable=0,maxEnergyGain=0;
 const sample=()=>({t:s.time,x:s.x,z:s.z,speed:Math.hypot(s.u,s.v)*3.6,u:s.u,v:s.v,yaw:s.yawRate,beta:s.beta*180/Math.PI,frontSlip:s.frontSlip*180/Math.PI,rearSlip:s.rearSlip*180/Math.PI,ax:s.ax,ay:s.ay,frontLoad:s.frontLoad,rearLoad:s.rearLoad});
 samples.push(sample());
 for(let i=0;i<Math.round(seconds/dt);i++){
  if(fixedSpeed)s.u=u0;
  const before={x:s.x,z:s.z,e:energy(m,s)};
  m.stepCar(s,typeof input==='function'?input(i*dt):input,dt,{walls:false});
  distance+=Math.hypot(s.x-before.x,s.z-before.z);
  if(!fixedSpeed)maxEnergyGain=Math.max(maxEnergyGain,energy(m,s)-before.e);
  if(stop===null&&Math.hypot(s.u,s.v)<.1)stop={time:s.time,distance};
  const settled=Math.abs(s.beta)*180/Math.PI<SPEC.recoveryBetaDegrees&&Math.abs(s.v)<SPEC.recoveryLateralMS&&Math.abs(s.yawRate)<SPEC.recoveryYawRadS;
  stable=settled?stable+dt:0;
  if(recovered===null&&stable>=SPEC.recoveryHoldSeconds-1e-9)recovered=s.time-stable+dt;
  if(i%Math.max(1,Math.round(1/30/dt))===0||i===Math.round(seconds/dt)-1)samples.push(sample());
 }
 return{state:s,samples,distance,stop,recovered,maxEnergyGain};
}
export function benchmark(m){
 const c=m.CAR,L=c.a+c.b,K=c.mass/L*(c.b/c.frontStiffness-c.a/c.rearStiffness);
 const reference=(speed,steer)=>{const u=speed/3.6;return u*steer*c.maxSteer/(L+K*u*u);};
 const low=[],linear=[],braking=[],recovery=[],corners=[],power=[];
 for(const speed of [.5,1,3,5])for(const sign of [-1,1]){
  const r=run(m,{speed,seconds:20,input:{steer:.1*sign},fixedSpeed:true});const ref=reference(speed,.1*sign);
  low.push({speed,sign,yaw:r.state.yawRate,reference:ref,errorPercent:100*(r.state.yawRate/ref-1)});
 }
 for(const speed of [10,40,60])for(const sign of [-1,1]){
  const r=run(m,{speed,seconds:15,input:{steer:.02*sign},fixedSpeed:true});const ref=reference(speed,.02*sign);
  linear.push({speed,sign,yaw:r.state.yawRate,reference:ref,errorPercent:100*(r.state.yawRate/ref-1)});
 }
 for(const speed of [5,40,60,100]){
  const r=run(m,{speed,seconds:8,input:{brake:1}}),u=speed/3.6;
  // Conservative lower distance bound: best axle mu plus maximum initial drag.
  const upperDecel=Math.max(c.frontMu,c.rearMu)*9.81+u*(c.mass*.018+.46*u)/c.mass;
  braking.push({speed,stop:r.stop,lowerDistanceBound:(u*u-.01)/(2*upperDecel),maxEnergyGain:r.maxEnergyGain,samples:r.samples});
 }
 for(const speed of [20,60,100])for(const sign of [-1,1])for(const brake of [0,.4,1]){
  const r=run(m,{speed,seconds:4,input:{brake},initial:{v:-2.5*sign,yawRate:.5*sign,steer:.115*sign,powerSlip:.8,beta:Math.atan2(-2.5*sign,speed/3.6)}});
  recovery.push({speed,sign,brake,time:r.recovered,endBeta:r.state.beta*180/Math.PI,maxEnergyGain:r.maxEnergyGain,samples:r.samples});
 }
 for(const speed of [40,60,100])for(const sign of [-1,1]){
  const r=run(m,{speed,seconds:1.5,input:{steer:.25*sign}});
  corners.push({speed,sign,curvature:r.state.yawRate/Math.max(.01,r.state.u),radius:Math.abs(r.state.u/r.state.yawRate),beta:r.state.beta*180/Math.PI,frontSlip:r.state.frontSlip,underTime:r.state.underTime,samples:r.samples});
 }
 for(const speed of [40,60,100])for(const sign of [-1,1]){
  const r=run(m,{speed,seconds:3,input:t=>t<1.5?{steer:.25*sign,throttle:1}:{brake:.4}});
  power.push({speed,sign,samples:r.samples,endBeta:r.state.beta*180/Math.PI,overTime:r.state.overTime});
 }
 const fine=run(m,{speed:60,seconds:3,input:{steer:.25,throttle:1},dt:1/480});
 const convergence=[1/60,1/120,1/240].map(dt=>{const r=run(m,{speed:60,seconds:3,input:{steer:.25,throttle:1},dt});return{dt,positionError:Math.hypot(r.state.x-fine.state.x,r.state.z-fine.state.z),betaError:Math.abs(r.state.beta-fine.state.beta)*180/Math.PI};});
 let maximumGain=0,worst=null,passivityCases=0;
 for(const speed of [-10,0,.1,1,5,20,60,100])for(const v of [-10,-3,0,3,10])for(const yawRate of [-2,-.3,0,.3,2])for(const steer of [-1,0,1])for(const brake of [0,1]){
  const s=Object.assign(m.createCar(speed),{v,yawRate,steer:steer*c.maxSteer});const e=energy(m,s);
  m.stepCar(s,{steer,brake},SPEC.dt,{walls:false});const gain=energy(m,s)-e;
  if(gain>maximumGain){maximumGain=gain;worst={speed,v,yawRate,steer,brake};}passivityCases++;
 }
 return{low,linear,braking,recovery,corners,power,convergence,passivity:{cases:passivityCases,maximumGain,worst},
 checks:[
  {id:'low',name:'저속 회전 기준 오차 ≤ 5%',kind:'독립 운동식',pass:low.every(x=>Math.abs(x.errorPercent)<=SPEC.lowYawErrorPercent)},
  {id:'linear',name:'작은 조향의 회전 기준 오차 ≤ 5%',kind:'독립 운동식',pass:linear.every(x=>Math.abs(x.errorPercent)<=SPEC.linearYawErrorPercent)},
  {id:'braking',name:'제동의 에너지 감소·접지 한계·정지',kind:'물리 제약',pass:braking.every(x=>x.stop&&x.stop.distance>=x.lowerDistanceBound*.98&&x.maxEnergyGain<=SPEC.passiveEnergyGainJ)},
  {id:'recovery',name:'동일한 미끄러짐에서 3초 이내 회복',kind:'게임 목표',pass:recovery.every(x=>x.time!==null&&x.time<=SPEC.recoverySeconds)},
  {id:'passivity',name:'구동 없는 1,200개 상태의 에너지 비증가',kind:'물리 제약',pass:maximumGain<=SPEC.passiveEnergyGainJ},
  {id:'convergence',name:'시간 간격 변화의 경로 차이 ≤ 15cm',kind:'수치 허용치',pass:convergence.every(x=>x.positionError<=SPEC.convergenceMetres)}
 ]};
}
