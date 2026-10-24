const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function impactLevel(closing){return closing<2.5?'light':closing<8?'medium':'heavy';}
export function contactClosing(contact,before){
 const a=before.get(contact.bi.id),b=before.get(contact.bj.id),point=(v,r)=>v?{x:v.x+v.yaw*r.z,z:v.z-v.yaw*r.x}:{x:0,z:0};
 const va=point(a,contact.ri),vb=point(b,contact.rj);
 return Math.max(0,(va.x-vb.x)*contact.ni.x+(va.z-vb.z)*contact.ni.z);
}
// The tyre/steering model is unchanged. Brief road resistance after an impact
// is identical for player and AI; it dissipates motion, never aims at the road.
export function recoverImpact(s,dt,remaining){
 if(remaining<=0)return;
 const strength=clamp(remaining/.8,0,1);
 s.v*=Math.exp(-3.0*strength*dt);s.yawRate*=Math.exp(-2.2*strength*dt);
 s.u-=Math.sign(s.u)*Math.min(Math.abs(s.u),1.2*strength*dt);
}
export function kickBody(motion,heading,deltaX,deltaZ,car){
 const side=deltaX*Math.cos(heading)-deltaZ*Math.sin(heading),forward=deltaX*Math.sin(heading)+deltaZ*Math.cos(heading),scale=car==='f2002'?.42:1;
 motion.rollVelocity+=clamp(-side*.065,-.55,.55)*scale;
 motion.pitchVelocity+=clamp(-forward*.045,-.40,.40)*scale;
}
export function createImpactSound(){
 let context=null,enabled=true,last=-10;
 return{set enabled(value){enabled=!!value;},unlock(){if(!enabled)return;try{context??=new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume().catch(()=>{});}catch{}},play(hit){
  if(!enabled||!context||context.state!=='running'||context.currentTime-last<.12)return;last=context.currentTime;
  const duration=hit.level==='heavy'?.24:hit.level==='medium'?.14:.055,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*5);
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=hit.level==='light'?1800:450;gain.gain.value=hit.level==='heavy'?.22:hit.level==='medium'?.12:.045;
  source.connect(filter).connect(gain).connect(context.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }};
}
