const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=n=>n*Math.PI/180;
export const BODY_FEEL=Object.freeze({
 tavaculo:Object.freeze({rollGain:rad(.60),pitchGain:rad(.36),maxRoll:rad(4.6),maxPitch:rad(2.5),frequency:10,damping:.78}),
 f2002:Object.freeze({rollGain:rad(.20),pitchGain:rad(.12),maxRoll:rad(1.6),maxPitch:rad(.9),frequency:15,damping:.9})
});
export function createBodyMotion(){return{roll:0,rollVelocity:0,pitch:0,pitchVelocity:0};}
// Deliberately expressive sprung body pose, driven by achieved acceleration.
// Wheels and collision shape stay on the flat road. This is not 3-D suspension.
export function stepBodyMotion(state,{ax=0,ay=0,speed=0},car,dt){
 const c=BODY_FEEL[car]||BODY_FEEL.tavaculo;
 if(!Number.isFinite(dt)||dt<=0)return state;
 const weight=clamp(Math.abs(speed)/1.5,0,1);
 const targets={roll:clamp(ay*c.rollGain*weight,-c.maxRoll,c.maxRoll),pitch:clamp(-ax*c.pitchGain*weight,-c.maxPitch,c.maxPitch)};
 const count=Math.ceil(dt/(1/240)),h=dt/count;
 for(let i=0;i<count;i++)for(const key of ['roll','pitch']){
  const velocity=key+'Velocity';
  state[velocity]+=(c.frequency*c.frequency*(targets[key]-state[key])-2*c.damping*c.frequency*state[velocity])*h;
  state[key]+=state[velocity]*h;
  const cap=key==='roll'?c.maxRoll:c.maxPitch;
  if(Math.abs(state[key])>cap){state[key]=clamp(state[key],-cap,cap);state[velocity]=0;}
 }
 return state;
}
