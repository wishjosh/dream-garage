import {drivingReadout} from './race-hud.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Generic CC0 engine recording; pitch follows the same game RPM readout as the HUD.
// This is feedback for driving, not a measured simulation of the named vehicles.
export function drivingSoundState({player,active=false,throttle=false,view='chase'}={}){
 if(!active||!player)return {active:false,rate:1,engine:0,road:0,cutoff:4000,roadHz:600};
 const readout=drivingReadout(player),speed=Number.isFinite(player.speed)?Math.max(0,player.speed):0;
 const load=throttle?1:0,slip=clamp(Number(player.driftLevel)||0,0,1),rough=player.surface==='grass'?1.7:player.surface==='runoff'?1.2:1;
 return {active:true,rate:clamp(.65+readout.rpm/4600,.8,2.35),engine:.13+.10*load+.035*readout.ratio,road:clamp(speed/38,0,1)*.025*rough+slip*.04,cutoff:view==='cockpit'?1800:3600,roadHz:650+slip*750};
}
export function createDrivingSound({contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),fetchAudio=()=>fetch(new URL('./assets/audio/engine-loop.wav',import.meta.url))}={}){
 let context=null,enabled=true,loading=null,buffer=null,nodes=null,status='locked',disposed=false,started=0;
 let target=drivingSoundState();
 const quiet=()=>{if(!nodes)return;nodes.master.gain.cancelScheduledValues(context.currentTime);nodes.master.gain.setValueAtTime(0,context.currentTime);for(const source of [nodes.engine,nodes.road]){source.stop();source.disconnect();}for(const node of [nodes.engineGain,nodes.roadGain,nodes.engineFilter,nodes.roadFilter,nodes.master,nodes.limiter])node.disconnect();nodes=null;};
 function ensureNodes(){
  if(nodes||!buffer||!enabled||disposed||!target.active||context?.state!=='running')return;
  const engine=context.createBufferSource(),road=context.createBufferSource(),engineGain=context.createGain(),roadGain=context.createGain(),engineFilter=context.createBiquadFilter(),roadFilter=context.createBiquadFilter(),master=context.createGain(),limiter=context.createDynamicsCompressor();
  engine.buffer=buffer;engine.loop=true;
  const noise=context.createBuffer(1,context.sampleRate,context.sampleRate),data=noise.getChannelData(0);let seed=123456789,previous=0;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;previous=.7*previous+.3*(seed/2147483648-1);data[i]=previous;}
  road.buffer=noise;road.loop=true;engineFilter.type='lowpass';roadFilter.type='bandpass';roadFilter.Q.value=.55;
  master.gain.value=0;engineGain.gain.value=0;roadGain.gain.value=0;limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=4;
  engine.connect(engineFilter).connect(engineGain).connect(master);road.connect(roadFilter).connect(roadGain).connect(master);master.connect(limiter).connect(context.destination);
  nodes={engine,road,engineGain,roadGain,engineFilter,roadFilter,master,limiter};engine.start();road.start();started++;master.gain.setTargetAtTime(.65,context.currentTime,.04);
 }
 function apply(){
  if(!enabled||!target.active||disposed){quiet();return;}
  ensureNodes();if(!nodes)return;const at=context.currentTime;
  for(const [param,value] of [[nodes.engine.playbackRate,target.rate],[nodes.engineGain.gain,target.engine],[nodes.roadGain.gain,target.road],[nodes.engineFilter.frequency,target.cutoff],[nodes.roadFilter.frequency,target.roadHz]])param.setTargetAtTime(value,at,.06);
 }
 async function unlock(){
  if(!enabled||disposed)return;
  try{
   context??=contextFactory();if(context.state!=='running')await context.resume();
   if(!loading){status='loading';loading=(async()=>{const response=await fetchAudio();if(!response.ok)throw Error('Audio unavailable');buffer=await context.decodeAudioData(await response.arrayBuffer());status='ready';})().catch(()=>{status='unavailable';});}
   await loading;apply();
  }catch{status='unavailable';quiet();}
 }
 return {unlock,update(state){target=drivingSoundState(state);apply();},stop(){target=drivingSoundState();quiet();},
  get enabled(){return enabled;},set enabled(value){enabled=!!value;if(!enabled)quiet();},
  stats(){return {enabled,status,playing:!!nodes,started,rate:target.rate};},
  dispose(){disposed=true;quiet();context?.close().catch(()=>{});}
 };
}
