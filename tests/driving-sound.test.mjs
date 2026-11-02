import test from 'node:test';
import assert from 'node:assert/strict';
import {createDrivingSound,drivingSoundState} from '../dist/driving-sound.mjs';
function fakeContext(){
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const sources=[],node=()=>({connect(){return arguments[0];},disconnect(){},gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param()});
 const context={state:'running',sampleRate:100,currentTime:0,destination:node(),createGain:node,createBiquadFilter:node,createDynamicsCompressor:node,createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource(){const s={...node(),playbackRate:param(),started:0,stopped:0,start(){this.started++;},stop(){this.stopped++;}};sources.push(s);return s;},async resume(){context.state='running';},async close(){context.state='closed';},async decodeAudioData(){return {};}};
 return {context,sources};
}
const moving={active:true,throttle:true,player:{speed:20,forwardSpeed:20,driftLevel:0}};
test('engine uses HUD pitch, coasting reduces load, tyres reflect drift, inactive states are silent',()=>{
 const driving=drivingSoundState(moving),coast=drivingSoundState({...moving,throttle:false}),drift=drivingSoundState({...moving,player:{...moving.player,driftLevel:1}});
 assert.ok(driving.rate>.8&&driving.rate<2.35);assert.ok(driving.engine>coast.engine);assert.ok(drift.road>driving.road);assert.ok(drivingSoundState({...moving,view:'cockpit'}).cutoff<driving.cutoff);
 assert.equal(drivingSoundState({...moving,active:false}).engine,0);assert.ok(Number.isFinite(drivingSoundState({active:true,player:{speed:NaN}}).rate));
});
test('one download and two sources per active session; pause/mute/end stop and disconnect them',async()=>{
 const {context,sources}=fakeContext();let downloads=0;const audio=createDrivingSound({contextFactory:()=>context,fetchAudio:async()=>{downloads++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
 audio.update(moving);assert.equal(sources.length,0);await Promise.all([audio.unlock(),audio.unlock()]);assert.equal(downloads,1);assert.equal(sources.length,2);assert.equal(audio.stats().playing,true);
 for(let i=0;i<100;i++)audio.update(moving);assert.equal(sources.length,2);
 audio.stop();assert.ok(sources.every(s=>s.stopped===1));assert.equal(audio.stats().playing,false);
 audio.update(moving);assert.equal(sources.length,4);audio.enabled=false;assert.ok(sources.every(s=>s.stopped===1));audio.update(moving);assert.equal(sources.length,4);
 audio.enabled=true;await audio.unlock();assert.equal(sources.length,6);audio.update({...moving,active:false});assert.ok(sources.every(s=>s.stopped===1));audio.dispose();assert.equal(context.state,'closed');
});
test('late decoding after leaving the race never starts audio; download failures remain nonfatal',async()=>{
 const {context,sources}=fakeContext();let release;const pending=new Promise(resolve=>release=resolve);
 const audio=createDrivingSound({contextFactory:()=>context,fetchAudio:()=>pending});audio.update(moving);const unlocking=audio.unlock();audio.stop();release({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await unlocking;assert.equal(sources.length,0);
 const broken=createDrivingSound({contextFactory:()=>context,fetchAudio:async()=>({ok:false})});broken.update(moving);await broken.unlock();assert.equal(broken.stats().status,'unavailable');assert.equal(broken.stats().playing,false);
});
